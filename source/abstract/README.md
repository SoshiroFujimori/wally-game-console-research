# Abstract figures

`game-flow.svg` uses black text and signal lines. A thick solid border identifies
the FPGA chip; dashed borders identify component sources. White component boxes
and a light gray chip background make the hierarchy readable in monochrome.
The drawing is a functional concept diagram; transfer timing is omitted.

`print_game_frame.py` generates `figs/game-screen-print.png` from the reviewed
recorded frame at `docs/thesis/figs/current-game.png`. It converts the frame to
Pillow luminance and applies the same monotonic tone curve to every pixel:

```text
printed_gray = round(255 * (source_gray / 255) ** 0.55)
```

This lightens dark blue blocks that would otherwise merge into the black
background in grayscale printing. Dimensions, pixel positions, black and white
are preserved. No objects are added, removed or moved. The original color frame
and recording remain available in the research evidence.

Regenerate the print frame with a Python environment that provides Pillow:

```sh
python source/abstract/print_game_frame.py
```

The figure caption identifies the grayscale reproduction. The published abstract
and its Word edition use the same derived PNG. Page layout and legibility must be
reviewed at the one-column figure size, as well as enlarged.
