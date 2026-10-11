<!-- appendix-content:start -->
<a id="part_iv"></a>
# 第IV部 RasterIXと描画システム
<!-- appendix-content:end -->

[付録の総目次](../../技術付録.md) ｜ [論文本文](../../本文.md) ｜ [参考文献](../references.md)

<!-- appendix-content:start -->
ゲームが指定した四角形から、描画命令、画素の計算、画像の保存、映像出力までを追う。CPU上のライブラリとFPGA内の回路が分担する仕事を、数値例とソースで確かめる。
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
