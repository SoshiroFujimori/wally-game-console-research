# Wally Game Console Research

Wallyと公式RasterIXをNexys Video上で結合し、二次元ゲームを動かす研究の資料です。
設計の説明、実験の条件と結果、再現用コード、機器操作の補助ツールを保存します。

ゲーム機そのものの実装は [wally-game-console](https://github.com/SoshiroFujimori/wally-game-console)
にあります。本リポジトリの [`console`](console) は、その使用版を固定するGitサブモジュールです。
ゲーム機の利用に必要な変更は製品側へ、測定・資料作成・SDWire3などの実験環境に関する変更は研究側へ分けます。

## GitHubで読む

論文本文、技術付録、実験報告はMarkdownでも公開しています。以下のリンクを開くと、
図・表・コード・ジャンプできる目次をGitHub上で読めます。Wordのダウンロードやcloneは不要です。
読みたい分野から探す場合は、[資料の読み方と分野別の入口](docs/thesis/README.md)を使ってください。

用語の前提や処理の途中から詳しく理解したい場合は、[図と数値例で読む技術詳説](docs/technical/README.md)
を使ってください。回路、CPU、Linux、描画、実験に分かれており、既存の技術付録と実装へ進めます。

| 内容 | 入口 |
|---|---|
| 図で仕組みと主な結果を説明する1ページの概要 | [アブスト](docs/abstract/アブスト_主要事項.md) / [Word版](docs/abstract/アブスト_主要事項.docx) |
| 6分の説明に絞った8枚のスライドと発表原稿 | [スライドと原稿](docs/presentation/中間発表_主要事項.md) / [PowerPoint版](docs/presentation/中間発表_主要事項.pptx) |
| 目的、仕組み、設計、実験結果 | [論文本文](docs/thesis/本文.md) / [Word版](docs/thesis/本文.docx) |
| HDL、Wally、Linux、RasterIX、実装の詳細 | [技術付録](docs/thesis/技術付録.md) / [Word版](docs/thesis/技術付録.docx) |
| 前提から理解する説明、図、数値例、実行できるモデル | [技術詳説・分野別目次](docs/technical/README.md) |
| FIFO三方式の比較と更新版の検証 | [E6の結果と判断](docs/thesis/再現資料/実験記録/E6/report/結果と判断.md) |
| 命令DMA、共有メモリ、転送方法の検証 | [E7の結果と適用範囲](experiments/transport-study-20261009/RESULTS.md) |
| 過去の設計変更、測定コード、実験記録 | [再現資料](docs/thesis/再現資料/README.md) |
| 論文中の旧ローカルパスとの対応 | [参照先の一覧](docs/references.md) |
| SDカード接続の切り替えとWindows側の復旧 | [SDWire3の操作](tools/sdwire3/README.md) |
| 個人情報の除去と更新の手順 | [公開資料の更新](docs/privacy.md) |
| 保存した資料と対象外の資料 | [収録範囲](docs/scope.md) |

本文の結果には適用範囲があります。E6ではブロック崩しの比較を行いましたが、
大きいテクスチャの転送には未解決の条件があります。自動プレイの記録を、
Wiiコントローラの実機検証済みという意味では扱っていません。

## 取得と版の固定

```bash
git clone https://github.com/SoshiroFujimori/wally-game-console-research.git
cd wally-game-console-research
git submodule update --init console
git -C console submodule update --init --recursive
```

資料だけを読む場合、サブモジュールの取得は不要です。
`console` は製品の公開コミット `261832d48832dd6e26c4971ab8893ce61200688b` を参照します。
公式Wallyの `2064ca2b` と公式RasterIXの `9269a01c` を取り込み、
E6で実機確認した通常版とソースおよびサブモジュールの版をそろえています。
[照合記録](publication/console-source.json)には、995ファイルと11サブモジュールの一致を記録しました。
E1〜E5とE6は使用版が異なります。過去の測定を再現する場合は、
[版と実験構成の説明](docs/thesis/再現資料/実験記録/E6/README.md)で対象を確認してください。
比較用回路、計測カウンタ、実験スクリプトは研究リポジトリ側に保存しています。

## 配置

```text
console/                    製品リポジトリの固定版
docs/abstract/              主要事項を図と短い文章で説明するアブスト
docs/presentation/          6分の発表スライドと発表原稿
docs/thesis/                公開用の論文、図、技術付録、実験記録E1〜E6
docs/technical/             回路・CPU・Linux・描画・検証の詳説とSVG図
examples/technical-models/  本文の数値と受渡し規則を確かめる説明用モデル
source/thesis/              論文の章別原稿と生成プログラム
experiments/                補足試験、数学・RTL検証、当時の実験スクリプト
tools/sdwire3/              設定を引数で渡す機器操作ツール
tools/publication/          匿名化、公開前の検査、ファイル参照の確認
tools/docs/                 技術詳説の図と目次の生成・検査
publication/               公開版のファイル検証情報と確認済みメディア
LICENSES/                  コピーした上流ソースのライセンス
```

`archive` / `archive-scripts` は当時の処理を説明するための保存資料です。
パスや機器識別子を伏せてあるため、そのまま実行できる汎用ツールではありません。
実験用ビットストリーム、ディスクイメージ、ビルドキャッシュは保存対象に含めません。

## 更新時の検査

```bash
python3 -m venv .venv
.venv/bin/python -m pip install -r requirements-publication.txt
git config core.hooksPath .githooks
export PUBLICATION_PYTHON="$PWD/.venv/bin/python"
.venv/bin/python -m unittest discover -s tests -v
.venv/bin/python tools/publication/check.py
```

最後の検査には、公開しない `.private/redactions.json` が必要です。
初めて取得した読者は `check.py --public` で公開情報だけの検査を実行できます。
本人・指導教員・所属・機器の識別情報は資料から除去しています。
GitHubの所有アカウントと製品リポジトリへの関係は公開されています。

上流コードの著作権・ライセンス表記は保持します。
文書や新規コードを含む全ファイルへ一律の上流ライセンスを適用するものではありません。
詳しくは [ライセンスと出典](LICENSES/README.md) を参照してください。

