# 論文から保存資料を探す

この表は研究リポジトリに実際に保存した場所を指します。
製品のコードと研究用の補助資料を区別して参照してください。
論文フォルダー内の `再現資料/...` は、下表の `docs/thesis/再現資料/...` と同じものです。

| 論文での呼び方 | 本リポジトリの保存先 |
|---|---|
| WallyとRasterIXの製品実装 | [`console/`](../console)（使用コミットを固定したサブモジュール） |
| E1 結合と接続の検証 | [E1](thesis/再現資料/実験記録/E1/RESULTS.md) |
| E2 追加の実機検証 | [E2](thesis/再現資料/実験記録/E2/コミットと追加検証.md) |
| E3 BRAMと内部作業領域 | [E3](thesis/再現資料/実験記録/E3/BRAM容量の確認.md) |
| E4 二次元ゲームの比較 | [E4](thesis/再現資料/実験記録/E4/report/成果と検証範囲.md) |
| E5 CPU側の描画準備時間 | [E5](thesis/再現資料/実験記録/E5/results-ja.md) |
| E6 FIFO三方式と公式更新後の検証 | [E6](thesis/再現資料/実験記録/E6/README.md) |
| 当時のE6計測・ビルド・診断スクリプト | [保存スクリプト](../experiments/fifo-study-20261008/archive-scripts) |
| `qa/rasterix-*` / `qa/rasterix_*` | [数学・RTL・ソース検証](../experiments/rasterix-math) |
| SDWire3を扱うPC側のスクリプト | [SDWire3](../tools/sdwire3/README.md) |
| Nexys Video単体で行ったボード試験 | [初期ボード試験](../experiments/board-bringup-20260909) |
| 章別原稿とWord生成プログラム | [原稿ソース](../source/thesis) |

ソースの一部だけの抜粋は、そのままで製品全体をビルドするためのものではありません。
製品の全コードとサブモジュールは `console/` から取得します。
E6はその後の未コミット差分も使っています。E6のREADMEにある差分の適用と
サブモジュールの版の指定を省略しないでください。

## 元のPCだけにあった参照先

`/path/to/...`、`RESEARCH-HOST`、`UART_SERIAL`、`SDWIRE_READER_SERIAL` は
公開用の置換表記です。その名前のPCや機器を探す意味ではありません。
歴史的なログに現れるビルド先・一時ディレクトリを公開する代わりに、
必要なコードと結果を上の配置へまとめました。

公式RasterIXのソフトウェア試験・Verilator試験の旧キャッシュディレクトリは
コピーしていません。再生成の手順は [数学・RTL検証のREADME](../experiments/rasterix-math/README.md)
にあります。旧動画やビットストリーム、ディスクイメージをすべて収録したアーカイブではありません。
E6の30秒のゲーム映像は [videoフォルダー](thesis/再現資料/実験記録/E6/report/results/video) にあります。

