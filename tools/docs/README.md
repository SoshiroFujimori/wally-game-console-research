# Appendix explanations and navigation

The directly authored Japanese explanations live in `docs/technical/`. They
belong to the same online technical appendix as the generated chapter pages.
The common entry point is `docs/thesis/技術付録.md`; the five topic indexes include
both the explanatory examples and the implementation chapters. Existing paths
remain stable for citations and figures. The Word edition currently contains
the original 56 chapters. Preserve source-revision and experimental-scope
qualifications in every explanation.

Register a new explanatory page in `COMMON_GUIDES` or `TOPIC_GUIDES` in
`source/thesis/markdown_export.py`, then regenerate the appendix Markdown with
`python3 source/thesis/build.py 技術付録 --markdown-only`. Keep the page's links
to the shared appendix index and its topic index.

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
