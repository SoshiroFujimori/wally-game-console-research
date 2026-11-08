# Standard display acquisition with the current game

On 2026-11-09 (Japan time), the standard product DVI bitstream was tested with
the current game executable, which places WALLY BREAKOUT at the top of the
screen. The selected capture input stayed closed during FPGA programming and
boot, and opened after the game started. The experiment used the existing
hardware and background control; no RTL, clock, SD contents or physical
connections changed.

| Configuration | Game execution | Recorded output |
| --- | --- | --- |
| Standard DVI with the current executable | Completed normally | No game image in 1,805 decoded frames; selected images showed a format error |
| E8 recovery with the same executable | Completed normally | Game image acquired; all 1,979 frames after acquisition passed the fixed-label checks |

The latest-layout standard-DVI demonstration was not obtained. E8 was restored
and its current title layout was visually checked. These runs do not estimate
boot reliability or compatibility with other receivers.

[Results and hashes](results.json) identify the frozen hardware, current game,
capture procedure, observations and restored state. The full-recording checks
are in [the standard result](standard-frame-check.json) and
[the recovery result](e8-recovery-frame-check.json). Original videos and private
logs are retained outside the public repository. These JSON files contain no
new public media.

The [previous configuration comparison](../dvi-standard-check-20261108/README.md)
documents older standard-display successes and the differences from E8. Those
older recordings do not establish successful acquisition of the current layout
in this trial.
