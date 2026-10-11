# 論文と技術付録のソース

研究本文は `本文.md`、技術付録の序文は `技術付録.md` です。
技術付録の各章は `appendix/` の五つの分野別ディレクトリにあります。
`appendix/chapters.json` が章の並び、見出し、公開先、継承するリンクIDを定めます。
各章は原理・実装・実験の違いによらず同じ階層です。技術付録の下に別の付録は置きません。

## Publication

`appendix_assembly.py` assembles the preface, all 72 chapters and references.
The Word builder and Markdown exporter consume exactly the same assembled
source. Chapter-sized pages under `docs/thesis/appendix/` retain the full prose,
figures, tables and examples. There is no separately authored companion tree.

```bash
.venv/bin/python source/thesis/build.py 技術付録 --markdown-only
.venv/bin/python source/thesis/build.py 本文 --markdown-only
.venv/bin/python tools/docs/navigation.py
```

Use `--check` to compare generated Markdown with the source without writing.
Pages exceeding 64 KiB are rejected. Do not edit generated pages directly.
Stable bookmark IDs may contain historical letters or numbers; these are
machine identifiers, not visible appendix categories. The path migration map
is `publication/appendix-routes.json`. Update inbound links when moving pages.

To build Word, omit `--markdown-only` and use the configured document runtime.
The existing public Word files supply styles. PNG figures are in `figs/` and
are copied to the publication directory during the build. The SVG sources and
generators are retained for editing. Render both affected books after changes,
verify every page, and update `build-*/toc-pages.json` from actual bookmark page
positions. Never publish guessed page numbers or a Word copy with less content
than the Markdown edition.

Private redaction settings remain under `.private/`. Run tests, reference
checks, local privacy checks and publication-manifest checks before publication.
