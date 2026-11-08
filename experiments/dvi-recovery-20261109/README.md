# Latest-layout standard DVI recovery

On 2026-11-09, the unchanged standard DVI bitstream displayed the latest
title-at-top Breakout executable on the selected physical board and capture
input. [The reviewed 30-second recording](media/latest-standard-dvi-30s.mp4)
contains 1,800 encoded frames. Ball and paddle positions change, bricks
disappear, and the score increases. This is actual captured game output.

| Artifact | SHA-256 |
| --- | --- |
| Unchanged standard bitstream | `16173de97a91e711cd7bc5389acd9739807adebedf192efc29fe78f5b96c0acf` |
| Latest executable | `5c360babde59c6d9fc72fe58edc5729da2b2b8480c2f3a5208980d2f7d2c558b` |
| Original 45-second-game recording | `b40cf6be2d5a9345d88903aa15ab0b830c4331b985ffbc15543a63c708ad74f9` |
| Reviewed 30-second scratch clip | `af81418b4c1bab75a4c26835a644982500d0036f7e8352a123ce2d76d5a617da` |
| Public 30-second video | `b852e252074388fe99a1b850a5e81eadd2548491fa72bf6b48ee794229592a09` |
| HDMI640 diagnostic primer | `2b00c4ba66570ad910c2c402c3353c02187877594e9fd18bacdeed9b4855d415` |

The public clip uses original recording frames 300 through 2099 (5 to 35
seconds). Lossless encoding preserved every decoded YUV frame. The subsequent
publication remux removed metadata/audio and preserved every encoded video
packet and timestamp. Container hashes therefore differ without changing the
reviewed video pixels.

## Acquisition sequence that worked

1. Program the separately qualified **true HDMI640/VIC1 diagnostic fixture**,
   select HDMI mode 0, and wait 20 seconds. Actual color bars and a white square
   were visible. The fixture contains no CPU; its clocks are 25.2/126 MHz.
2. Keep the existing OBS capture input active while programming the unchanged,
   hash-pinned **standard DVI** bitstream. The diagnostic fixture is replaced.
3. Boot, load the hash-pinned latest executable from read-only SD, verify its
   target hash, and unmount the SD data partition.
4. Run the latest game for 45 seconds and record it. The acquisition used the
   original input settings: custom 1280x720, YUY2, frame interval 166666, and
   deactivate-when-hidden enabled. The recording presents the source in 4:3
   within a 1920x1080 canvas.
5. Two additional 20-second **game-only** launches also displayed the latest
   layout while retaining the same FPGA configuration and capture input.

The initial HDMI720/DVI720 fixture replay, an old-executable-first attempt,
MJPEG negotiation, and two boot04-style input-reopen-before-program attempts
had not acquired the standard game. Those failures remain in the private
records and the operation summary in [results.json](results.json).
The HDMI640 sequence worked once. Its causal role, and repeatability after
another FPGA reconfiguration or power cycle, have not been established.

## Verification and final state

All 805 on/off font-cell samples and both blue side-wall checks matched in
every frame of the accepted 30-second segment. Motion analysis and manual
inspection confirmed the ball, paddle, disappearing bricks and changing score.
The original checker result is preserved as **failed**: its separate absolute
cyan-area gate required over 600 title pixels, while this capture measured
296–307, despite zero font-cell mismatches. No source checker was modified.
Both additional launches passed the same font-cell/wall checks for their
15-second review windows, with manual inspection of their current game images.

The successful standard DVI configuration and active receiver input were left
in place. The game process had ended, SD was unmounted, and OBS recording,
streaming and virtual camera outputs were stopped. Original capture settings,
record directory and mutes were retained/restored; the verified 4:3 presentation
transform was retained. The working E8 bitstream and latest executable remain
available for recovery. No product or official RasterIX source, CPU/console
clock, main document, commit or push was changed by this operator.

This is a functional demonstration of one acquired configuration. The two
application restarts are not three boot trials, protocol certification, a
game-rendering FPS measurement, or a long-term stability estimate.

## Reuse claim and source boundary

> RasterIXに同梱された既存の描画・表示回路を組み込み、最新配置のブロック崩し映像をDVIで実機出力した。

The bundled display module is reused. The locally written integration and
framebuffer/control handshake remain local contributions:

- `console/fpga/src/rasterixdisplay.sv:31–127`: local control/wrapper logic.
- `console/fpga/src/rasterixdisplay.sv:129–146`: bundled `dvi_framebuffer`
  instantiation, including its DVI outputs.
- `console/fpga/generator/wally.tcl:76–82`: inclusion of RasterIX and its bundled
  `rtl/3rdParty/core_dvi_framebuffer/src_v` sources.

The archived standard bitstream source revision is
`261832d48832dd6e26c4971ab8893ce61200688b`; the product revision inspected here is
`ed6a1c09b34d597dcde92ec26a4f5a97cbf18a17`. The existing
[source audit](../dvi-standard-check-20261108/source-audit.json) establishes
unchanged hardware files; the latest layout changes `Breakout.hpp`.
RasterIX remains pinned to `9269a01c9bd4c3342bfa70ef8e3cdd751c15c6d0`.

[Primer qualification](primer-qualification.json) and
[experiment-local media review](media-review.json) accompany this record.
The experiment is uncommitted; the parent publication task owns synchronization
of the global publication registry. Raw logs, device identities and import
configuration remain outside the repository.
