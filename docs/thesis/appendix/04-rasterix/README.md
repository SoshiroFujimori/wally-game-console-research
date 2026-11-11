<!-- appendix-content:start -->
<a id="part_iv"></a>
# 第IV部 RasterIXと描画システム
<!-- appendix-content:end -->

[付録の総目次](../../技術付録.md) ｜ [論文本文](../../本文.md) ｜ [参考文献](../references.md)

<!-- appendix-content:start -->
ゲームが指定した四角形から、描画命令、画素の計算、画像の保存、映像出力までを追う。CPU上のライブラリとFPGA内の回路が分担する仕事を、数値例とソースで確かめる。

グラフィックの用語を確認する入口は[37.16〜37.18節](walkthrough.md#s_graphics_37_16)である。次の表から、知りたい処理へ直接進める。

| 知りたいこと | 読む範囲 | 具体的に追う内容 |
|---|---|---|
| 今回のゲームのOpenGLコードを図で追う | [38.19〜38.33節](commands.md#s_opengl_38_19) | 四角形、文字画像、座標、透明部分、命令の提出を17点の図で説明 |
| 画面は何から作るか | [37.16〜37.19節](walkthrough.md#s_graphics_37_16) | 画素・図形・文字と、CPUと回路の分担 |
| OpenGL関数の中で何が起きるか | [38.14〜38.18節](commands.md#s_graphics_38_14) | コンパイル、頂点に設定を保存する処理、VBOとシェーダー |
| なぜ頂点だけで面を塗れるか | [第39章](rasterization.md#ch_g_rasterization) | 座標、三角形の内外判定、補間、画素の境界 |
| 文字をどう画像として貼るか | [52.16〜52.21節](textures-pixel-pipeline.md#s_app_52_16) | フォント画像、uとv、拡大縮小、画像の保存形式 |
| 透明な文字の背景が残る理由 | [53.15〜53.19節](fragment-tests-blending.md#s_graphics_53_15) | alphaの計算、重なり順、深度、マスク、色の数値 |
| 描いた画像はいつ画面に出るか | [40.23〜40.26節](framebuffer-display.md#s_graphics_40_23) | 命令送信・描画・表示の完了、メモリ容量、FPSとHz |

一般的な描画の原理と、本構成で有効にした機能を対応させて説明する。使用版は37章の冒頭に示し、実際のソースへリンクする。小さな数値例は手計算の確認に使い、実機の測定結果は実験記録から読む。
<!-- appendix-content:end -->

## この分野の章

- [第37章 白い四角形を一つ表示するまで](walkthrough.md)
- [第38章 図形の指定がメモリ上の描画命令になるまで](commands.md)
- [第39章 三角形から画素と色を求める計算](rasterization.md)
- [第40章 画像を保存して連続した映像として送り出す](framebuffer-display.md)
- [第41章 信号とコードを数値で追う](signals-and-numbers.md)
- [第42章 RasterIXとの接続を自分で組み立てる](rasterix-integration.md)
- [第43章 設定を変えるための計算と設計判断](configuration-calculations.md)
- [第44章 命令の受け渡しとクロック境界を設計する](command-clock-boundary.md)
- [第45章 設計を変更できる理解へ進む](design-change-reasoning.md)
- [第46章 RasterIXを開発者の視点で読むための地図](rasterix-source-map.md)
- [第47章 一つの二次元四角形を画素まで追う](rectangle-to-pixels.md)
- [第48章 三種類の命令とビットの配置](command-bit-layout.md)
- [第49章 CPU側で三角形記述子を作る](triangle-descriptors.md)
- [第50章 RTL全体の制御と停止を読む](rtl-control-stalls.md)
- [第51章 描画回路の画素列挙と属性の補間](rasterizer-interpolation.md)
- [第52章 テクスチャの参照と画素の色の計算](textures-pixel-pipeline.md)
- [第53章 画素候補の採否と色の混合](fragment-tests-blending.md)
- [第54章 内部画像メモリからDDR3と表示へ](framebuffer-memory-display.md)
- [第55章 RasterIXを変更・検証できる開発手順](rasterix-development.md)
- [第56章 座標、境界、辺関数を数式と実装で一致させる](coordinates-edge-equations.md)
- [第57章 固定小数点と補間とテクスチャと混色の計算](fixed-point-color-math.md)
- [第58章 数式とソースと試験を対応付けた検証記録](mathematical-verification.md)
