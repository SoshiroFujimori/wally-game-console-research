#!/usr/bin/env python3
"""Executable teaching models; these do not simulate the FPGA implementation."""

import argparse
from collections import deque
from fractions import Fraction
from statistics import median


def timing():
    for mhz in [20, 100]:
        period = Fraction(1000, mhz)
        print(f'{mhz} MHz -> {float(period):g} ns per cycle')
    total_ms = Fraction(360_000 * 1000, 20_000_000)
    per_frame_ms = total_ms / 180
    assert total_ms == 18 and per_frame_ms == Fraction(1, 10)
    print(f'360000 cycles -> {total_ms} ms total -> {float(per_frame_ms)} ms/frame')
    print('2 ns output + 11 ns logic/wire + 2 ns setup = 15 ns')
    print('Fits 50 ns; does not fit 10 ns. Clock skew and hold omitted.')


def handshake():
    # Each row samples old state at one edge, then updates the state.
    # Conservative ready does not reuse a full slot on a simultaneous pop.
    words = [('A', False), ('B', False), ('C', False), ('D', True)]
    queue = deque()
    accepted = []
    delivered = []
    stalled = None
    depth = 2
    print('edge in_data in_ready in_accept out_data out_ready out_accept stored_after')
    for edge in range(14):
        incoming = words[len(accepted)] if len(accepted) < len(words) else None
        outgoing = queue[0] if queue else None
        source_ready = len(queue) < depth
        sink_ready = edge not in {0, 1, 2, 5, 6, 7}
        push = incoming is not None and source_ready
        pop = outgoing is not None and sink_ready
        if stalled is not None:
            assert outgoing == stalled, 'Output changed while waiting for acceptance'
        stalled = outgoing if outgoing is not None and not sink_ready else None
        if pop:
            delivered.append(queue.popleft())
        if push:
            queue.append(incoming)
            accepted.append(incoming)
        assert len(queue) <= depth
        assert delivered == accepted[:len(delivered)]
        assert len(accepted) - len(delivered) == len(queue)
        ins = incoming[0] if incoming else '-'
        outs = outgoing[0] if outgoing else '-'
        saved = ''.join(word[0] for word in queue) or '-'
        print(f'{edge:4} {ins:7} {int(source_ready):8} {int(push):9} '
              f'{outs:8} {int(sink_ready):9} {int(pop):10} {saved}')
    assert accepted == delivered == words
    assert sum(last for _, last in delivered) == 1
    assert not queue
    print('Accepted and delivered A, B, C, D exactly once; D alone has last=1.')
    print('A single-clock abstract queue: no CDC, APB setup, IP latency, or reset model.')


def edge_value(a, b, p):
    return (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0])


