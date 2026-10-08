# 論文の章別ソース

本文の原稿は `本文.md`、技術付録は `技術付録.md` と各トピックのMarkdownから
`appendix_assembly.py` で構成します。公開して読む版は `docs/thesis/` にあります。

```bash
.venv/bin/python source/thesis/build.py 本文
.venv/bin/python source/thesis/build.py 技術付録
```

生成には `requirements-publication.txt` と非公開の匿名化設定が必要です。
既存の公開Word文書から書式を引き継ぎ、図は `docs/thesis/figs` を利用します。
章の内部リンクは安定した番号を使っています。Wordの目次のページ番号は
レンダリングした結果との照合が必要です。`build-*/toc-pages.json` はその中間データで、
Gitには保存しません。ページを確認せずに生成結果を完成版として公開しないでください。

図の生成スクリプトは編集元の記録です。一部は当時の素材の配置を前提にしているため、
公開済みのSVGとPNGも保存しています。図の色と線、表、コードは従来の文書の書式を維持します。

