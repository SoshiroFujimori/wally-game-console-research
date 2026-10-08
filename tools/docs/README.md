# Technical companion maintenance

The Japanese Markdown source lives directly in `docs/technical/`. It complements
the existing thesis appendix; it is not automatically included in the Word
edition. Preserve source-revision and experimental-scope qualifications when
editing either set of documents.

Run these commands from the repository root with Python 3.10 or newer:

```sh
python3 tools/docs/figures.py
python3 tools/docs/navigation.py --write
python3 examples/technical-models/explain.py all
python3 tools/docs/figures.py --check
python3 tools/docs/navigation.py
```

`figures.py` generates twelve SVG files using the Python standard library. SVG
text and the figure generator are both reviewed as source. Render the SVGs and
inspect text placement, arrows, and Japanese glyphs after changing the diagrams.
Keep temporary QA images under ignored `build/`; do not publish unreviewed PNGs.

`navigation.py` maintains explicit section IDs and per-page tables of contents.
It also checks local links, including fragment destinations in the existing
appendix. The generated comments delimit only the table of contents; the prose
is authored directly. Avoid changing section order without considering incoming
fragment links.

The explanatory models deliberately omit hardware details such as analog CDC
behavior, vendor IP latency, and CPU execution timing. Do not present a model
pass as FPGA validation. Experimental checks belong to the archived experiment
and its stated source version.

Run the repository publication tests, private privacy audit, reference check,
and manifest refresh before committing. CI verifies that the committed figures
and navigation remain synchronized and that the examples still run.
