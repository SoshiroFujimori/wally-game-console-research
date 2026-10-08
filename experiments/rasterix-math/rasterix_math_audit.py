"""Independent mathematical audit for the pinned RasterIX source.

The checks in this file deliberately duplicate small equations instead of
calling RasterIX. The source-level C++ harness beside this file supplies the
independent implementation check. Keeping the two checks separate makes a
copied implementation error less likely to pass unnoticed.
"""

from __future__ import annotations

import json
import math
import random
from pathlib import Path


ROOT = Path(__file__).resolve().parent
SEED = 0x524958
RNG = random.Random(SEED)
PIXEL_STEP = 1 << 5
INT32_MAX = (1 << 31) - 1


def edge(a: tuple[int, int], b: tuple[int, int], p: tuple[int, int]) -> int:
    """RasterIX edgeFunctionX, evaluated with unbounded Python integers."""
    return (p[0] - a[0]) * (b[1] - a[1]) - (p[1] - a[1]) * (b[0] - a[0])


def q5_from_float(value: float) -> int:
    """Veci::createFromVec for LocalShift=5; int() truncates toward zero."""
    return int(value * PIXEL_STEP + 0.5)


def color_mix(a: int, b_weight: int, c: int, d_weight: int) -> int:
    """One 8-bit channel of ColorMixer with default precision."""
    return min(255, (a * b_weight + c * d_weight + 255) // 256)


def color_lerp(a: int, b: int, fraction8: int) -> int:
    """One ColorInterpolator channel after its 16-to-8-bit weight slice."""
    return color_mix(a, 255 - fraction8, b, fraction8)


def bilinear(c00: int, c01: int, c10: int, c11: int, u8: int, v8: int) -> int:
    top = color_lerp(c00, c01, u8)
    bottom = color_lerp(c10, c11, u8)
    return color_lerp(top, bottom, v8)


def clip_intersection(d_current: float, d_previous: float) -> float:
    amount = d_current / (d_current - d_previous)
    return d_current * (1.0 - amount) + d_previous * amount


def main() -> None:
    checks: dict[str, object] = {}

    identity_cases = 200_000
    max_abs_edge = 0
    for _ in range(identity_cases):
        v0 = (RNG.randint(-1024, 1024), RNG.randint(-1024, 1024))
        v1 = (RNG.randint(-1024, 1024), RNG.randint(-1024, 1024))
        v2 = (RNG.randint(-1024, 1024), RNG.randint(-1024, 1024))
        p = (RNG.randint(-1024, 1024), RNG.randint(-1024, 1024))
        e0 = edge(v1, v2, p)
        e1 = edge(v2, v0, p)
        e2 = edge(v0, v1, p)
        area = edge(v0, v1, v2)
        assert e0 + e1 + e2 == area
        assert edge(v1, v2, (p[0] + PIXEL_STEP, p[1])) - e0 == (v2[1] - v1[1]) * PIXEL_STEP
        assert edge(v1, v2, (p[0], p[1] + PIXEL_STEP)) - e0 == (v1[0] - v2[0]) * PIXEL_STEP
        max_abs_edge = max(max_abs_edge, abs(e0), abs(e1), abs(e2), abs(area))
    checks["edge_function"] = {
        "cases": identity_cases,
        "identity": "E(v1,v2,p)+E(v2,v0,p)+E(v0,v1,p)=E(v0,v1,v2)",
        "x_increment": "E(a,b,p+(32,0))-E(a,b,p)=(by-ay)*32",
        "y_increment": "E(a,b,p+(0,32))-E(a,b,p)=(ax-bx)*32",
        "max_abs_value_in_test": max_abs_edge,
        "result": "pass",
    }

    fixed_inputs = [-1.0, -0.5, -1.0 / 32.0, 0.0, 1.0 / 32.0, 0.5, 1.0, 1.5]
    fixed_outputs = [q5_from_float(v) for v in fixed_inputs]
    expected_fixed = [-31, -15, 0, 0, 1, 16, 32, 48]
    assert fixed_outputs == expected_fixed
    for n in range(-256, 257):
        value = n / 64.0
        assert q5_from_float(value) == int(value * 32.0 + 0.5)
    checks["q5_conversion"] = {
        "formula": "trunc_toward_zero(value*32+0.5)",
        "inputs": fixed_inputs,
        "outputs": fixed_outputs,
        "negative_asymmetry_confirmed": True,
        "result": "pass",
    }

    clip_cases = 100_000
    max_clip_residual = 0.0
    for _ in range(clip_cases):
        dc = RNG.uniform(1e-6, 1000.0)
        dp = -RNG.uniform(1e-6, 1000.0)
        residual = abs(clip_intersection(dc, dp))
        max_clip_residual = max(max_clip_residual, residual)
        assert residual <= 2e-12 * max(abs(dc), abs(dp), 1.0)
    checks["clip_intersection"] = {
        "cases": clip_cases,
        "amount": "d_current/(d_current-d_previous)",
        "max_abs_plane_distance_after_intersection": max_clip_residual,
        "result": "pass",
    }

    mixer_cases = 200_000
    for _ in range(mixer_cases):
        values = [RNG.randrange(256) for _ in range(4)]
        result = color_mix(*values)
        assert 0 <= result <= 255
        assert result == min(255, (values[0] * values[1] + values[2] * values[3] + 255) >> 8)
    for a in range(256):
        for b in range(256):
            assert color_lerp(a, b, 0) == a
            assert color_lerp(a, b, 255) == b
    corner_values = (17, 83, 149, 231)
    assert bilinear(*corner_values, 0, 0) == corner_values[0]
    assert bilinear(*corner_values, 255, 0) == corner_values[1]
    assert bilinear(*corner_values, 0, 255) == corner_values[2]
    assert bilinear(*corner_values, 255, 255) == corner_values[3]
    checks["color_and_bilinear"] = {
        "random_mixer_cases": mixer_cases,
        "mixer_formula": "min(255,floor((A*B+C*D+255)/256))",
        "lerp_formula": "mix(A,255-u8,B,u8)",
        "bilinear_order": "horizontal row 0, horizontal row 1, vertical",
        "all_8bit_endpoint_pairs": 256 * 256,
        "result": "pass",
    }

    formats = {
        "S3.28": {"minimum": -8.0, "maximum": 8.0 - 2.0**-28, "step": 2.0**-28},
        "S1.30": {"minimum": -2.0, "maximum": 2.0 - 2.0**-30, "step": 2.0**-30},
        "S7.24": {"minimum": -128.0, "maximum": 128.0 - 2.0**-24, "step": 2.0**-24},
        "S16.15": {"minimum": -65536.0, "maximum": 65536.0 - 2.0**-15, "step": 2.0**-15},
    }
    assert formats["S3.28"]["maximum"] < 8.0
    assert formats["S1.30"]["maximum"] < 2.0
    checks["fixed_point_formats"] = {"formats": formats, "result": "pass"}

    area_640x480 = 640 * 480 * PIXEL_STEP * PIXEL_STEP
    area_2048x2048 = 2048 * 2048 * PIXEL_STEP * PIXEL_STEP
    max_safe_square = math.isqrt(INT32_MAX // (PIXEL_STEP * PIXEL_STEP))
    assert area_640x480 <= INT32_MAX
    assert area_2048x2048 > INT32_MAX
    assert max_safe_square == 1448
    checks["int32_edge_range"] = {
        "int32_max": INT32_MAX,
        "640x480_max_axis_aligned_determinant": area_640x480,
        "640x480_margin": INT32_MAX / area_640x480,
        "2048x2048_determinant": area_2048x2048,
        "largest_safe_square_side_under_this_bound": max_safe_square,
        "source_language_warning": "signed C++ overflow is undefined; RTL 32-bit arithmetic wraps",
        "result": "pass",
    }

    # FloatToInt keeps only five bits of the right-shift count.  Classify all
    # normalized binary32 exponents for each fixed-point format.  For an
    # effective exponent p < -1, correct round-to-nearest-away is always zero.
    float_to_int_underflow: dict[str, object] = {}
    for fractional_bits in (24, 28, 30):
        categories = {
            "correct_half_to_one": 0,
            "guaranteed_zero": 0,
            "out_of_range_select": 0,
            "mantissa_alias_possible": 0,
            "hidden_bit_alias_always_wrong": 0,
        }
        effective_exponents: dict[str, list[int]] = {key: [] for key in categories}
        for raw_exponent in range(1, 255):
            p = raw_exponent - (127 - fractional_bits)
            if p >= 0:
                continue
            true_shift = 23 - p
            truncated_shift = true_shift & 31
            if p == -1:
                category = "correct_half_to_one"
                assert truncated_shift == 24
            elif truncated_shift == 0:
                category = "out_of_range_select"
            elif 1 <= truncated_shift <= 23:
                category = "mantissa_alias_possible"
            elif truncated_shift == 24:
                category = "hidden_bit_alias_always_wrong"
            else:
                category = "guaranteed_zero"
            categories[category] += 1
            effective_exponents[category].append(p)

        # Concrete color counterexample used by both RTL and post-synthesis XSIM:
        # raw exponent 93 gives p=-10, true shift 33, truncated shift 1.
        if fractional_bits == 24:
            p = 93 - (127 - fractional_bits)
            assert p == -10
            assert ((23 - p) & 31) == 1
            mantissa = 1
            selected_round_bit = mantissa & 1
            assert selected_round_bit == 1  # hardware emits one LSB
            assert math.ldexp(1.0 + mantissa / 2**23, p) < 0.5

        float_to_int_underflow[f"F={fractional_bits}"] = {
            "safe_nonzero_lower_bound": 2.0 ** (-fractional_bits - 8),
            "normalized_underflow_exponent_class_counts": categories,
            "effective_exponents_by_class": effective_exponents,
        }
    checks["float_to_int_underflow_alias"] = {
        "shift_width_bits": 5,
        "condition": "for normalized nonzero input, p=e+F; p=-1 rounds to one and p<=-2 must round to zero",
        "formats": float_to_int_underflow,
        "counterexample_color_bits": "0x2e800001",
        "counterexample_effective_exponent": -10,
        "counterexample_true_shift": 33,
        "counterexample_truncated_shift": 1,
        "result": "counterexample_confirmed",
    }

    descriptor = json.loads((ROOT / "rasterix-descriptor-source-audit.json").read_text(encoding="utf-8-sig"))
    assert descriptor["union_count"] == 16
    assert descriptor["fragment_count_with_duplicates"] == 20
    assert descriptor["shared_edge_pixels"] == [[0, 0], [1, 1], [2, 2], [3, 3]]
    assert descriptor["scissor_rewrites_descriptor_bbox"] is False
    assert descriptor["fixed_outputs"] == expected_fixed
    assert descriptor["interior_union_count"] == 16
    assert descriptor["interior_fragment_count_with_duplicates"] == 20
    assert descriptor["interior_shared_edge_pixels"] == [[10, 10], [11, 11], [12, 12], [13, 13]]
    for key in (
        "solid_color_x_inc", "solid_color_y_inc", "solid_depth_x_inc",
        "solid_depth_y_inc", "glyph_color_x_inc", "glyph_color_y_inc",
    ):
        assert all(value == 0.0 for value in descriptor[key])
    glyph_texture_nonzero = [
        abs(value)
        for key in ("glyph_texture_stq", "glyph_texture_x_inc", "glyph_texture_y_inc")
        for value in descriptor[key]
        if value != 0.0
    ]
    assert min(glyph_texture_nonzero) >= 2.0**-36
    descriptor["glyph_minimum_nonzero_texture_value"] = min(glyph_texture_nonzero)
    descriptor["S3.28_conservative_nonzero_lower_bound"] = 2.0**-36
    checks["official_source_harness"] = {**descriptor, "result": "pass"}

    report = {
        "rasterix_commit": "9fdcf97a31b2e4247594e06d605871980cd5e9e1",
        "random_seed": SEED,
        "scope": "mathematical identities and selected source-level boundary behavior",
        "checks": checks,
        "all_checks_passed": True,
    }
    output = ROOT / "rasterix-mathematical-audit.json"
    output.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps({
        "all_checks_passed": True,
        "edge_cases": identity_cases,
        "clip_cases": clip_cases,
        "mixer_cases": mixer_cases,
        "shared_edge_duplicate_fragments": descriptor["fragment_count_with_duplicates"] - descriptor["union_count"],
        "output": str(output),
    }, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
