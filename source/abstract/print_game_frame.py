#!/usr/bin/env python3
"""Prepare a grayscale reproduction of the recorded frame for the abstract."""
from pathlib import Path
import hashlib
import json

from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "docs/thesis/figs/current-game.png"
DEST = Path(__file__).with_name("figs") / "game-screen-print.png"
GAMMA = 0.55


def main():
    with Image.open(SOURCE) as image:
        gray = image.convert("RGB").convert("L")
        # A global monotonic transform makes dark blue blocks legible in print.
        # Preserve pixel positions, dimensions, black, and white.
        table = [round(255 * (value / 255) ** GAMMA) for value in range(256)]
        gray.point(table).convert("RGB").save(DEST)
    print(json.dumps({
        "source": SOURCE.relative_to(ROOT).as_posix(),
        "source_sha256": hashlib.sha256(SOURCE.read_bytes()).hexdigest(),
        "output": DEST.relative_to(ROOT).as_posix(),
        "output_sha256": hashlib.sha256(DEST.read_bytes()).hexdigest(),
        "gamma": GAMMA,
    }))


if __name__ == "__main__":
    main()
