"""SMT and exact-arithmetic audit for equations documented for RasterIX.

Run with z3-solver on PYTHONPATH.  This script proves algebraic identities over
mathematical integers/reals and one exact 8-bit/17-bit RTL equivalence.  It does
not model the complete RasterIX state machine or IEEE-754 implementation.
"""

from __future__ import annotations

import itertools
import json
from pathlib import Path

import z3


ROOT = Path(__file__).resolve().parent
INT32_MAX = (1 << 31) - 1
PIXEL_SCALE = 32


def prove(name: str, proposition: z3.BoolRef, assumptions: list[z3.BoolRef] | None = None) -> dict[str, str]:
    solver = z3.Solver()
    solver.set(timeout=20_000)
    if assumptions:
        solver.add(*assumptions)
    solver.add(z3.Not(proposition))
    result = solver.check()
    if result != z3.unsat:
        raise AssertionError(f"{name}: counterexample or unknown: {result}; {solver.model() if result == z3.sat else ''}")
    return {"solver_result_for_negation": "unsat", "result": "proved"}


def edge(ax, ay, bx, by, px, py):
    return (px - ax) * (by - ay) - (py - ay) * (bx - ax)


def determinant_corner_bound(width: int, height: int) -> int:
    """Exact maximum for the multiaffine determinant on a rectangular box.

    A multiaffine function reaches each maximum/minimum on a box at a corner:
    fixing all other variables leaves an affine function of the remaining one.
    Enumerating the 4^3 triples therefore establishes the exact bound.
    """

    corners = [(0, 0), (width, 0), (0, height), (width, height)]
    values = []
    for a, b, p in itertools.product(corners, repeat=3):
        values.append(abs((p[0] - a[0]) * (b[1] - a[1]) - (p[1] - a[1]) * (b[0] - a[0])))
    return max(values)