def pixels():
    selected = [(x, y) for y in range(5) for x in range(6)
                if 1 <= Fraction(2 * x + 1, 2) < 5
                and 1 <= Fraction(2 * y + 1, 2) < 4]
    assert len(selected) == 12
    print('Rectangle [1,5) x [1,4), samples at pixel centers:')
    for y in range(5):
        print(''.join('#' if (x, y) in selected else '.' for x in range(6)))
    a, b, c = (1, 1), (5, 1), (1, 4)
    p, outside = (2, 2), (4, 3)
    area = edge_value(a, b, c)
    weights = [Fraction(edge_value(b, c, p), area),
               Fraction(edge_value(c, a, p), area),
               Fraction(edge_value(a, b, p), area)]
    assert weights == [Fraction(5, 12), Fraction(1, 4), Fraction(1, 3)]
    assert sum(weights) == 1
    assert tuple(sum(w * v[i] for w, v in zip(weights, [a, b, c])) for i in [0, 1]) == p
    assert edge_value(b, c, outside) == -5
    print(f'Triangle P=(2,2): E_AB={edge_value(a,b,p)}, E_BC={edge_value(b,c,p)}, '
          f'E_CA={edge_value(c,a,p)}; barycentric={weights}')
    print('P=(4,3): E_BC=-5, outside this triangle.')
    for start, end in [(a, b), (b, c), (c, a)]:
        for x in range(-2, 8):
            for y in range(-2, 8):
                value = edge_value(start, end, (x, y))
                assert edge_value(start, end, (x + 1, y)) - value == -(end[1] - start[1])
                assert edge_value(start, end, (x, y + 1)) - value == end[0] - start[0]
    scale = 32
    v1, v2 = 48, 72
    assert Fraction(v1, scale) == Fraction('1.5')
    assert Fraction(v2, scale) == Fraction('2.25')
    assert Fraction(v1 + v2, scale) == Fraction('3.75')
    assert v1 * v2 // scale == 108
    assert Fraction(108, scale) == Fraction('3.375')
    first = Fraction(1, 2)
    second = Fraction(1, 2) + first * Fraction(1, 2)
    assert second == Fraction(3, 4)
    print('Edge increments checked at 100 points per edge.')
    print('Fixed point x32: 48+72=120 -> 3.75; 48*72/32=108 -> 3.375.')
    print('White alpha 0.5 on black: first=0.5, repeated=0.75.')
    print('The point P example and pixel-center example use explicitly different sample positions.')
    print('This model does not implement a RasterIX revision-specific shared-edge rule.')


def memory():
    offset = (2 * 640 + 3) * 2
    frame_bytes = 640 * 480 * 2
    assert offset == 2566 and frame_bytes == 614400
    print(f'RGB565 pixel (3,2) in a 640-wide image: byte offset {offset}')
    print(f'640 x 480 x 2 = {frame_bytes} bytes per color image')
    rgb = {(31, 63, 31): 0xFFFF, (31, 0, 0): 0xF800,
           (0, 63, 0): 0x07E0, (0, 0, 31): 0x001F}
    for (r, g, b), expected in rgb.items():
        packed = (r << 11) | (g << 5) | b
        assert packed == expected
        assert ((packed >> 11) & 31, (packed >> 5) & 63, packed & 31) == (r, g, b)
        print(f'R={r}, G={g}, B={b} -> RGB565 0x{packed:04X}')
    for address in [0x120, 0x220]:
        line, offset = divmod(address, 64)
        tag, index = divmod(line, 4)
        assert index == 0 and offset == 32
        print(f'Toy direct cache address=0x{address:x}: tag={tag}, index={index}, offset={offset}')
    size = 65_536
    bands = (640 * 480 + size - 1) // size
    assert bands == 5 and 480 // bands == 96
    print('640 x 480 with the stated capacity -> 5 bands; 96 rows per band here.')
    print('2 sets x 5 lists + 1 transfer buffer = 11 buffers; capacity is not bytes sent.')


def measurement():
    samples = [4.2, 4.4, 4.9]
    assert median(samples) == 4.4
    assert sum(samples) / 3 == 4.5
    reduction = (Fraction('4.393') - Fraction('0.465')) / Fraction('4.393')
    print('Samples 4.2,4.4,4.9: median=4.4, mean=4.5')
    print(f'E6 stated APB-wait medians: reduction={float(reduction) * 100:.1f}%')
    print(f'Eliminate 40% of serial time: upper speedup={1 / .6:.3f}x')
    print('No new measurement. Recompute the archived CSV with E6/recalculate_wait.py.')


MODELS = {'timing': timing, 'handshake': handshake, 'pixels': pixels,
          'memory': memory, 'measurement': measurement}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('model', choices=['all', *MODELS], nargs='?', default='all')
    args = parser.parse_args()
    chosen = MODELS if args.model == 'all' else {args.model: MODELS[args.model]}
    for name, run in chosen.items():
        print(f'\n[{name}]')
        run()
    print('\nAll selected explanatory checks passed.')


if __name__ == '__main__':
    main()
