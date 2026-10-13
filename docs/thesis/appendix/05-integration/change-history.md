<!-- appendix-content:start -->
<a id="ch_a"></a>
# 第60章 変更を自分で再現するための案内
<!-- appendix-content:end -->

[付録の総目次](../../技術付録.md) ｜ [論文本文](../../本文.md) ｜ [参考文献](../references.md)

[第V部 Nexys Videoへの統合と実験と再現](README.md)

ファイルパスの表記は、[資料フォルダー](../../README.md)を基準とする。

## このページの目次

- [60.1 コミットの段階を固定する](#s_a_1)
- [60.2 Nexys Video対応の12ファイル](#s_a_2)
- [60.3 値を一つ変更するときの練習](#s_a_3)
- [60.4 最上位回路を読む順番](#s_a_4)
- [60.5 実際の差分と答え合わせ](#s_a_5)
- [60.6 RasterIX導入のファイルを役割で分ける](#s_a_6)

<!-- appendix-content:start -->
<a id="s_a_1"></a>
## 60.1 コミットの段階を固定する

完成版にあるファイルを、すべて最初から存在したものとして読むと、何を追加したかが見えにくい。次の段階を順に比べる。付属資料はこの順番と、本文の説明を対応付ける。

| コミット | 内容 | 主に読む章 |
|---|---|---|
| 2345ec2ad | 基板対応前の出発点 | [論文本文第4章](../../本文.md#ch_4)・[技術付録第59章](board-reproduction.md#ch_g_board_reproduction) |
| f0764f003 | Nexys Videoへの対応 | [第59章](board-reproduction.md#ch_g_board_reproduction)、本章 |
| e3fa2b94f | 例外処理中のメモリ要求の修正 | [論文本文12.2節](../../本文.md#s_12_2) |
| 5b6adcd97 | 公式RasterIXの接続 | 論文本文第6〜9章 |
| 1749fe0ef | 起動時の画像初期化 | [論文本文9.4、10.4節](../../本文.md#s_9_4) |
| 4b4e986b1 | 全体描画のブロック崩し | [論文本文10.1〜10.3節](../../本文.md#s_10_1) |
| 71364d8b2 | 描画呼び出しの統合 | [技術付録33.7節](../03-linux/game-loop.md#s_app_33_7) |
| 46968347e | 部分描画 | [技術付録33.8〜33.9節](../03-linux/game-loop.md#s_app_33_8) |
| d3e181ac4 | sleepを使わない完了確認 | [技術付録33.10節](../03-linux/game-loop.md#s_app_33_10) |

git show --stat <コミット>で変更ファイルの概要、git show <コミット> -- <ファイル>で差分を読める。差分の先頭の+は追加、-は削除である。これらの記号はソース本体へ書き込む文字ではない。

<a id="s_a_2"></a>
## 60.2 Nexys Video対応の12ファイル

以下のパスはリポジトリ直下からの相対位置である。同名の生成済みコピーではなく、元のソースを編集する。表の順序は、設定から接続へ進む読み順である。

| ファイル | 変更 | 読み取るべきこと |
|---|---|---|
| config/derivlist.txt | 変更 | 外部メモリ範囲が512 MiBになる値 |
| fpga/generator/Makefile | 変更 | ボード名、部品番号、周波数、生成対象 |
| fpga/generator/xlnx_ddr3-nexysvideo-mig.prj | 追加 | 実物DDR3と配線の設定 |
| fpga/generator/ddr3-nexysvideo.tcl | 追加 | MIGを指定設定から生成する手順 |
| fpga/generator/mmcm-nexysvideo.tcl | 追加 | 100、200、20 MHzの生成 |
| fpga/generator/ahbaxibridge.tcl | 変更 | CPU側の転送とAXIを対応付ける設定 |
| fpga/generator/clkconverter.tcl | 変更 | CPU側とDDR3側のクロック境界 |
| fpga/src/fpgaTopNexysVideo.sv | 追加 | 部品の実体と信号をつなぐ最上位回路 |
| fpga/constraints/constraints-nexysvideo.xdc | 追加 | 実物端子、電気規格、時間条件 |
| fpga/generator/wally.tcl | 変更 | 新しいソースを読み、実装する分岐 |
| linux/devicetree/wally-nexysvideo.dts | 追加 | OSに渡すメモリとクロックの説明 |
| fpga/README.md | 変更 | 利用者が選ぶ生成対象と実機手順 |

<a id="s_a_3"></a>
## 60.3 値を一つ変更するときの練習

練習として、512 MiBの値がどこへ伝わるかを追う。まずderivlist.txtのEXT_MEM_RANGEを見る。次に生成手順がRANGE + 1で容量を求め、起動コードへ渡すことを確認する。さらにデバイスツリーのメモリに書いた容量と比較する。

ここで、DDR3の実物が512 MiBだから、容量を知らせる設定を512 MiBへ合わせたのである。設定を1 GiBへ増やしても、実物のメモリが増えるわけではない。この区別ができれば、パラメータを書き換える意味を理解できている。

同じようにCPU20 MHzの値を追う。MakefileのSYSTEMCLOCK、Clocking Wizardの出力、UART等の設定、デバイスツリーを対応付ける。どの値が物理回路を作り、どの値がその説明をソフトウェアへ伝えるかを色分けして読むとよい。

<a id="s_a_4"></a>
## 60.4 最上位回路を読む順番

fpgaTopNexysVideo.svの先頭には、外へ出る端子が並ぶ。clkやresetnは基板から入る信号、DDR3の信号は基板上のメモリにつながる信号である。次に内部の配線が宣言され、その後に部品の実体が置かれる。

部品の実体を作る記述は、モジュールの種類、実体の名前、接続する端子の組で読む。例えば回路Aの出力をwire1へつなぎ、回路Bの入力にもwire1を指定すると、両者が接続される。ソフトウェアの関数を順番に呼んでいるわけではなく、これらの回路は同時に存在して動く。

読み順は、外部入力の同期、クロック生成、リセット、Wally本体、AHBからAXIへの変換、クロック変換、DDR3制御とする。一回のメモリ読み出しがCPUから外へ出て戻る経路を、アドレスとデータの両方向に追う。[技術付録第61章](nexys-video-files.md#ch_e)では、この初期版の組み立てをファイルごとに説明する。さらに、付属教材の[8.1〜8.10節](../01-hdl-fpga/cdc-protocols.md#s_g_cdc_protocols_1)には、この233行の全コードを小さく分けた解説がある。

<a id="s_a_5"></a>
## 60.5 実際の差分と答え合わせ

再現資料/ボード対応には、変更前、変更後、差分、参考_変更しない既存コードを置いた。最初に説明を読み、自分で編集し、その後で変更後と比べる。単にpatchを当てた場合は、同じファイルを作れた確認にはなるが、各行の意味を理解した確認とは分ける。

対応全体.patchは、対応前の版へ12ファイル分の変更を適用するためのものだ。必ず演習用の別クローンを対応前の版にし、git apply --checkで適用可能か確かめてから使う。既に完成版の作業場所へ重ねて当てるものではない。

教材に付属する再現確認.jsonは、2026年9月23日に差分を適用した結果が、対象コミットの内容と一致した記録である。今回の原稿更新で新しいFPGAを生成した記録ではない。ソースの再現、生成の再現、実機の再現はそれぞれ別に記録する。

<a id="s_a_6"></a>
## 60.6 RasterIX導入のファイルを役割で分ける

RasterIX導入コミットは39ファイルを扱う。一度に39個の名前を覚えるより、接続の層ごとに読む方が追いやすい。

| 層 | 主なファイル・場所 | 確認する約束 |
|---|---|---|
| 外部ソースの取得 | .gitmodules、addins/rasterix | 公式URLと固定版 |
| 構成設定 | config、parameter-defs、cvw.sv | 外部I/Oの有効化、番地、範囲 |
| CPUから外への経路 | adrdecs、pmachecker、uncore、wallypipelinedsoc | 番地の判定、属性、APB信号 |
| 描画命令の接続 | rasterix_apb.sv、rasterix.sv | 32 bit命令と終端、待ち、クロック境界 |
| 表示切り替え | rasterixdisplay.sv | アドレス保持、読み出し待ち、完了通知 |
| IP生成 | rasterixmem.tcl、axiscdc.tcl、videoclock.tcl | メモリ共有、FIFO、映像クロック |
| 基板と生成手順 | fpgaTop、XDC、wally.tcl、Makefile | ソース選択と外部端子 |
| OSとアプリ | dts、CMakeLists、WallyBusConnector | メモリ予約、同じ構成値、送信操作 |

付属の接続ソースには、上記の主要ファイルを固定版からコピーした。ソース内の英語コメントはそのまま保持し、日本語の説明は論文側に置く。元のリポジトリへ日本語の解説や測定用ファイルを加えるものではない。
<!-- appendix-content:end -->

---

[前：第59章 Nexys Video対応とRasterIX接続をファイルから再現する](board-reproduction.md) ｜ [次：第61章 Nexys Video対応をファイルごとに組み立てる](nexys-video-files.md)
