# CPU command-preparation follow-up methods

This follow-up investigates the interval corresponding to the earlier v005 result of about 57.6 ms/frame. Earlier outputs remain frozen. Diagnostic sources, builds, logs and plans are external to the published checkout.

## Hardware and software

Nexys Video runs the unchanged original bitstream, SHA256 f7bc0386db7da40077f04691feb45e50df4118d513bbe4985a84e00a07d29a13: 20 MHz Wally, 100 MHz graphics/memory fabric, and a 640 x 480 RGB565 framebuffer. CVW commit: b3c4f6b91be0b3a3729a0aa72142d45b76aedcab. Official RasterIX commit: 9fdcf97a31b2e4247594e06d605871980cd5e9e1. Builds retain Release -O3; a separate unstripped binary supplies debug information. The board checks the binary SHA256 before each run. SD transfers use an external fixture; acquisition uses the original bitstream.

## Timing and sampling

Preparation is `api_ns + swap_ns - upload_inclusive_ns`. API/queue work outside the Worker is `api_ns + swap_ns - worker_inclusive_ns`; CPU Worker work outside upload is `worker_inclusive_ns - upload_inclusive_ns`. The Worker executes CPU code synchronously in this experiment. Subtraction avoids counting nested inclusive intervals twice. Upload includes the transfer path and is not an isolated GPU rendering time. Completed swaps define throughput; HDMI scanout refresh is separate.

The v006 application records interrupted RISC-V PCs with ITIMER_PROF, SIGPROF and SA_SIGINFO. Samples contain the frame and coarse phase, in preallocated storage. The handler performs scalar stores; recording stops before CSV output and framebuffer readback. User/system process CPU times are also recorded. The target kernel lacks perf-events support. Requested periods are quantized, and signal delivery can be delayed or biased. Counts locate candidate code; they are not precise exclusive wall-time percentages. Primary causal timing has sampling disabled.

The original 4/7/11 ms acquisition remains unexecuted: its 7 ms pilot increased preparation by 26.23%, and the failed qualification and plan are frozen. A separate coarse plan uses requested 41/73/113 ms and interleaved off controls, 180 measured frames after 30 warmup frames, three repetitions per condition. The preceding 41 ms pilot had about 4.66% overhead. No retrospective accuracy threshold is asserted. Period-specific overhead and location consistency must be reported.

## Causal controls

The fixed screen has 78 quads and 312 submitted vertices. v007 preserves geometry, primitive order, vertex attributes and texturing/blending boundaries. Group 0 uses the original path; group 1 controls the refactoring; groups 4, 16 and 4096 combine compatible quads. Rectangles and glyphs remain separate. The primary comparison uses 180 measured frames after 30 warmup frames and three repetitions, in a saved pseudorandom order. Each final frame must match all 307200 reference pixels, with matching state hashes and vertex totals.

Moving windows start at game ticks 0, 1800 and 3600, followed by 30 warmup and 180 measured frames. Original and all-quads grouping have one run per window. Every state hash is checked against the unchanged host-generated 20000-step trace. These windows test relevance to moving scenes; they do not estimate whole-game average throughput. The automatic controller and one simulation step per rendered frame are retained.

A separate extension holds draw groups at two and increases quads from 78 to 198 and 678 by subdividing each block into 4 or 16 rectangles. It was frozen before grouping pilot outcomes. Each added condition uses 120 measured frames after 30 warmup frames and three repetitions, with the identical output picture. Vertices and triangles increase together, so their individual costs are not isolated. Grouping may also alter cache/code-path behavior; exact isolated per-call latency is not inferred.

## Evidence boundaries

Run ranges describe between-run variation. Frames within a run are not treated as independent repetitions. Pilots and failures are preserved. Source hotspots, timing interventions, state equality and physical capture provide distinct evidence. On boot 12, native framebuffer checks passed while UGREEN/OBS reported Video Format Not Supported. Current capture status must be stated separately. Final conclusions depend on completed results and archive verification.

Timer references: [setitimer](https://man7.org/linux/man-pages/man2/setitimer.2.html), [sigaction](https://man7.org/linux/man-pages/man2/sigaction.2.html).
