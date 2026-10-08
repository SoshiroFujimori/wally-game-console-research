# Breakout on Wally and official RasterIX

This directory is an external experiment, not a CVW change. No earlier cube measurements are used as 2D performance results.

## Scope

- One 640x480 stage, 8x5 blocks, one ball, one paddle, three lives.
- Integer, fixed-step 60 Hz game logic; deterministic automatic input for repeatable comparisons.
- Initial measurements use the unchanged published b3c4f6b9 design and official RasterIX 9fdcf97a.
- The production display wait uses the existing 1 ms sleep policy. Busy polling and precomputed command replay are diagnostic comparisons, not adopted optimizations.
- A 60 Hz game/display target is a design objective, not an assumed measurement.
- Live Wii controller integration is a final-presentation task. Intermediate experiments replay identical input independently of human operation.

## Intermediate completion criteria

1. Verify 2D geometry and colors against a CPU-generated reference image.
2. Verify deterministic movement, wall/paddle/block collisions, life loss, game over, clear, and restart on the host.
3. Collect fresh frame timings and completed display-swap counts on the identified bitstream after warmup, with no per-frame UART output.
4. Measure game logic, OpenGL submission, upstream command conversion, transport, and display wait. Nested intervals must not be double counted. None is labelled pure GPU execution time.
5. Use controlled comparisons at identical visual output to establish which causes explain the observed limits. Document unresolved causes explicitly; do not declare full identification if they remain.

## Measurement rules

Use CLOCK_MONOTONIC_RAW in the target program. Save individual frame records after the timed loop. Keep compiler options, input sequence, resolution, source, bitstream, and library revisions fixed across a comparison. Capture and readback are outside performance timing. Do not equate OBS frame rate, submissions, completed swaps, or real-time game progress. Report unpaced throughput and any missed 16.667 ms deadlines separately.

## Instrumentation control

`--profile detailed` measures the nested software sections. `--profile frame` disables section and bus timestamp calls while retaining identical game/draw/wait code, byte counts, and frame-completion timestamps. Compare these modes before interpreting the detailed profile; the frame mode is minimally instrumented, not completely uninstrumented. Zero section times in frame mode mean unmeasured.

The `completion_interval_ns` column includes bookkeeping after the preceding completion and is used for interval percentiles and the 16.667 ms deadline comparison. `total_ns` covers the current game/scene, draw, submit, and completion wait. Overall FPS uses the elapsed time from the first measured frame start to the last completion observation. The observations still include MMIO polling and do not prove the HDMI scanout timestamp.

## Pixel sample convention

The pinned upstream Rasterizer evaluates coverage at integer window coordinates (Rasterizer.cpp:146-156), with zero-valued edge functions included by Rasterizer.v:141. To express the experiment's ordinary half-open pixel rectangles and nearest-filtered text, the application applies (-0.5,+0.5) in its top-left coordinate system. This maps half-pixel sample centers to the upstream integer window grid; the reference image is unchanged. `--legacy-pixel-origin` disables that application transform for diagnosis. The v003 hardware mismatch is retained as a failed correctness test; the correction must pass a fresh whole-frame test before performance interpretation.
