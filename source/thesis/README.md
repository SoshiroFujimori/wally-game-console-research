# 論文の章別ソース

本文の原稿は `本文.md`、技術付録は `技術付録.md` と各トピックのMarkdownから
`appendix_assembly.py` で構成します。公開して読む版は `docs/thesis/` にあります。

```bash
.venv/bin/python source/thesis/build.py 本文
.venv/bin/python source/thesis/build.py 技術付録
```

## Chapter-sized Markdown

The print sources remain complete. The Markdown exporter writes a compact
`docs/thesis/技術付録.md` index, five topic indexes, 56 chapter pages, and a
reference page under `docs/thesis/appendix/`. It retains the original content
and explicit section IDs, rebases images and references, and adds local
contents and previous/next links. Old fragment URLs on the main index lead to
the relevant chapter entry; current document links open the chapter directly.

Regenerate Markdown without changing Word files or images:

```bash
.venv/bin/python source/thesis/build.py 技術付録 --markdown-only
.venv/bin/python source/thesis/build.py 本文 --markdown-only
.venv/bin/python tools/docs/navigation.py
```

Add `--check` to either Markdown command to verify that published pages match
the sources. CI checks both exports and their local section links. The exporter
rejects a page over 64 KiB so that future additions require a deliberate split
instead of silently restoring an oversized page. Do not edit generated pages
directly; edit the topic sources above and regenerate.

The online appendix also includes the directly authored explanations under
`docs/technical/`. `COMMON_GUIDES` and `TOPIC_GUIDES` in `markdown_export.py`
place those pages in the same main and topic indexes as the generated chapters.
Their paths remain stable; readers use one appendix navigation. This navigation
integration does not automatically add the Markdown explanations to the Word
edition, which currently contains the 56 original chapters.

Wordの生成には `requirements-publication.txt` と非公開の匿名化設定が必要です。
既存の公開Word文書から書式を引き継ぎ、図は `docs/thesis/figs` を利用します。
章の内部リンクは安定した番号を使っています。Wordの目次のページ番号は
レンダリングした結果との照合が必要です。`build-*/toc-pages.json` はその中間データで、
Gitには保存しません。ページを確認せずに生成結果を完成版として公開しないでください。

図の生成スクリプトは編集元の記録です。一部は当時の素材の配置を前提にしているため、
公開済みのSVGとPNGも保存しています。図の色と線、表、コードは従来の文書の書式を維持します。