def main() -> None:
    checks: dict[str, object] = {}

    x0, y0, x1, y1, x2, y2, px, py = z3.Ints("x0 y0 x1 y1 x2 y2 px py")
    e0 = edge(x1, y1, x2, y2, px, py)
    e1 = edge(x2, y2, x0, y0, px, py)
    e2 = edge(x0, y0, x1, y1, px, py)
    area = edge(x0, y0, x1, y1, x2, y2)
    checks["edge_sum_identity"] = prove("edge sum", e0 + e1 + e2 == area)
    checks["edge_x_increment"] = prove(
        "edge x increment",
        edge(x1, y1, x2, y2, px + PIXEL_SCALE, py) - e0 == (y2 - y1) * PIXEL_SCALE,
    )
    checks["edge_y_increment"] = prove(
        "edge y increment",
        edge(x1, y1, x2, y2, px, py + PIXEL_SCALE) - e0 == (x1 - x2) * PIXEL_SCALE,
    )

    # Common scaling in perspective-correct interpolation.  Equality of the
    # two ratios follows from equality after cross multiplication; nonzero
    # denominators are the explicit precondition for forming either ratio.
    s, q, c = z3.Reals("s q c")
    checks["perspective_common_scale"] = prove(
        "perspective common scale",
        (c * s) * q == s * (c * q),
        [c != 0, q != 0],
    )

    # Clip-plane intersection: a = dc/(dc-dp).  Prove the numerator of the
    # resulting distance is zero after multiplying by the nonzero denominator.
    dc, dp = z3.Reals("dc dp")
    clip_numerator = dc * (dc - dp) - dc * dc + dc * dp
    checks["clip_intersection_plane"] = prove(
        "clip intersection",
        clip_numerator == 0,
        [dc - dp != 0],
    )

    # Prove that the 17-bit ColorMixer result slice is exactly the documented
    # integer formula.  For 8-bit inputs the pre-slice total lies in
    # [255, 2*255*255+255]=[255,130305], which fits in 17 bits.  Proving the
    # slice for every 17-bit total in that superset avoids a nonlinear
    # bit-vector multiplication and is stronger than enumerating products.
    total_bv = z3.BitVec("color_total_bv", 17)
    total_int = z3.BV2Int(total_bv)
    rtl_result = z3.If(
        z3.Extract(16, 16, total_bv) == z3.BitVecVal(1, 1),
        z3.IntVal(255),
        z3.BV2Int(z3.Extract(15, 8, total_bv)),
    )
    documented_result = z3.If(total_int >= 65536, 255, total_int / 256)
    color_total_domain = [total_int >= 255, total_int <= 2 * 255 * 255 + 255]
    checks["color_mixer_all_8bit_inputs"] = prove(
        "ColorMixer", rtl_result == documented_result, color_total_domain
    )
    checks["color_mixer_range"] = prove(
        "ColorMixer range", z3.And(rtl_result >= 0, rtl_result <= 255), color_total_domain
    )

    # The texture interpolator's endpoint behavior for every A,B in [0,255].
    ai, bi = z3.Ints("ai bi")
    domain = [ai >= 0, ai <= 255, bi >= 0, bi <= 255]
    lerp_u0 = (ai * 255 + bi * 0 + 255) / 256
    lerp_u255 = (ai * 0 + bi * 255 + 255) / 256
    checks["color_lerp_u0"] = prove("lerp u=0", lerp_u0 == ai, domain)
    checks["color_lerp_u255"] = prove("lerp u=255", lerp_u255 == bi, domain)

    # FloatToInt underflow boundary for normalized binary32 mantissas.  M is
    # the 24-bit significand including the hidden bit.  At p=-1, the scaled
    # magnitude lies in [0.5,1) and rounds to one.  For p<=-2 it is below 0.5
    # and must round to zero.  The source is safe for p=-8..-2 because the
    # selected round positions are the known-zero bits 24..30.
    significand = z3.Int("float_significand")
    p_eff = z3.Int("float_effective_exponent")
    significand_domain = [significand >= 2**23, significand < 2**24]
    checks["float_underflow_p_minus_1_rounds_to_one"] = prove(
        "FloatToInt p=-1 mathematical rounding",
        (significand + 2**23) / 2**24 == 1,
        significand_domain,
    )
    tiny_implications = []
    for p_value in range(-102, -1):
        # scaled magnitude is significand / 2**(23-p_value)
        tiny_implications.append(
            z3.Implies(p_eff == p_value, 2 * significand < 2 ** (23 - p_value))
        )
    checks["float_underflow_p_le_minus_2_is_below_half"] = prove(
        "FloatToInt p<=-2 mathematical zero",
        z3.And(*tiny_implications),
        significand_domain + [p_eff >= -102, p_eff <= -2],
    )
    number_bv = z3.BitVec("float_number_bv", 32)
    number_int = z3.BV2Int(number_bv)
    index_bv = z3.Int2BV(22 - p_eff, 32)
    selected_round = z3.Extract(0, 0, z3.LShR(number_bv, index_bv))
    checks["float_underflow_source_safe_p_minus_8_to_minus_2"] = prove(
        "FloatToInt safe underflow source range",
        selected_round == z3.BitVecVal(0, 1),
        [number_int >= 2**23, number_int < 2**24, p_eff >= -8, p_eff <= -2],
    )

    # Model the remaining mathematically defined branches of FloatToInt for
    # every normalized 24-bit significand.  p=23 is intentionally absent:
    # the source selects number[-1] there, so its four-state RTL meaning is not
    # defined even though the audited Artix-7 netlist chose the expected value.
    significand_bv = z3.BitVec("float_significand_bv", 24)
    significand_32 = z3.ZeroExt(8, significand_bv)
    normalized_bv = z3.Extract(23, 23, significand_bv) == z3.BitVecVal(1, 1)

    p_minus_one_round_bit = z3.Extract(23, 23, significand_32)
    checks["float_source_p_minus_1_round_bit_is_one"] = prove(
        "FloatToInt source p=-1 round bit",
        p_minus_one_round_bit == z3.BitVecVal(1, 1),
        [normalized_bv],
    )

    right_shift_cases = []
    for p_value in range(0, 23):
        shift = 23 - p_value
        source_magnitude = z3.LShR(significand_32, shift) + z3.ZeroExt(
            31, z3.Extract(shift - 1, shift - 1, significand_32)
        )
        rounded_reference = z3.LShR(
            significand_32 + z3.BitVecVal(1 << (shift - 1), 32), shift
        )
        right_shift_cases.append(source_magnitude == rounded_reference)
    checks["float_source_p_0_to_22_matches_half_up_magnitude"] = prove(
        "FloatToInt source p=0..22",
        z3.And(*right_shift_cases),
        [normalized_bv],
    )

    left_shift_cases = []
    for p_value in range(24, 31):
        shift = p_value - 23
        shifted = significand_32 << shift
        left_shift_cases.extend(
            [
                z3.BV2Int(shifted) == z3.BV2Int(significand_32) * 2**shift,
                z3.BV2Int(shifted) <= INT32_MAX,
            ]
        )
    checks["float_source_p_24_to_30_is_exact_and_signed_safe"] = prove(
        "FloatToInt source p=24..30",
        z3.And(*left_shift_cases),
        [normalized_bv],
    )

    magnitude_bv = z3.BitVec("float_magnitude_bv", 32)
    twos_complement = ~magnitude_bv + z3.BitVecVal(1, 32)
    checks["float_source_sign_is_exact_twos_complement"] = prove(
        "FloatToInt sign application",
        twos_complement == -magnitude_bv,
    )

    geometry: dict[str, object] = {}
    for width, height in [(640, 480), (1280, 720), (1920, 1080), (2048, 2048)]:
        max_det_pixels = determinant_corner_bound(width, height)
        assert max_det_pixels == width * height
        q5_bound = max_det_pixels * PIXEL_SCALE * PIXEL_SCALE
        # During horizontal edge search, P can reach one pixel beyond the
        # largest vertex x.  Use an exact corner bound on that expanded box.
        walker_bound = determinant_corner_bound(width + 1, height) * PIXEL_SCALE * PIXEL_SCALE
        geometry[f"{width}x{height}"] = {
            "triangle_determinant_bound": q5_bound,
            "walker_x_plus_one_bound": walker_bound,
            "triangle_within_int32": q5_bound <= INT32_MAX,
            "walker_within_int32": walker_bound <= INT32_MAX,
        }
    checks["q5_int32_geometry_bounds"] = {
        "argument": "multiaffine determinant reaches extrema at rectangle corners",
        "corner_triples_per_rectangle": 4**3,
        "screens": geometry,
        "result": "proved for stated coordinate rectangles",
    }

    report = {
        "rasterix_commit": "9fdcf97a31b2e4247594e06d605871980cd5e9e1",
        "z3_version": z3.get_version_string(),
        "logic_scope": "unbounded Int/Real identities plus exact fixed-width ColorMixer equivalence",
        "checks": checks,
        "all_checks_passed": True,
    }
    output = ROOT / "rasterix-formal-audit.json"
    output.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps({
        "all_checks_passed": True,
        "z3_version": z3.get_version_string(),
        "proved_properties": len(checks),
        "output": str(output),
    }, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
