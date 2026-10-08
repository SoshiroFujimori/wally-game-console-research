## 付録N RasterIXを開発者の視点で読むための地図

### N.1 この付録でいう「開発者並みの理解」

RasterIXの開発者並みに理解するとは、全ソースを暗記することではない。ある画面上の現象から関係する処理段を選び、入力、内部状態、出力をソースで確認し、変更した場合の影響を予測し、試験で確かめられることである。本付録では、少なくとも次の七つを自分で行える状態を目標とする。

| 能力 | できること | 本付録の入口 |
|---|---|---|
| 経路を追う | `glVertex2f`からFramebufferの書込みまで追う | 付録O |
| 命令を読む | 32 bitの語がどの層の何を意味するか判定する | 付録P |
| 数式とRTLを結ぶ | 辺関数、増分、固定小数点を信号へ対応させる | 付録Q・付録S |
| 制御を読む | 状態機械とvalid／readyによる停止を説明する | 付録R |
| 色の決定を追う | texture、fog、alpha、depth、blendを追う | 付録T・付録U |
| 画像の保存を追う | 内部BRAM、DDR3、表示切替を区別する | 付録V |
| 安全に変更する | 変更単位、試験、波形、実機確認を選ぶ | 付録W |

「名前を知っている」だけでは、この目標を満たさない。例えばRasterizerという名前を知るだけでなく、入力される`TriangleDescX`のどの値を使い、どの状態で座標を動かし、出力の`tindex`をどう作るかまで説明できる必要がある。一方で、すべてのVerilog文を一度に読む必要もない。図N.1の順に、データの姿が変わる境界で止まりながら読む。

![図N.1 四角形を追うときに開くソースの順序](figs/rix-source-roadmap.png)

### N.2 説明の基準版と、変わり得る箇所

本付録が説明する公式RasterIXは、サブモジュールで固定したコミット`9fdcf97a31b2e4247594e06d605871980cd5e9e1`である。Wally側は本研究の基準版[Console26]である。開発中の`main`ブランチは将来変わり得るため、行番号よりも、モジュール名、クラス名、信号名、固定コミットを手掛かりにする。[RasterIX]

公式RasterIXのソース自体には変更を加えていない。したがって本付録では、次の二種類を明確に分ける。

| 種類 | 例 | 読む場所 |
|---|---|---|
| 公式RasterIXの設計 | Rasterizer、TMU、内部Framebuffer | `addins/rasterix` |
| 本研究で追加した結合 | APBレジスタ、非同期FIFO、DDR3共有、表示切替 | `fpga/src`と`examples/rasterix` |

公式の内部設計を説明する箇所で、本研究がその回路を新規設計したかのようには書かない。本研究で設計したのは、Wallyから公式RasterIXを利用できる接続と、その構成で二次元ゲームを動かすソフトウェアである。

### N.3 RasterIX_IFとRasterIX_EFは何が違うか

公式RasterIXには、主に`RasterIX_IF`と`RasterIX_EF`という二つの構成がある。末尾のIFはInternal Framebuffer、EFはExternal Framebufferを指す。本研究が採用したのは`RasterIX_IF`である。

`RasterIX_IF`は、描画中の色、深度、StencilをFPGA内部のメモリへ置く。内部領域より画面が大きいときは、画面を横長の帯へ分け、一帯ずつ内部で描いてDDR3へ書き出す。内部メモリは低遅延で、画素パイプラインへ毎cycleデータを供給しやすい。一方で、同じ図形を各帯について処理する場合があり、textureも帯ごとに読み込む可能性がある。

`RasterIX_EF`は、色、深度、Stencilを最初から外部メモリに置く。画面全体を一度に扱いやすく、同じtextureの再読込みを減らせる可能性がある。しかし、各fragmentについて外部メモリの読書きを待つため、メモリ系が追いつかないとパイプラインが停止する。公式`design.md`も、理論上の利点に対して実際にはメモリ供給不足で停止しやすいと説明している。[RasterIX]

| 観点 | RasterIX_IF | RasterIX_EF |
|---|---|---|
| 描画中の画素保存 | FPGA内部メモリ | 外部システムメモリ |
| 大きな画面 | 帯へ分割 | 画面全体を直接扱う |
| 画素アクセスの遅延 | 小さく予測しやすい | 外部メモリの混雑に依存 |
| 必要なFPGA内メモリ | 多い | 少ない |
| 本研究 | 採用 | 不採用 |

この選択は、「IFが常に優れている」という評価ではない。Nexys Video上で、公式の内部Framebuffer構成を保ち、640×480の二次元画像を確実に作るという条件に合う構成を選んだ。

### N.4 上位から見たモジュール階層

`RasterIX_IF.v`は外部に、命令stream、応答stream、Framebuffer切替、AXIメモリmasterを見せる。その内側には、転送を扱う`FrameStreamingCore`、内部画像を管理する`RasterIXCoreIF`、三角形からfragmentを作る`RasterIXRenderCore`がある。図N.2は所有範囲を示す。

![図N.2 RasterIX_IF内部の主要な境界](figs/rix-module-boundaries.png)

| 階層 | 主な責務 | 代表ファイル |
|---|---|---|
| `RasterIX_IF` | 外部streamとAXIをまとめる | `rtl/RasterIX/RasterIX_IF.v` |
| `FrameStreamingCore` | stream間・メモリ間の転送を解読する | `rtl/RasterIX/FrameStreamingCore.v` |
| `RasterIXCoreIF` | 内部Framebufferと外部画像の受渡し | `rtl/RasterIX/RasterIXCoreIF.v` |
| `RasterIXRenderCore` | 描画命令を画素へ変換する | `rtl/RasterIX/RasterIXRenderCore.v` |
| `CommandParser` | 内側の描画命令を解読する | `rtl/RasterIX/CommandParser.v` |
| `Rasterizer` | 三角形内の画素座標を列挙する | `rtl/RasterIX/Rasterizer.v` |
| `AttributeInterpolatorX` | 色、深度、texture座標を補間する | `rtl/RasterIX/AttributeInterpolatorX.v` |
| `PixelPipeline` | textureとfogを適用する | `rtl/RasterIX/PixelPipeline.v` |
| `PerFragmentPipeline` | 各試験、blend、logic opを行う | `rtl/RasterIX/PerFragmentPipeline.v` |
| `InternalFramebuffer` | 色、深度、Stencilを保存する | `rtl/RasterIX/InternalFramebuffer.v` |

上位モジュールを読むときは、すべてのportを一度に理解しようとしない。まず命令stream、fragment stream、Framebuffer、AXIメモリという四群に色分けする。その後、各群の`valid`、`ready`、`data`、`last`を追う。

### N.5 ソフトウェアとRTLの分担

RasterIXは、すべてをRTLで処理するGPUではない。CPU側のC++とFPGA側のRTLが仕事を分担する。特に、頂点の行列変換、primitiveの組立て、三角形の辺関数や属性増分の準備は、構成に応じてCPU側で行う。RTLは、その準備済みパラメータを使い、各画素を高速に列挙して色を決める。

| 処理 | 主に担当する側 | 本設定での意味 |
|---|---|---|
| OpenGL APIの状態管理 | CPU上のC++ | 現在色、texture設定などを保持 |
| 頂点の収集 | CPU上のC++ | 四角形の四頂点を配列へ保存 |
| primitive組立て | CPU上のC++ | 四角形を二三角形へ変換 |
| 行列・clipping・viewport | CPU上のC++ | 画面座標まで変換 |
| 辺関数の初期値と増分 | CPU上のC++ | `TriangleDesc`を作る |
| 内側画素の列挙 | FPGA上のRTL | `Rasterizer.v`が実行 |
| 属性補間 | FPGA上のRTL | 色、深度、texture座標を更新 |
| texture、fog、各試験 | FPGA上のRTL | 各fragmentの最終値を決定 |
| 画像保存と外部転送 | FPGA上のRTL | BRAMとDDR3を使用 |

この分担を知らずに「RasterIXが三角形を描く」とだけ覚えると、CPU側の処理時間が大きい理由を理解できない。CPUは四頂点を渡した直後に仕事を終えるのではなく、描画回路が使える記述子を作り、命令列として送信する。

### N.6 データ、制御、保存場所を混ぜない

一つのモジュールを読むとき、信号を三種類に分けると理解しやすい。

**データ**は、色、座標、命令語、texture、アドレスなど、処理対象そのものである。**制御**は、`valid`、`ready`、`last`、`apply`、`busy`、`ce`など、いつ受け取り、いつ進めるかを決める。**保存場所**は、register、FIFO、texture buffer、color buffer、DDR3など、時間をまたいで値を保持する部分である。

例えば`m_frag_tcolor`だけを追っても、`m_frag_tvalid=0`ならそのcycleの色は有効ではない。逆に`valid=1`でも`ready=0`なら、その値はまだ次段へ受け取られておらず、同じ値を保持しなければならない。データと制御を一緒に読む必要がある。

### N.7 二次元ゲームでも三角形の回路を使う理由

三角形は三次元専用ではない。画面上の四角形は、対角線で二つの三角形へ分けられる。ボール、パドル、ブロック、背景、文字の一文字を載せる長方形も同じである。RasterIX内部を理解するためにtexture座標や遠近補正も説明するが、本研究の成果を三次元ゲームの研究として扱うわけではない。

二次元の場合、多くの値は単純になる。頂点のzを同じ値にし、qも一定にすれば、深度や遠近補正の変化はほとんどない。それでも同じ汎用パイプラインを通る。したがって、二次元ゲームで観察した処理時間には、汎用的な設定管理や三角形記述の費用が含まれる。

### N.8 読解を始める実際のコマンド

基準版を確認し、上位階層と主要クラスを検索するには次を使う。

```bash
cd /path/to/wally-game-console
git submodule status addins/rasterix
cd addins/rasterix
git rev-parse HEAD
rg -n "module RasterIX_IF|module RasterIXRenderCore|module Rasterizer" rtl/RasterIX
rg -n "class VertexPipeline|class Renderer|class DeviceDataUploader" lib/gl
```

期待するRasterIXのHEADは`9fdcf97a31b2e4247594e06d605871980cd5e9e1`である。異なる版を読む場合、本付録のモジュール名やbit配置が一致するとは限らない。

この内部解説は上記の固定版に対応する。2026年10月8日の更新版E6では、ページサイズの一致を追加確認し、命令解析回路の入力間隔と受信停止の組合せで重複を再現した。技術付録29.12〜29.14節に、更新版の条件と単体試験を示す。旧版のソースも同じ命令解析回路を含んでいたため、この解説を任意の入力に対する正しさの保証として読まない。

### N.9 この後の読み方

最初に付録Oを読み、一つの四角形だけを最後まで追う。その後、疑問に応じて付録P以降へ移る。命令が分からなければ付録P、三角形の数値が分からなければ付録Qと付録S、色が分からなければ付録Tと付録U、メモリが分からなければ付録Vを読む。最初から全モジュールを横断すると、同名の`Rasterizer`クラスと`Rasterizer` RTL、外側と内側のcommand、内部と外部のFramebufferが混ざりやすい。

## 付録O 一つの二次元四角形を画素まで追う

### O.1 追跡する具体例

例として、左下が`(100, 80)`、右上が`(180, 120)`の赤い長方形を考える。説明を単純にするため、texture、fog、blend、depth test、stencil testを無効にし、四頂点の色を同じ赤とする。概念上の呼出しは次のようになる。

```cpp
glColor3f(1.0f, 0.0f, 0.0f);
glBegin(GL_QUADS);
glVertex2f(100.0f,  80.0f); // P0
glVertex2f(180.0f,  80.0f); // P1
glVertex2f(180.0f, 120.0f); // P2
glVertex2f(100.0f, 120.0f); // P3
glEnd();
```

このコードから、CPUが8,000画素へ赤を書き込むわけではない。四頂点が二三角形へ変わり、各三角形の境界と色の規則が命令列になる。FPGA側が三角形の内側にある画素を列挙し、各画素へ赤を書き込む。図O.1に全体を示す。

![図O.1 一つの四角形が画像になるまで](figs/rix-quad-end-to-end.png)

### O.2 `glColor3f`は現在色を変える

`glColor3f`は、その瞬間に画面を赤くしない。RIXGL内部の「現在色」を更新する。続く`glVertex2f`が頂点を追加するとき、その頂点には現在色が関連付けられる。したがって、頂点ごとに`glColor`を変えれば、三角形の三頂点へ異なる色を持たせられる。

`VertexQueue`は、位置だけでなく、その時点の法線、texture座標、色を対応する配列へ追加する。公式`lib/gl/vertexpipeline/VertexQueue.hpp`では、`addVertex`が`m_vertexBuffer`、`m_normalVertexBuffer`、`m_textureVertexBuffer`、`m_colorVertexBuffer`へ値を追加する。ここで「渡された値を保持する」とは、後で使うためにこれらのC++配列へコピーすることを指す。[RasterIX]

### O.3 `glBegin`と`glEnd`の間で起きること

`glBegin(GL_QUADS)`は、頂点をどの規則で組み立てるかを`QUADS`へ設定し、頂点配列を空にする。各`glVertex2f`は、二次元の`x`と`y`に加えて、既定の`z`と`w`を持つ四成分の頂点として保存される。`glEnd`は、それまでの配列を`RenderObj`として整え、頂点パイプラインへ渡す。

この段階の主な保存場所はCPUの通常メモリである。まだRasterIXの命令FIFOやFramebufferへは入っていない。したがって、`glVertex2f`の呼出し回数が増えれば、CPU側で配列へ追加し、後段で各頂点を処理する仕事も増える。

### O.4 `VertexPipeline::drawObj`が行う順序

`lib/gl/vertexpipeline/VertexPipeline.cpp`の`drawObj`は、概ね次の順で進む。

1. 頂点配列が有効か確認する。
2. 行列や照明など、変更された大域状態を更新する。
3. Pixel pipeline側の設定を命令列へ反映する。
4. primitiveの種類と頂点数を設定する。
5. 有効なTMUを局所状態へ記録する。
6. 新しい描画要素の開始を通知する。
7. 頂点を一つずつ`pushVertex`する。

ここでいうPixel pipelineはC++側の設定管理クラスとRTL側の`PixelPipeline.v`の両方に同じ語が現れる。C++側は「どの機能を有効にするか」を命令へまとめ、RTL側は実際のfragmentへtextureやfogを適用する。ファイル拡張子と階層で区別する。

### O.5 四頂点が二三角形になる

`lib/gl/transform/PrimitiveAssembler.cpp`の`QUADS`処理は、最初の三頂点から`P0,P1,P2`を作り、次に保存した`P0`と残る`P2,P3`から`P0,P2,P3`を作る。四角形を二つの三角形にする対角線は`P0`と`P2`を結ぶ線である。

| 生成順 | 三頂点 | 長方形で覆う部分 |
|---|---|---|
| 三角形0 | P0, P1, P2 | 右下側 |
| 三角形1 | P0, P2, P3 | 左上側 |

一般的なRasterizerでは、二三角形の共有辺をどちらか一方だけに含める規則を設けることが多い。しかし、固定したRasterIX sourceでは三辺とも`w >= 0`なら辺上を含め、top-left規則を実装していない。公式sourceを呼び出す独立試験では、半画素移動後の4×4四角形は16個の異なる画素を覆う一方、共有対角線上の4画素を両三角形が生成し、fragmentは合計20個になった。一様な不透明色では最終色が同じでも、blendやstencilを有効にすると共有辺へ二度作用し得る。付録X.14、付録Z.5、付録Z.6で、入力、software画素集合、RTL照合、適用範囲を示す。

### O.6 行列変換とviewportは二次元でも通る

OpenGL風APIへ渡した座標が、そのままFramebufferの画素番号になるとは限らない。頂点はmodel-view行列、projection行列、clipping、perspective divide、viewport変換を通って画面座標になる。二次元ゲームでは、正投影行列を使い、ゲーム座標と画面画素を分かりやすく対応させることが多い。

正投影を適切に設定し、`(100,80)`が画面上の同じ位置へ写る場合でも、経路そのものは残る。これは汎用APIを利用する費用の一部である。本研究の描画準備時間には、この頂点処理、状態管理、命令列の構築が含まれる。

### O.7 CPU側Rasterizerが記述子を作る

公式C++の`lib/gl/renderer/Rasterizer.cpp`は、三角形を直接塗らない。RTLのRasterizerが使う`TriangleDesc`を作る。主な内容は次である。

| 値 | 意味 |
|---|---|
| `bbStartX`, `bbStartY` | 調べ始める境界箱の左下側 |
| `bbEndX`, `bbEndY` | 調べ終える境界箱の右上側 |
| `wInit[0..2]` | 開始位置における三辺の辺関数 |
| `wXInc[0..2]` | 一画素右へ進むときの辺関数の増分 |
| `wYInc[0..2]` | 一行進むときの辺関数の増分 |
| `color` | 開始位置のRGBA |
| `colorXInc`, `colorYInc` | 右・次行へ進むときの色増分 |
| `depthZw`と増分 | depthとwの開始値・増分 |
| `texStq`と増分 | texture座標s,t,qの開始値・増分 |

四頂点が同じ赤なら、各三角形の色増分は原理上0に近く、開始色は赤になる。RTLは画素ごとに複雑な重み付き和を最初から計算せず、開始値へ一定の増分を加えていく。

### O.8 `TriangleStreamCmd`が内側の命令を作る

`TriangleStreamCmd`は、先頭に「三角形stream」というoperationを置き、その後へ`TriangleDesc`の語を並べる。`RIXDisplayListAssembler`は、設定命令、Framebuffer命令、三角形命令を順番にdisplay listへ書く。

display listは、画面に表示する一覧という意味ではない。描画回路が順に実行する命令とデータの列である。CPUメモリ上に一度まとめるため、作成側と送信側の速度差を吸収し、複数の命令を一括して転送できる。

### O.9 `DeviceDataUploader`が外側の命令を付ける

内側のdisplay listだけでは、`FrameStreamingCore`は、その列を描画器へ渡すのかDDR3へ保存するのか判断できない。`DeviceDataUploader`は、転送先、転送元、バイト数、必要ならメモリアドレスを持つ外側のヘッダを追加する。display listを描画器へ送る場合、外側は`OP_STREAM`となる。

この外側の命令は、付録Pで説明する`FrameStreamingCore`用である。そのペイロードに、`CommandParser`が読む内側の命令が入る。図P.1の三層を混同しない。

### O.10 WallyがAPBレジスタへ一語ずつ書く

本研究の`WallyBusConnector.hpp`は、転送列を32 bit語に分け、RasterIX用APB領域の`CMD`または`CMD_LAST`へ書く。通常の語は`CMD`、転送の最後の語は`CMD_LAST`へ書く。最後を別レジスタにすることで、`TLAST`に相当する境界をRTLへ伝える。

CPU側20 MHzとRasterIX側100 MHzの間には非同期FIFOがある。FIFOが一時的に満杯ならAPBの`PREADY`を下げ、CPUの書込み完了を待たせる。したがって、CPUが書込み命令を実行したことと、RasterIXがその語を解読し終えたことは同じ時刻ではない。

### O.11 FPGA内で画素が生まれる

外側の`FrameStreamingCore`がpayloadをrenderer用streamへ渡し、内側の`CommandParser`が三角形streamを`Rasterizer`用入力へ送る。`Rasterizer`は境界箱を走査し、三辺の辺関数が内側を示す画素について、座標、index、補間器への制御を出す。

`AttributeInterpolatorX`は、その画素の色、深度、texture座標を増分で更新する。本例ではtextureなどが無効なので、`PixelPipeline`は元の赤をほぼそのまま次へ渡す。`PerFragmentPipeline`では無効な試験を通過し、赤がcolor bufferへ書かれる。

### O.12 内部Framebufferから画面へ出る

本構成では、一つの帯を内部Framebufferへ描く。帯が完成すると`COMMIT`によりDDR3上の外部color bufferへ書き出す。五帯がそろって一枚の640×480画像となる。`SWAP`命令は、その外部画像を次の表示先にするよう依頼する。

表示回路はDDR3からRGB565の画素を読み、DVI形式の映像信号をHDMI OUT端子へ送る。RasterIXが画素を書き終えた時点と、表示回路が新しい画像へ切り替えた時点と、ディスプレイがその画素を発光した時点は異なる。

### O.13 この経路を自分で追う課題

次の順でソースを開き、各段で「入力の型」「出力の型」「保存場所」を一行ずつ記録する。

```text
VertexQueue.hpp
  ↓
VertexPipeline.cpp
  ↓
PrimitiveAssembler.cpp
  ↓
Rasterizer.cpp
  ↓
TriangleStreamCmd.hpp
  ↓
RIXDisplayListAssembler.hpp
  ↓
DeviceDataUploader.cpp
  ↓
FrameStreamingCore.v
  ↓
CommandParser.v
  ↓
Rasterizer.v
  ↓
AttributeInterpolatorX.v
  ↓
PixelPipeline.v
  ↓
PerFragmentPipeline.v
  ↓
InternalFramebuffer.v
```

答え合わせでは、単にファイル名が並んでいるかを見ない。例えば`Rasterizer.cpp`の出力は画素列ではなく三角形記述子、`Rasterizer.v`の出力は画素位置を伴うstreamである、と役割の違いを言えることが重要である。

## 付録P 三層の命令とbit配置を読む

### P.1 「描画命令」を一種類だと思わない

本システムでは、少なくとも三種類の命令が連続して現れる。図P.1の①はWallyが実行するRISC-V機械命令、②はRasterIXの転送器が解読する外側の命令、③は描画器が解読する内側の命令である。

![図P.1 同じ命令という語で呼ばれる三つの別物](figs/rix-three-command-layers.png)

例として、C++の配列にあるdisplay listを描画器へ送る場合を考える。Wallyは①の`store`を繰り返し、APBレジスタへ32 bit語を書く。その列の最初には②の`OP_STREAM`ヘッダがある。そのペイロードの先頭には③の設定命令や三角形命令がある。①、②、③はすべて32 bitの語を含み得るが、解読する回路とbit配置が異なる。

### P.2 Wally側APBレジスタの役割

本研究の`rasterix_apb`は、RasterIXのstreamをCPUから扱えるよう、次のレジスタを持つ。offsetはRasterIX用APB領域の先頭からの距離である。

| offset | 名前 | CPU操作 | 意味 |
|---:|---|---|---|
| `0x00` | CMD | write | 通常の命令語をFIFOへ入れる |
| `0x04` | CMD_LAST | write | 最後の語を入れ、`TLAST`を付ける |
| `0x08` | STATUS | read | command受付可、response有、busyを読む |
| `0x0c` | ID | read | 識別値`RIX1`を読む |
| `0x10` | FRAME_COUNT | read | 表示切替完了回数を読む |
| `0x14` | FRAME_ADDR | read | 現在の表示用アドレスを読む |
| `0x18` | RESPONSE | read | 応答FIFOの先頭を取り出す |

`STATUS`を読むだけでは応答FIFOを消費しない。`RESPONSE`を読むと、その値をCPUへ返すと同時に先頭を取り出す。この違いは付録Iの図I.6で説明した。

### P.3 外側の転送ヘッダ

`DeviceDataUploader`とRTLの`FrameStreamingCore`は、データをどこからどこへ何byte運ぶかを共有する。先頭32 bitは、送信先channel、送信元channel、byte数を含む。メモリが関係する操作では、次の32 bitが先頭addressになる。その後にpayloadが続く。

![図P.2 FrameStreamingCoreへ渡す外側の転送ヘッダ](figs/rix-outer-stream-header.png)

公式実装では、上位nibbleで用途を区別する定数として`OP_STORE`、`OP_LOAD`、`OP_STREAM`が使われる。概念上の関係は次である。

| 外側operation | 転送の向き | 代表用途 |
|---|---|---|
| `OP_STREAM` | stream入力から別streamへ | display listをrendererへ渡す |
| `OP_STORE` | stream入力からメモリへ | textureや命令用データをDDRへ保存する |
| `OP_LOAD` | メモリからstream出力へ | DDRのデータを読み出す |

channel番号には内部経路、stream 0、stream 1、memoryなどが割り当てられる。Wallyから入るraw streamはST0で受け、renderer側のST1へ流す。定数名だけで向きを推測せず、`DeviceDataUploaderCommands.hpp`と`FrameStreamingCore.v`のsource／destination選択を照合する。

### P.4 `FrameStreamingCore`の状態機械

`FrameStreamingCore`は、概ね`IDLE`、`COMMAND`、`ADDR`、`STREAM`を進む。転送先が受け取れないときは`STREAM_PAUSED`相当の状態で未転送の一語を保持する。

| 状態 | 読むもの | 決めること |
|---|---|---|
| IDLE | 転送開始 | 新しい転送を始めるか |
| COMMAND | 第1語 | source、destination、長さ |
| ADDR | 第2語 | memory先頭address |
| STREAM | payload | 指定先へ何語転送したか |
| STREAM_PAUSED | 保持中の一語 | destination再開まで待つ |

長さを32 bit語数だけでなくbyte数として持つのは、memory busの幅や末尾の有効byteを扱うためである。AXI側では`LinearAddressGenerator`がburstを作る。公式構成はAXI3互換の制限も考慮し、境界をまたぐ転送を分割する。

### P.5 内側の描画命令の共通形式

`CommandParser`が読む内側の命令は、32 bitの上位4 bitをoperation、下位28 bitをimmediateとする。operationごとに、immediateの意味と後続語数が異なる。

```text
bit 31                         bit 28 bit 27                    bit 0
+-----------------------------------+------------------------------+
|           operation 4 bit         |       immediate 28 bit       |
+-----------------------------------+------------------------------+
```

| operation | 名前 | 後続データ |
|---:|---|---|
| 0 | NOP | なし |
| 1 | RENDER_CONFIG | register値一語 |
| 2 | FRAMEBUFFER | immediate内の制御bit |
| 3 | TRIANGLE_STREAM | 三角形記述子 |
| 4 | FOG_LUT_STREAM | fog用table |
| 5 | TEXTURE_STREAM | texture page情報 |

operation番号は`rtl/RasterIX/RegisterAndDescriptorDefines.vh`を基準にする。C++側では`lib/gl/renderer/commands/Op.hpp`と各command classが同じ約束を作る。一方だけを変更すると、C++が送る意味とRTLが読む意味がずれる。

### P.6 設定registerは「物理アドレス」ではない

`RENDER_CONFIG`のimmediateには、RasterIX内の設定register番号が入る。続く一語が設定値である。これはWallyのAPB addressではない。APB addressは命令streamへ語を入れる入口、render config registerはそのstreamの中で指定する描画器内部の宛先である。

基準版の設定項目は次のように分類できる。

| 分類 | 主なregister | 何を決めるか |
|---|---|---|
| 機能有効化 | FEATURE_ENABLE | fog、blend、depth、alpha、stencil、scissor、TMU、logic op |
| 初期化値 | COLOR_CLEAR、DEPTH_CLEAR | clear時に入れる値 |
| fragment処理 | FRAGMENT_PIPELINE、STENCIL | 比較関数、参照値、mask、blend、logic op |
| 画面範囲 | SCISSOR_START／END、Y_OFFSET、RESOLUTION | 対象範囲、帯の位置、横幅・高さ |
| texture | TMU_CONFIG、TMU_ENV、TMU_COLOR | 大きさ、wrap、filter、format、合成式 |
| memory | COLOR／DEPTH／STENCIL_ADDR | 外部bufferのaddress |

公式定義には19個の設定registerがある。各bit位置は`RegisterAndDescriptorDefines.vh`にまとまっている。設定を追加するときは、C++側のcommand生成、RTL側のregister bank、初期値、試験を同時に変更する。

### P.7 FEATURE_ENABLEのbitを読む

FEATURE_ENABLEは、各機能を一つずつ有効化する。代表的にはfog、blend、depth test、alpha test、stencil test、scissor、TMU0、TMU1、logic opがある。`1`なら必ず最終画像が変わるとは限らない。例えばblendを有効にしても、blend factorがsourceのみを選ぶ設定なら見た目は変わらない。

回路では、機能を無効にしたときに段全体を取り除くparameterと、実行時にその機能をbypassするregisterがある。前者は合成時に回路規模を変え、後者は同じbitstream上で動作を変える。二つを区別する。

### P.8 FRAMEBUFFER命令のbit

FRAMEBUFFER命令は、immediateの各bitで複数の操作を指定する。

| bit | 意味 | 本構成での代表例 |
|---:|---|---|
| 0 | COMMIT | 内部の帯をDDR3へ書き出す |
| 1 | MEMSET | 内部領域をclearする |
| 2 | SWAP | 完成した外部画像を表示先へ依頼する |
| 3 | READ | DDR3の帯を内部へ読み戻す |
| 4 | COLOR_SELECT | color bufferへ命令を適用 |
| 5 | DEPTH_SELECT | depth bufferへ命令を適用 |
| 6 | STENCIL_SELECT | stencil bufferへ命令を適用 |
| 7 | VSYNC_ENABLE | 表示同期を待つ指定 |
| 8以降 | SIZE | 対象画素数 |

複数のbufferを同時にclearする場合、COLOR、DEPTH、STENCILの選択bitを組み合わせる。SWAPは内部BRAMの前後を入れ替える操作ではなく、外部color bufferの表示切替要求と結び付く。

### P.9 三角形記述子の語数

三角形streamの後続データは、固定部分30語と、TMU一個につき9語からなる。公式が最大二TMUを扱う形では48語、Wally構成の`TMU_COUNT=1`では39語になる。したがって、「三角形は常に48語」と覚えると本設定とずれる。

| 部分 | 32 bit語数 | 内容 |
|---|---:|---|
| reserved | 1 | alignment用 |
| bounding box | 2 | 四つの16 bit境界値 |
| 三辺の初期値 | 3 | w0, w1, w2 |
| 三辺のX増分 | 3 | 一画素右への増分 |
| 三辺のY増分 | 3 | 一行への増分 |
| 色の開始・X増分・Y増分 | 12 | RGBAを三組 |
| depthの開始・X増分・Y増分 | 6 | zとwを三組 |
| texture一個 | 9 | s,t,qを三組 |

実際のbyte数は`sizeof(TriangleDescX)`と構成parameterから決まる。C++の構造体は`#pragma pack`を使い、RTLのregister配置と一致させる。compilerや型を変える場合は、構造体のpaddingを必ず確認する。

### P.10 `TLAST`とsizeは別の役割を持つ

sizeは何語または何byteを処理するかを示し、`TLAST`はstream上の一まとまりの終端を示す。正常な列では両者が一致するよう生成するが、意味は同じではない。sizeが間違えばstate machineが早く終わるか余分な語を待つ。`TLAST`が間違えばpacket境界の扱いが崩れる。

Wally側では、最後の語だけ`CMD_LAST`へ書くことで非同期FIFOの`tlast`を1にする。ここを単にすべて`CMD`へ書くと、32 bit値自体は届いても終端情報が失われる。

### P.11 一つの具体的な転送を分解する

三角形一個を描くdisplay listが、設定命令二語と三角形command一語、Wally構成の記述子39語からなると仮定する。内側は合計42語、168 byteである。外側の`OP_STREAM`は、この168 byteをST0からrenderer側ST1へ送ると指定する。CPUは外側のヘッダと内側42語を、APBへ順に書く。

ここで数えた42語は説明用の最小例である。実際のdisplay listにはFramebuffer操作、複数三角形、状態変更などが入る。また外側のヘッダ形式によってaddress語の有無も変わる。計測では、推定語数と実際のbus write回数を分けて記録する。

### P.12 命令列が壊れたときの症状

| 症状 | 最初に疑う層 | 確認するもの |
|---|---|---|
| IDは読めるが描画が始まらない | APBから外側stream | CMD write、FIFO valid／ready、TLAST |
| memory転送だけ失敗 | 外側命令 | source、destination、address、length |
| 一個目は描けるが次で停止 | 内側のsize／終端 | CommandParser state、streamCounter |
| 色設定だけ無視される | render config | register番号と続く値 |
| 三角形の形が壊れる | descriptor配置 | C++構造体size、固定小数点、語順 |
| swapだけ終わらない | FRAMEBUFFER命令 | swap bit、`fb_swapped`、表示handshake |

症状から一つの層へ絞り、そこで入力と出力を観察する。すべてのsignalを一度に波形へ追加すると、重要な境界を見失う。

### P.13 命令形式を変更するときの原則

新しいrender registerを追加する場合、少なくとも次を同じ変更単位として扱う。

1. `RegisterAndDescriptorDefines.vh`へbit位置またはregister番号を追加する。
2. C++側の対応定義とcommand生成を追加する。
3. `CommandParser`またはregister bankが値を受け取るようにする。
4. 使用するmoduleへ信号を配線する。
5. reset時の既定値を決める。
6. C++のcommand encode試験とRTLのdecode試験を加える。
7. 古い命令列との互換性が必要か決める。

番号を一方でずらすだけの変更は、合成には成功しても画面を壊す。命令はソフトウェアとRTLのABIであると考える。

## 付録Q CPU側で三角形記述子を作る

### Q.1 CPU側処理を理解する理由

RasterIXのRTLだけを読んでも、入力される数値がなぜその値なのかは分からない。辺関数の初期値、色の増分、textureの`s,t,q`は、CPU側のC++が頂点から計算している。RTLの挙動を変更するには、どこまでが事前計算で、どこからがhardware計算かを理解する必要がある。

本設定では、C++側の主な流れは次である。

```text
OpenGL風API
  → VertexQueue
  → RenderObj
  → VertexPipeline
  → PrimitiveAssembler
  → 頂点変換・clipping・viewport
  → Rasterizer.cpp
  → TriangleStreamCmd
  → DisplayList
```

### Q.2 OpenGLのstate machineとして読む

OpenGL風APIは、各関数が独立した完全な命令ではなく、「現在の状態」を更新しながら頂点へ関連付けるstate machineである。現在色、現在のtexture座標、行列、blend設定などが保持され、後の描画に使われる。

例えば次の二つは結果が異なる。

```cpp
glColor3f(1, 0, 0);
glVertex2f(0, 0);
glColor3f(0, 0, 1);
glVertex2f(100, 0);
```

最初の頂点は赤、次の頂点は青を持つ。三角形の第三頂点を緑にすれば、内部のfragmentは三頂点の色を補間したgradientになる。「色の関数を呼んだ場所に色が描かれる」のではなく、その後に追加する頂点の属性が変わる。

### Q.3 `RenderObj`が配列の読み方を保存する

`RenderObj`は、頂点値だけでなく、配列が有効か、要素数、型、stride、pointer、indexの有無、描画modeを持つ。strideは、一頂点分進むと次の同種属性まで何byte移動するかを表す。0なら実装が要素sizeから連続配置として扱う。

この抽象化により、`glBegin`／`glEnd`で作った内部配列と、client vertex arrayから渡した配列を同じ`VertexPipeline::drawObj`へ流せる。VBOを使う場合も、最終的にこの実装がどこから頂点をfetchし、CPU上の変換をどこまで残すかを確認しなければ性能を判断できない。

### Q.4 頂点一個に付随する値

`VertexPipeline::fetch`は、position、normal、color、point size、各TMUのtexture coordinateを一つの`VertexParameter`へまとめる。positionだけを処理しているわけではない。

| 属性 | 代表的な成分 | 二次元長方形での例 |
|---|---|---|
| position | x, y, z, w | xとyを変え、zとwは一定 |
| color | r, g, b, a | 四頂点を同じ赤 |
| normal | x, y, z | lighting無効なら結果へ影響しない |
| texture | s, t, r, q | textureなしならTMU無効 |
| point size | 大きさ | QUADSでは未使用 |

無効な機能の属性も型には存在するが、実行時のfeature enableにより後段でbypassできる。型に存在することと、回路がそのframeで有効に使うことを分ける。

### Q.5 座標が通る空間

頂点位置は、一般に次の空間を順に通る。

| 空間 | 主な変換 | 何を表すか |
|---|---|---|
| object | model座標 | 部品自身の基準位置 |
| eye | model-view | cameraから見た位置 |
| clip | projection | 視野範囲と同次座標 |
| normalized device | wで除算 | おおむね−1から1の範囲 |
| window | viewport | 画面上のx、y、depth |

二次元ゲームでは、object座標を画面画素に近い値として使い、正投影でwindow座標へ対応させられる。しかしclippingは依然必要である。画面外へはみ出した長方形をそのまま巨大なbounding boxとしてRasterizerへ渡すと、範囲外addressを作る危険がある。頂点pipelineは、視野内に残る部分を作ってから画面座標へ移す。

### Q.6 primitive assemblyを詳しく読む

`PrimitiveAssemblerCalc`は、queueへ入った頂点を、三角形、線、点へ組み立てる。`TRIANGLES`は三頂点ごと、`TRIANGLE_STRIP`は新しい一頂点ごと、`TRIANGLE_FAN`は最初の頂点を共有して三角形を作る。`QUADS`は四頂点ごとに二三角形を作る。

`TRIANGLE_STRIP`で偶数・奇数ごとに頂点順を入れ替えるのは、表裏を決めるwindingの向きをそろえるためである。辺関数の符号は頂点順に依存する。本実装は最終的にareaの符号を正規化するが、primitive組立て側も一貫した順を保つ。

### Q.7 画素中心と固定小数点座標

CPU側`Rasterizer.cpp`は、画面座標を小数部5 bitの固定小数点へ変換する。1画素は32という整数差で表され、0.5画素は16で表される。ただし、「各画素の中心へ常に0.5を足して辺関数を評価する」という実装ではない。辺関数の開始点は整数画素座標`(bbStartX×32, bbStartY×32)`であり、0.5画素の定数16は主にbounding boxの整数化へ使われる。Breakout側は別に`glTranslatef(-0.5, 0.5, 0)`を適用し、アプリケーション上の半画素中心とRasterIXの整数sample格子を合わせている。

固定小数点は、「小数が使えない」という意味ではない。整数の下位bitを小数部と決める表現である。例えば小数部5 bitなら次となる。

| 実数 | 保存整数 | 解釈 |
|---:|---:|---|
| 0.0 | 0 | 0÷32 |
| 0.5 | 16 | 16÷32 |
| 1.0 | 32 | 32÷32 |
| 3.25 | 104 | 104÷32 |

この形式により、RTLは多くの位置計算を整数加算として実装できる。浮動小数点からの変換式は、実装上`static_cast<int32_t>(value×32+0.5)`である。C++の整数変換は0方向へ切り捨てるため、正数の四捨五入と同じ規則を負数へ対称に適用したものではない。例えば`-1.0→-31`、`-0.5→-15`、`-1/32→0`となる。付録X.7で、この非対称性と影響範囲を表にする。

### Q.8 辺関数の意味

二点AとBが作る向き付きの辺に対し、点Pがどちら側にあるかを次で調べる。

```text
E(A,B,P) = (Px − Ax)(By − Ay) − (Py − Ay)(Bx − Ax)
```

三角形の三辺についてEを求め、頂点順に合わせて符号を正規化すると、三つが0以上の点を内側として扱える。E=0は辺上である。実装では三辺の値を`w0,w1,w2`と呼ぶ。

三角形の向きを逆にすると、すべての符号が逆になる。CPU側は三頂点からareaを求め、その符号に応じて`sign`を選び、areaと各辺関数を同じ向きへそろえる。areaが0なら三点が一直線上などの退化三角形なので描画しない。

### Q.9 一画素ごとに掛け算し直さない

辺関数はxとyに関する一次式である。Pを一画素右へ動かしたときの変化量は常に同じで、次の行へ動かしたときの変化量も常に同じになる。CPU側は三辺について`wXInc`と`wYInc`を一度計算する。RTLは開始位置の`wInit`へ増分を加える。

```text
w(x + 1, y) = w(x, y) + wXInc
w(x, y + 1) = w(x, y) + wYInc
```

これが、CPU側で辺関数を事前計算する主な理由である。RTLに三頂点を渡して毎画素の乗算をさせるより、加算器で一画素ずつ進めやすい。

### Q.10 bounding boxの役割

三角形が画面全体を覆わない場合、全画素で辺関数を試す必要はない。三頂点の最小x、最大x、最小y、最大yから外接する長方形を作り、その範囲だけを走査する。これがbounding boxである。

bounding box内にも三角形外の画素はあるため、範囲を作るだけで塗る画素が確定するわけではない。各位置で三辺の判定を行う。CPU側の`Rasterizer.cpp`は、scissorと全く重ならない三角形を早期に捨てるが、`TriangleDesc`へ既に保存したbounding boxをscissor範囲へ書き換えない。画素単位の半開区間`start <= p < end`による除外は、後段のRTL `FramebufferScissor.v`が行う。したがって、「CPU側が記述子のbounding boxをscissorへ切り詰める」という説明は正しくない。

### Q.11 barycentric weightと属性補間

三辺の辺関数を三角形areaで割ると、各頂点の影響割合として使える。ここでは`λ0, λ1, λ2`と書く。三つの和は概ね1になる。各頂点の赤成分を`R0,R1,R2`とすると、点Pの赤は次で求められる。

```text
R(P) = λ0 R0 + λ1 R1 + λ2 R2
```

色だけでなく、depthやtexture用の値も同じ考え方で補間する。CPU側はbounding box開始位置における値と、x・y方向の増分を作る。図Q.1は、値を毎画素の増分で更新する考えを示す。

![図Q.1 色や深度を初期値と一定の増分で求める](figs/rix-attribute-increments.png)

四頂点が同じ赤の長方形では、三角形内の三頂点色も同じなので、色のX増分とY増分は0になる。異なる色ならgradientになる。

### Q.12 texture座標とperspective correctionの準備

画面上でsとtをそのまま線形補間すると、遠近のある面でtextureが不自然に歪む。perspective divide後の頂点第四成分を`r_i=1/w_clip,i`、同次texture座標を`(s_i,t_i,q_i)`、画面上のbarycentric weightを`λ_i`と書く。CPU側は各頂点で`(s_i r_i, t_i r_i, q_i r_i)`を作り、RTLはそれぞれを線形補間する。fragmentで使う座標は次である。

```text
s_fragment = Σ(λ_i s_i r_i) / Σ(λ_i q_i r_i)
t_fragment = Σ(λ_i t_i r_i) / Σ(λ_i q_i r_i)
```

`glTexCoord2f`では`q_i=1`なので、標準的なperspective-correct interpolationになる。RTLの`q`はtexture座標の第四成分とclip-space wの両方を含む値であり、単に頂点のwそのものではない。

二次元正投影で各頂点の`r_i`と`q_i`が同じなら、分子と分母の共通倍率が消え、結果はsとtの通常の線形補間になる。しかし同じ汎用回路を通るため、固定小数点変換や逆数pipelineは構成上残る。固定小数点経路ではCPU側が三頂点の`r_i`ベクトルをEuclidean normで正規化するが、その共通倍率も上式の分子と分母で相殺される。

### Q.13 浮動小数点から固定小数点への変換

CPU側の`TriangleDesc`は浮動小数点成分を持つ形があり、Wally構成のhardwareは固定小数点補間器を使う。`TriangleStreamF2XConverter`は、streamされた値をhardwareの形式へ変換する。代表的な形式は次である。

| 値 | 入力形式 | 意味 |
|---|---|---|
| texture s,t,q | S3.28 | 符号1、整数部3相当、小数部28 |
| depth z,w | S1.30 | 小数精度を多く持つ |
| color r,g,b,a | S7.24 | 補間中の範囲に余裕を持つ |

表記中のSはsignedを表す。本付録では、例えばS3.28を「符号1 bit、整数3 bit、小数28 bit、合計32 bit」と読む。このとき範囲は`-8`から`8−2^-28`、刻みは`2^-28`である。S1.30は`-2`から`2−2^-30`、S7.24は`-128`から`128−2^-24`となる。

`TriangleStreamF2XConverter.v`はtexture、color、depthについてそれぞれoffset `-28`、`-24`、`-30`を`FloatToInt.v`へ渡す。変換器は最初に捨てるbitが1なら絶対値へ1を足し、その後に負号を適用する。これはties-to-evenではない。表現範囲を越えた場合は飽和せず0を出す。固定小数点化後の属性更新も32 bitであり、加算overflowを検出して飽和する回路はない。正しい結果には、入力と増分が範囲内に収まるという前提が必要である。

さらに、右shift量が0のとき、公式sourceは存在しない`shiftSize-1`番bitを丸めbitとして読む。未変更RTLの4値simulationでは不定値が現れたが、Nexys Videoと同じArtix-7へVivado 2025.2で合成した後のshift 0代表値は期待値と一致した。これとは別に、非常に小さい正規化floatでは真のshift量が5 bitへ切り詰められ、仮数bitを誤って丸めbitにする。正負の例は合成後にも±1となった。Breakout相当の単色四角形と文字の代表descriptorはこの極小値域へ入らなかった。式、入力下限、case、再実行手順は付録Y.3と付録Z.7に示す。

正規化有限値の不偏指数を`e`、出力の小数bit数を`F`、`p=e+F`と置くと、全24 bit仮数に対してsource算術を形式確認できた範囲は`-8<=p<=22`と`24<=p<=30`である。`p=23`は上記のshift 0境界、`p<-8`は極小値alias、`p>=31`は0を返すoverflow経路になる。この区分は「固定小数点形式の最大・最小だけを守れば十分」という意味ではなく、変換器固有の入力契約も必要であることを示す。

### Q.14 画面を帯に分けるときの記述子調整

RasterIX_IFは、画面の一部の帯だけを内部Framebufferへ描く。三角形が現在の帯と重ならなければ、その帯のdisplay listへ入れない。上の帯から続く三角形なら、帯の開始行まで進んだ分だけ`wInit`、color、depth、textureの開始値をY増分で更新する。

`Rasterizer::increment`は、この調整を行う。例えば三角形のbounding boxがy=70から140までで、現在の帯がy=96から191なら、26行分のY増分を開始値へ加える。これにより、内部Framebufferの先頭行から描き始めても、画面全体でy=96の属性値になる。

### Q.15 display listを二組持つ理由

Threaded構成では、CPU側が次のdisplay listを作る間に、前のdisplay listを転送・実行できるよう、各帯について二組のbufferを使う。これは画面のfront bufferとback bufferとは別である。display list bufferは命令列を保存し、color bufferは完成画素を保存する。

一組目と二組目の意味は、同じ帯の命令列を交互に作るためであり、帯が十本あるという意味ではない。五帯×二組に転送用領域を加えた構成は付録Hと本文第9章で説明した。

### Q.16 CPU側で異常を切り分ける方法

RTLへ送る前の`TriangleDescX`を記録できれば、画像異常をCPU側とRTL側へ分けやすい。

| 観察値 | 正常条件の例 | 異常なら疑う場所 |
|---|---|---|
| bounding box | 画面変換後の三頂点を囲む候補範囲（scissorによる画素maskの前） | viewport、clipping、固定小数点化 |
| area | 0でない | 頂点重複、頂点順、変換 |
| w初期値・増分 | 画素移動で一貫して変化 | edge function計算 |
| 一様色の増分 | おおむね0 | color配列、補間準備 |
| 一定q | 二次元正投影なら頂点間で同じ | projection、wの扱い |
| command size | 構成の構造体sizeと一致 | pack、TMU_COUNT、compiler ABI |

同じ記述子をsoftware rasterizerとRTL simulationへ入力し、両者の画素集合を比較すると、境界規則の差を検出できる。

### Q.17 記述子dumpを照合するときの手順

CPU側の記述子を保存するだけでは、まだ「正しい数値か」を判断できない。まず一様色でtextureを使わない小さな三角形を一つだけ送り、C++が生成した各fieldを、送信した32 bit語と対応付ける。次にRTL simulationの`CommandParser`が同じ語を同じregisterへ格納したかを見る。この二段階で一致すれば、CPU側の構造体からstream、streamからRTL registerまでのbit配置が一致したと判断できる。

確認順序は次のとおりである。

1. `TriangleDescX`の各field名、bit幅、符号の有無を表にする。
2. C++側でfieldの値と、送信直前の32 bit語列を16進数で記録する。
3. RTL側で、各handshake時の`data`、語番号、格納先registerを記録する。
4. 一つのfieldが複数語にまたがる場合は、上位・下位の順序を確認する。
5. signed値は16進数だけでなく、符号拡張後の十進値でも比較する。
6. 一致後にだけ、複数TMU、texture、gradientなどfield数の多い入力へ広げる。

この照合で、C++側の`sizeof`が合うことだけを根拠にしない。構造体padding、TMU数、parameterで無効になったfield、Verilog側のslice位置のいずれかが違っていても、全体sizeが偶然一致する可能性がある。field単位の既知値を使うと、語順の入替えも見つけられる。

## 付録R RTL全体の制御と停止を読む

### R.1 hardware pipelineの全体順序

`RasterIXRenderCore.v`は、描画器の中心である。固定小数点補間を使うWally構成では、概ね次の順にfragmentが進む。

```text
CommandParser
  → triangle register bank／F2X converter
  → Rasterizer
  → ValueTrackとstream broadcast
  → AttributeInterpolatorX
  → PixelPipeline
  → 既存color／depth／stencilとのStreamConcatFifo
  → PerFragmentPipeline
  → color／depth／stencil framebuffer write
```

texture dataは別経路から`TextureBuffer`へ入り、`PixelPipeline`内のTMUが読む。render configも別のregister bankへ入り、複数段の制御入力となる。

### R.2 `CommandParser`の三状態

`CommandParser`には、主に`WAIT_FOR_IDLE`、`COMMAND_IN`、`EXEC_STREAM`がある。図R.1は役割を簡略化したものである。

![図R.1 CommandParserの三状態と次の命令を受ける条件](figs/rix-command-parser-fsm.png)

`WAIT_FOR_IDLE`では、前の三角形、framebuffer操作、TMUの準備などが終わるのを待つ。`COMMAND_IN`でoperationを解読する。三角形やtextureのように後続streamがある場合、`EXEC_STREAM`で指定先へpayloadを渡す。payloadが終わると次のcommandへ戻る。

### R.3 なぜ前の仕事の終了を待つのか

次の三角形のregisterを上書きした時点で、前の三角形のfragmentがまだpipelineに残っていると、前の画素が新しい色や増分を使う危険がある。またFramebufferをclear中にfragmentを書けば、clearと描画の順序が壊れる。

そのため`CommandParser`は、Rasterizerだけでなく、pipeline内の未完了画素、Framebuffer command、texture準備の状態も見て開始を制御する。単に「CPUが遅いから待たなくてよい」とは言えない。CPUが次のcommandをいつ送れるかと、内部pipelineに前の仕事が残るかは別問題である。

### R.4 `ValueTrack`が防ぐread-after-write衝突

同じ画素へ連続して二三角形が描かれる場合、後の三角形がFramebufferの古い色やdepthを読んだ後、前の三角形の書込みが遅れて到着すると、順序が逆転する可能性がある。`ValueTrack`はpipeline内の画素数を追跡し、新しい三角形の開始条件を制御する。

これはCPUのregister hazardに似ているが、対象は画素のFramebuffer readとwriteである。公式`design.md`は、前のtriangleのpixelがpipelineを流れている間に次のtriangleを開始するread-before-write conflictを避けるためと説明している。[RasterIX]

### R.5 stream broadcastとconcat

Rasterizerから出た一つのfragment情報は、属性補間器と、color、depth、stencilの読出しへ分岐する。後段では、新しいfragmentの色・depthと、三つの既存値を同じ画素について再結合する必要がある。

`StreamConcatFifo`は、必要な入力がそろうまで待ち、対応する一組として`PerFragmentPipeline`へ渡す。無効にしたbufferの入力はbypassされる。内部Framebufferのread port自体には自由なbackpressureを掛けられないため、read結果を受けるFIFOが必要になる。

### R.6 validとreadyの受渡し

高位module間では、送信側が`valid`、受信側が`ready`を出し、両方が1のcycleに一要素が移る。

| valid | ready | 意味 |
|---:|---:|---|
| 0 | 0または1 | 送信側に有効データがない |
| 1 | 0 | データは提示中だが未受領。保持する |
| 1 | 1 | このcycleに一要素を受け渡す |

受信側が停止すると`ready=0`が上流へ戻る。各段は処理中のfragmentを失わず保持する。図R.2では、右端のFramebuffer側の停止が左へ伝わる。

![図R.2 valid／readyで停止がパイプライン全体へ戻る](figs/rix-valid-ready-pipeline.png)

### R.7 `ce`は低位pipelineの時計を止める許可

高位のvalid／readyを、各演算段内部ではclock enableの`ce`へ変換する。`ce=0`のcycleでは、pipeline registerを更新せず同じ中間値を保持する。物理clockそのものを停止しているのではなく、registerが次の値を取り込まないようにする。

逆数計算や乗算など、複数cycleのpipelineを途中で停止するとき、dataだけでなくvalid、座標、index、lastも同じcycle数だけそろえて停止しなければならない。一つだけ進むと、色と画素addressが別のfragmentの組合せになる。

### R.8 skid bufferが必要な場面

readyが0へ変わる情報には組合せ経路の遅延がある。送信側が停止を認識する直前に一語を出していた場合、その一語を一時保存する場所が必要になる。`CommandParser`はskid bufferを持ち、destinationが受け取れない一語を保持する。

skid bufferは大量の待ち行列ではなく、readyの変化を安全に受ける小さな弾力性である。非同期FIFOと目的が異なる。skid bufferは同じclock領域内の即時停止、非同期FIFOはclock領域間のdata transferと短期bufferingを担当する。

### R.9 `TLAST`とhidden flush fragment

各triangleの最後を示す`last`は、pipelineのすべての段を通る。Rasterizerは、内部pipelineに残る値を最後まで押し出すため、画素として書かない`tkeep=0`の終端要素を出す場合がある。`valid=1`でも`keep=0`なら、その要素はcontrolを進めるがFramebufferへ有効画素を書かない。

したがって、simulationで出力要素数を数えるとき、`valid`だけで画素数としない。`valid && ready && keep`を有効画素の受渡しとして数える。終端確認には`last`も見る。

### R.10 performance信号の意味

上位には`perfBusy`、`perfTriangleRendering`、`perfRasterizerStall`などがある。

| 信号 | 分かること | 分からないこと |
|---|---|---|
| `perfBusy` | command処理がidleでない期間 | どの段が原因か単独では不明 |
| `perfTriangleRendering` | triangle処理が進行中か | 画面全体のFPSではない |
| `perfRasterizerStall` | Rasterizer出力validに対しreadyが0 | downstreamのどの段が根因か |

一つのperformance信号だけでボトルネックを断定しない。例えばRasterizer stallは、TMU、Framebuffer、AXI、またはさらに先の停止がbackpressureで戻った結果かもしれない。段ごとのvalid／readyと一緒に観察する。

### R.11 pipeline latencyとthroughputを分ける

あるfragmentが入力から出力まで進むcycle数をlatency、一度pipelineが満たされた後に一cycle当たり何fragmentを受けられるかをthroughputと呼ぶ。17 cycleの補間器でも、各段がpipeline化されていれば、毎cycle一fragmentを受けられる場合がある。

公式コメントには、固定小数点の属性補正約17 cycle、TMU各部の複数段、PerFragment約4 cycleなどの深さが記されている。ただし機能parameter、bypass、stallで実効latencyは変わる。各数を単純加算して「一画素に何cycle」と評価しない。

### R.12 reset時に確認する状態

state machine、valid register、FIFO pointer、framebuffer commandの`applied`は、reset解除時に一貫したidle状態でなければならない。Wally構成ではCPU、DDR、pixelのclock領域ごとにresetがある。RasterIX本体はDDR側100 MHzで動く。

reset問題を調べるときは、次を順に確認する。

1. DDR clockが安定している。
2. RasterIX側resetが同期して解除された。
3. command FIFOの両側が空を示す。
4. `CommandParser`が`COMMAND_IN`へ入る。
5. Framebuffer commandが未適用状態に残っていない。
6. 最初のcommand受渡しでvalid／readyが同時に1になる。

### R.13 control変更の試験観点

状態機械を変更した場合、正常に連続データを流す試験だけでは足りない。次の停止を挿入する。

| 停止条件 | 期待すること |
|---|---|
| command入力validが途切れる | 受領済みcounterを保持し再開する |
| destination readyが0 | 未転送の語を保持する |
| framebuffer readが遅れる | fragmentと既存値の対応を保つ |
| 最後の一語でstall | lastとdataを保持する |
| resetがpacket途中に入る | 規定のidleへ戻り、古いvalidを出さない |

backpressure試験を行わず、常にready=1だけで通すと、実機の混雑時だけ起きるdata lossを見逃す。

### R.14 一つの命令をcycleごとに追う

状態機械を理解するときは、波形全体を眺めるのではなく、一つの短い命令について「そのcycleで所有権が移ったか」を表にする。次は、header一語とpayload二語を持つ命令を、二語目の直前で受信側が一cycle停止する例である。

| cycle | state | input valid | input ready | input data | destination ready | 起きること |
|---:|---|---:|---:|---|---:|---|
| 0 | `COMMAND_IN` | 1 | 1 | header | 1 | headerを受領し、長さと送信先を記録 |
| 1 | `EXEC_STREAM` | 1 | 1 | payload 0 | 1 | 一語目を転送し、counterを一つ減らす |
| 2 | `EXEC_STREAM` | 1 | 0 | payload 1 | 0 | handshakeなし。dataとlastを保持 |
| 3 | `EXEC_STREAM` | 1 | 1 | payload 1 | 1 | 二語目を転送し、最後として完了 |
| 4 | `COMMAND_IN` | 0 | 1 | ― | 1 | 次のheaderを待つ |

cycle 2で`valid=1`でも`ready=0`なので、payload 1はまだ受領されていない。counterを減らしたり、dataを次へ進めたりしてはいけない。cycle 3で`valid && ready`になった瞬間にだけ、同じ語の所有権が次段へ移る。この原則を入力、出力、Framebuffer read responseの各streamで適用する。

### R.15 制御変更時に置くassertion

目視波形だけでは、低頻度のstallで壊れる条件を見落とす。simulationでは、少なくとも次の不変条件をassertionまたはtestbenchの検査として置く。

| 不変条件 | 検出できる不具合 |
|---|---|
| `valid && !ready`の間、`data`、`keep`、`last`が変化しない | stall中の語の上書き |
| counterは`valid && ready`のときだけ進む | 未受領語の消失、二重転送 |
| packet最後の受渡しと`last`が同じcycleになる | packet境界の一語ずれ |
| `keep=0`の要素でcolor／depthを書かない | flush要素を画素として保存 |
| reset後、古い`valid`と未完了commandが残らない | reset跨ぎの幽霊転送 |
| concatした各streamのindexが一致する | 別fragmentの新旧値の混合 |

assertionが失敗したら、まず失敗cycleの直前から、原因となった最初のhandshakeを見る。後段に現れた壊れた色だけを追うと、数十cycle前の停止条件まで戻ることになり、原因を見失いやすい。

## 付録S hardware Rasterizerと属性補間

### S.1 CPU側RasterizerとRTL側Rasterizerの違い

同じ`Rasterizer`という名前が二箇所にある。

| 実装 | 入力 | 出力 | 主な仕事 |
|---|---|---|---|
| `lib/gl/renderer/Rasterizer.cpp` | 変換済み三頂点 | `TriangleDesc` | 辺関数・属性の初期値と増分を計算 |
| `rtl/RasterIX/Rasterizer.v` | 固定小数点の記述子 | fragment座標stream | 三角形内の画素を列挙 |

CPU側が設計図を作り、RTL側がその設計図に従って画素を歩く、と考える。CPU側の出力が誤っていればRTLは正しく誤った図形を描く。RTL側が誤っていれば同じ記述子をsoftware rasterizerへ渡した結果とずれる。

### S.2 RTL Rasterizerの二つの状態機械

RTLには、全体のcommandを管理する主state machineと、三角形の辺を歩くedge walker state machineがある。主なedge状態は`INIT`、`SEARCH_LEFT`、`WALK_OUT`、`WALK`、`YINC`、`SEARCH_RIGHT`である。

![図S.1 辺関数で三角形の内側を一行ずつ探す](figs/rix-edge-walk.png)

最初に境界箱の一行で左から内側を探し、内側へ入った位置を保存する。右へ進みながら有効fragmentを出し、外へ出たら次の行へ移る。三角形の形に応じて、前の行の左端付近から探すことで、毎行を境界箱の端から完全に探し直す費用を減らす。

### S.3 内側判定

三つの辺関数`w0,w1,w2`はsigned値である。CPU側で向きをそろえた後、符号bitが一つも立っていなければ内側または辺上と判定する。さらにxとyがbounding box内にあることを確認する。

```text
inside = (w0 >= 0) and (w1 >= 0) and (w2 >= 0)
         and x in bounding box and y in bounding box
```

固定したRTLでは`isInTriangle = !(w0[31] | w1[31] | w2[31])`であり、三辺すべてが0以上なら内側とする。0に等しい辺を辺の向きで除外するtop-left規則はない。公式C++記述子生成器とsoftware rasterizerをそのまま呼んだ4×4四角形では、共有対角線の`(0,0)`、`(1,1)`、`(2,2)`、`(3,3)`を二三角形が両方生成した。異なる画素は16個、重複を含むfragmentは20個である。

この結果から言えるのは、「この入力と固定commitでは共有辺が二重に生成される」である。すべての図形で必ず二重になるとは限らず、頂点の固定小数点化とsample格子に依存する。見た目の隙間がないことと、fragmentが一度だけ生成されることも別である。

### S.4 `PUSH`と`POP`の役割

Rasterizerは、属性補間器へ単なる座標だけでなく、増分をどう適用するかのcommandを送る。`RasterizerCommands.vh`には`INIT`、`X_INC`、`X_DEC`、`Y_INC`、`PUSH`、`POP`などがある。

| command | 補間器に求める操作 |
|---|---|
| INIT | 三角形の開始値を読み込む |
| X_INC | x方向増分を加える |
| X_DEC | x方向増分を引く |
| Y_INC | y方向増分を加える |
| PUSH | 現在の左端状態を保存する |
| POP | 保存した左端状態へ戻す |

一行を左端から右端まで描いた後、右端の属性値から次行左端を求めるより、左端で保存した状態へ戻してY増分を加える方が単純である。`PUSH`と`POP`は、この行開始状態の保存・復元を表す。

### S.5 framebuffer indexとy座標

OpenGLの画面座標は左下を原点とする考え方を使う。一方、linearly保存する画像や表示回路は上から下へ読むことが多い。RTL Rasterizerは、概念上次のようにyを反転して一列のindexを作る。

```text
index = ((resolutionY − 1) − y) × resolutionX + x
```

例えば640×480でOpenGL座標`(0,0)`は、memory上では最下行側のoffsetになる。画像が上下反転した場合、頂点変換だけでなく、このindex規則、帯のy offset、表示回路の行順を確認する。

### S.6 `AttributeInterpolationX`の増分更新

`AttributeInterpolationX`は、color、depth、textureの各componentについて、現在値、X増分、Y増分、保存値を持つ。Rasterizer commandに従い、同じcycleで並列に更新する。

```text
INIT  : current = initial
X_INC : current = current + xIncrement
X_DEC : current = current − xIncrement
Y_INC : current = current + yIncrement
PUSH  : saved = current
POP   : current = saved
```

RGBAの四成分、depthのzとw、TMUごとのs,t,qが同じ移動commandを受ける。これにより、画素座標と属性値がずれない。

### S.7 固定小数点のrangeとprecision

固定小数点には、表せる最大範囲と最小刻みのtrade-offがある。32 bitのうち小数部を増やすと細かな値を表せるが、大きな整数を表すbitが減る。RasterIXは属性ごとに異なる形式を選ぶ。

| 属性 | 代表形式 | 重視すること |
|---|---|---|
| texture補間 | S3.28 | 小数精度 |
| depth補間 | S1.30 | 0から1付近の高精度 |
| color補間 | S7.24 | gradient精度と一時的な範囲 |
| 補正後texture座標 | S16.15 | texel index範囲と小数割合 |

形式を変えると、C++変換、descriptor width、RTL slice、乗算結果のshift、test期待値が連鎖して変わる。一つのparameterだけで自由に精度を増やせるとは限らない。

### S.8 遠近補正を段階に分ける

`AttributePerspectiveCorrectionX`は、補間されたqの逆数を近似し、補間済みのs×q、t×qに掛けてsとtを復元する。図S.2は役割だけを示す。

![図S.2 テクスチャ座標の補間と遠近補正](figs/rix-perspective-correction.png)

公式RTLのコメントでは、この固定小数点補正pipelineは17 cycleで、最初の段が逆数計算、次が乗算とformat変換を行う。`XRecip`は反復回数を持つ近似回路であり、数学の無限精度の除算ではない。入力qが0または範囲外のときの扱いは、clippingと入力制約を含めて確認する。

### S.9 色とdepthのclamp

補間途中の色は0未満または最大値より大きくなる可能性がある。出力段では負値を0、上位bitが立つ過大値を最大へclampし、画素色のbit幅へ落とす。depthも16 bitへ変換する。

wrap-aroundで255の次が0になると、三角形端に不自然な色が出る。clampはそれを防ぐ。ただし、どの段で何bitを捨てるかによりrounding errorが生じる。gradientのbandingを調べる場合、最終RGB565だけでなく、この中間量子化も見る。

### S.10 Wally構成が使う補間器

`RasterIX_IF`のparameter`RASTERIZER_ENABLE_FLOAT_INTERPOLATION`は既定で0であり、本研究はoverrideしていない。そのためWally構成は`AttributeInterpolatorX`という固定小数点経路を使う。浮動小数点版`AttributeInterpolator`がsource treeにあっても、本bitstreamの実行経路ではない。

「sourceに存在する」ことと「現在のparameterで生成される」ことを区別するため、`RasterIXRenderCore.v`の`generate`条件と、Wally側`rasterix.sv`のinstance parameterを両方確認する。

### S.11 2D一様色で各段はどうなるか

赤い長方形で四頂点の色、z、wが同じ場合、色・depth・wのX増分とY増分は0になる。Rasterizerは多数の画素を列挙するが、補間器は同じ値を次へ渡す。textureが無効ならs,t,qは最終色に使われない。

この簡単な入力はhardware試験に適している。形が壊れればRasterizer、gradientだけ壊れれば補間器、textureを有効にしたときだけ壊れればTMU以降、と段階的に切り分けられる。

### S.12 Rasterizerのsoftware試験とRTL試験

公式unit testには、software rasterizerについて、単一画素、2×2の四角形、水平・垂直、空三角形、退化境界箱、負の辺関数、index、y offset、帯境界、対角pattern、境界上などの例がある。固定commitでsoftware CTest 9件を実行し、全件成功した。[RasterIX]

一方、`unittest/verilator/cpp/sim_rasterizer.cpp`は実質的に空の`main`で、VerilatorのCTestへRTL `Rasterizer.v`単体試験として登録されていない。Verilator CTest 31件は全件成功し、属性補間、遠近補正、float-to-fixed変換、TextureSampler、FramebufferScissorなどは含むが、RTL Rasterizerの画素集合そのものを網羅する試験にはならない。したがって、本付録では「RTL Rasterizerも公式試験済み」とは主張しない。

これらの試験は、Wallyとの統合全体を証明するものではない。しかし辺関数と走査規則の変更を行うとき、実機だけで異常を探すより小さな反例を早く見つけられる。

### S.13 数値を追う練習

三頂点`A=(0,0)`、`B=(4,0)`、`C=(0,3)`を考える。まずareaを計算し、点`P=(1,1)`について三辺のEを求める。次にPを`(2,1)`へ動かした差が、計算したX増分と一致するか確かめる。最後に、Aが赤、Bが緑、Cが青の場合のbarycentric colorを計算する。

この手計算の目的は、大きなtriangle全体を描くことではない。符号、頂点順、一画素の増分、属性の重みという四点を、RTL信号へ対応できるようにすることである。計算結果がsoftware testと一致した後に波形を見る。

## 付録T textureとPixel Pipeline

### T.1 textureとは何を保存するものか

textureは、図形の表面へ対応付ける画像である。画像の一要素をpixelと区別してtexelと呼ぶ。pixelは画面上の位置、texelはtexture画像内の位置である。一つのpixelを決めるとき、texture座標`s,t`から一つまたは周囲のtexelを読み、その色を頂点色などと組み合わせる。

文字もtextureで描ける。一文字分のbitmapをtextureへ置き、文字を表示する長方形に貼る。複数文字を一枚のtexture atlasへ並べ、各文字の`s,t`範囲だけを選ぶ方法も一般的である。本研究の文字描画でtextureを使うことは、三次元表示を意味しない。

### T.2 textureがhardwareへ届くまで

textureの元画像はCPU側でformat変換され、texture memory managerがdevice memory上のpageを割り当てる。`DeviceDataUploader`は`OP_STORE`によりtexture dataをDDR3へ置く。描画時、texture stream commandは使用するpage addressの列をhardwareへ伝える。

`PagedMemoryReader`はpage addressに従ってAXI readを発行し、現在使うtextureを`TextureBuffer`へ読み込む。`TextureBuffer`はTMUごとに一つあり、一つのtexture全体を保持する設計である。公式説明では代表的に256×256×16 bitで128 KiBとなる。[RasterIX]

| 段階 | 保存場所 | 内容 |
|---|---|---|
| 元画像 | CPU memory／SD card | PNGなどから得た画素 |
| device texture memory | DDR3 | page単位で配置したtexture data |
| TextureBuffer | FPGA内部memory | 現在TMUがsampleするtexture |
| filter出力 | pipeline register | 一fragment分のtexture色 |

### T.3 page方式を使う理由

textureを連続する大領域だけで管理すると、異なる大きさの追加・削除で空き領域が断片化しやすい。page方式では、一定sizeのpageを複数割り当て、texture commandがpage addressを列挙する。hardwareは必要なpageを順に読む。

page size、最大texture size、page数はC++設定とhardware構成の両方に関係する。`RenderConfigs.hpp`は、最大textureのbyte数とmipmap分を考慮して必要page数を計算する。本研究のCMake設定は`NUMBER_OF_TEXTURE_PAGES=4096`、`NUMBER_OF_TEXTURES=256`であるが、これは同時に4096枚のtextureを内部保持する意味ではない。 更新版E6では、1ページ当たりのバイト数を2,048へそろえた。このページサイズと、確保するページの個数4096は別の設定である。

### T.4 一つのTMUの内部順序

`TextureMappingUnit.v`は、概ね次の四段を持つ。

1. `LodCalculator`がmipmap levelを選ぶ。
2. `TextureSampler`が周囲の四texelを読む。
3. `TextureFilter`が必要なら四色を混ぜる。
4. `TexEnv`がtexture色と前段色などを組み合わせる。

公式コメントの代表的なpipeline depthは、LOD 1 cycle、sample 5 cycle、filter 4 cycle、TexEnv 4 cycleで、合計14 cycleである。機能を無効にした場合のgenerateやbypassにより実効経路は変わる。

### T.5 なぜ四texelを同時に読むか

線形filterでは、座標を囲む左上、右上、左下、右下の四texelを使う。整数部が左上texelの場所を、小数部が横・縦の混合割合を決める。

![図T.1 一つの座標の周囲から四つのtexelを読む](figs/rix-tmu-four-texels.png)

texture座標がちょうどtexel中心なら一色の影響が大きい。二texelの中間なら両方をほぼ半分ずつ混ぜる。最近傍filterでは小数部に応じて一色を選ぶ。線形filterは滑らかになるが、乗算・加算と複数read portが必要になる。

### T.6 `TextureBuffer`のmemory構成

一cycleに四texelを得るには、一portの単純RAMを四回読むだけでは毎cycleのthroughputを保てない。`TextureBuffer`と下位RAMは、bankingまたは複数のmemory配置を使い、2×2のtexel quadをまとめて取り出せるようにする。具体的なaddress bitとbank選択は`TextureBuffer.v`、`MipmapOptimizedRam.v`、`TextureSampler.v`で追う。

変更時には、論理上のtexture addressと、各BRAM bankのaddressを分ける。偶数・奇数のs,tによるbank選択を誤ると、縞模様や2画素周期の入れ替わりが生じる。

### T.7 wrapとclamp

texture座標が範囲外へ出たとき、端のtexelに固定するclampと、反対側へ繰り返すrepeatがある。texture widthとheightは2の冪として設定され、maskや上位bitを使ったaddress生成を簡単にする。

四texel samplingでは、右端または下端で隣のtexelを読む場合もwrap／clampを適用する必要がある。中心座標だけを範囲内へ直し、隣接addressをそのまま増やすと、端で別行や別memory領域を読む。

### T.8 mipmapとLOD

mipmapは、元textureを段階的に縮小した画像群である。画面上でtextureが小さく見えるとき、元の高解像度から少数sampleを選ぶとaliasingが出る。LODは、どの縮小levelを使うかを決める値である。

RasterIXの`LodCalculator`は、現在のtexture座標と画面上で一画素ずらした位置の座標差から変化量を推定する。mipmap機能を無効にした構成では、この計算をbypassできる。二次元の等倍spriteではlevel 0だけで足りる場合が多いが、拡大縮小を行うならfilterとLODの見た目を確認する。

### T.9 `TexEnv`が色を組み合わせる

sampleしたtexture色をそのまま出すとは限らない。`TexEnv`は、texture色、頂点から補間したprimary color、前のTMUの色、constant colorをsourceとして、replace、modulate、addなどの演算を行う。

例えば白い文字glyphのalphaをtextureに持ち、頂点色を赤にすると、texture alphaで形を決め、RGBは赤にできる。逆にtexture RGBをそのままreplaceすれば、元画像の色を使う。

### T.10 一つのTMUを使う本構成

Wally側のinstanceは`TMU_COUNT=1`である。`PixelPipeline`はTMU0を通り、二個目のTMU経路は構成に応じて生成されないかbypassされる。C++側も同じ`RIX_CORE_TMU_COUNT=1`でbuildする必要がある。

hardwareだけ2、softwareだけ1にすると、descriptor語数、register、texture状態の解釈がずれる。TMU数は性能・資源だけでなく、software／hardware ABIに関わる構成値である。

### T.11 fogの位置

`PixelPipeline`はTMUの後にfogを適用する。fogはdepthまたはdistanceに応じ、現在色とfog colorを混ぜる。二次元ゲームでは通常無効にするが、pipeline上のbypass条件とlatencyには関係する。

fog LUTは専用stream commandで更新される。単なる一個のregisterではなく、複数entryのtableであるため、command parserがfog用streamへpayloadを振り分ける。

### T.12 TMU無効時のbypass

公式設計ではTMUが無効なら、計算したtexture色ではなく前段の色を転送する。これは「黒を出す」動作ではない。textureを使わない一様色の長方形は、補間された頂点色がそのままfogまたはper-fragment段へ進む。

無効機能のbypassにも、valid、last、keep、座標、indexを同じlatencyで渡す必要がある。data colorだけをbypassし、controlが別の遅延になると画素がずれる。

### T.13 RGB565とtexture format

外部color bufferはRGB565を使う。texture側は設定したpixel formatに応じてRGBやalphaを展開し、内部のsubpixel幅へ変換する。RGB565は赤5 bit、緑6 bit、青5 bitで、alphaを持たない。

| component | bit数 | 段階数 |
|---|---:|---:|
| red | 5 | 32 |
| green | 6 | 64 |
| blue | 5 | 32 |

薄いgradientでは色段差が見える可能性がある。texture sampleの誤りと最終RGB565量子化を分けるため、単色pattern、原色、段階gradientを使う。

### T.14 texture異常の見分け方

| 見え方 | 候補 | 小さな試験 |
|---|---|---|
| 2画素周期の色交換 | bank／近傍address | 2×2で四色が異なるtexture |
| 端だけ別の色 | wrap／clamp | 端を目立つ色にしたtexture |
| 全体が一色 | TMU無効、page未読込、TexEnv | 4×4 checkerboard |
| 拡大時だけ崩れる | fractional座標、filter | 2倍拡大した格子 |
| 縮小時だけちらつく | LOD／mipmap | 段階別に色を変えたmipmap |
| 色は正しくalphaだけ無効 | format／TexEnv／blend | 透明・半透明・不透明の三領域 |

### T.15 texture変更の検証順

texture formatを追加する場合、最初からゲームを動かさない。次の順で範囲を広げる。

1. C++で既知の数画素を正しいpacked値へ変換する試験。
2. `TextureSampler`へ小さなRAM内容と整数座標を与えるRTL試験。
3. 小数座標で最近傍と線形filterを比較する試験。
4. wrap／clampの四辺と四隅を試す。
5. TexEnvをreplaceに固定して色だけ確認する。
6. blendとalphaを有効にする。
7. 実機で拡大画像と1:1画像を比較する。

複数機能を同時に有効にすると、誤りがsample、filter、TexEnv、blendのどこか分からなくなる。

## 付録U Per-Fragment Pipelineで最終色を決める

### U.1 fragmentはまだ画面に書かれたpixelではない

Rasterizerが三角形内の一位置を生成し、色やdepthが付いた段階をfragmentと呼ぶ。fragmentは候補であり、alpha、depth、stencil testで捨てられる場合がある。blendにより既存色と混ざる場合もある。Framebufferへ書かれて初めて保存されたpixelになる。

### U.2 新しい値と既存値をそろえる

`PerFragmentPipeline`の入力には、新しいfragmentの色・depthだけでなく、同じindexから読んだ既存color、depth、stencilが必要である。`StreamConcatFifo`がこれらを対応付ける。

例えば新しいfragment Aの色と、次のfragment Bの既存depthが組み合わさると、depth testが別画素の値で行われる。valid／ready停止中にも順序と対応を保つことが重要である。

### U.3 三つの試験と色の演算

図U.1は、最終的な書込み判断を単純化して示す。

![図U.1 新しい画素を画像へ書くか決める](figs/rix-fragment-decision.png)

alpha、depth、stencilの三試験が成功し、`keep`が有効なら、色と必要なdepth／stencilを書ける。失敗時もstencil operationは、stencil失敗、depth失敗、全成功という場合ごとの規則に従う。

### U.4 alpha test

alpha testは、新しいfragmentのalphaとreference値を比較する。比較関数にはnever、less、equal、less-or-equal、greater、not-equal、greater-or-equal、alwaysなどがある。透明部分を完全に捨てる文字やspriteに使える。

alpha testはblendと異なる。alpha testはfragmentを通すか捨てるかの二択、blendは通ったfragmentの色を既存色と混ぜる処理である。半透明を表すには通常blendを使う。

### U.5 depth test

depth testは、新しいdepthと保存済みdepthを比較し、手前にあるものなどを残す。二次元ゲームで描画順を明示し、depthを使わないなら無効化できる。無効化してもdepth buffer回路をparameterで削除したとは限らず、実行時にbypassしている場合がある。

同じdepth値に対して`LESS`を使うか`LEQUAL`を使うかで、共有面や重ね描きの結果が変わる。二次元で同じzの四角形を重ねるなら、depthを無効にしてdraw orderを使うか、zを分けるか、比較関数を意識する。

### U.6 stencil testと三種類のoperation

stencil bufferは各画素に小さな整数を保存し、maskのように使う。testは保存値とreferenceを比較する。さらに、次の三場合で保存する値を変えられる。

| 場合 | operationの例 |
|---|---|
| stencil test失敗 | keep、zero、replaceなど |
| stencil成功・depth失敗 | increment、decrementなど |
| stencilとdepth成功 | replaceなど |

本構成の内部stencilは4 bitである。0から15の範囲を持つ。8 bitの一般的なGPUと同じ範囲だと思い込まない。

### U.7 blending

blendは、新しいsource色と既存destination色へ係数を掛け、加える。単純化すると次である。

```text
output = source × sourceFactor + destination × destinationFactor
```

典型的なalpha blendでは、source factorをsource alpha、destination factorを1−source alphaにする。alpha=1なら新しい色、alpha=0なら既存色、0.5ならほぼ半分ずつになる。

固定bit幅の演算ではroundingとsaturationがある。理想実数の式と完全に同じであるとは限らない。公式software testの`BlendFunc`とRTL出力を比較する。

### U.8 logic operation

logic opは、sourceとdestinationのbitごとにAND、OR、XOR、copyなどを行う。blendと同時に最終色へ適用するのではなく、設定によりlogic op側またはblend側の結果を選ぶ。bit単位の演算なので、知覚的な明るさを混ぜる処理とは異なる。

二次元の選択枠や反転表示にはXORが使える場合がある。しかし同じ場所へ二回描けば元へ戻るなど、描画回数に依存する。通常の半透明spriteにはblendを使う。

### U.9 color、depth、stencilのwrite mask

試験が成功しても、write maskが0なら対応するbufferを更新しない。color maskはcomponentごと、depth maskはdepth書込み、stencil maskはbitごとの書込みを制御する。

例としてdepth prepassではcolor書込みを無効にしてdepthだけ作る。二次元研究では使わなくても、状態が前の描画から残ると「何も描かれない」原因になる。描画前に必要なstateを明示する。

### U.10 処理の並列性

`PerFragmentPipeline`では、blend、logic op、alpha test、depth test、stencil testの候補計算を並列に進め、最後に結果とenableからwriteを決める。ソースコードの行順が、そのまま時間順に一つずつ処理されるわけではない。

Verilogの連続代入や別module instanceは並列回路となる。`always @(posedge aclk)`内でも、nonblocking assignmentは同じclock edgeでregister更新する。C++の逐次実行の読み方をそのまま適用しない。

### U.11 Pipelineを停止する`ce`

出力先Framebufferが受け取れないとき、`m_frag_tready=0`となり、PerFragment内部のpipeline registerを`ce=0`で止める。新しいfragmentの演算値だけでなく、test結果、座標、index、lastを同じ位置に保持する。

この停止が正しいかは、連続入力でreadyを途中だけ0にし、停止前後の出力列がready常時1の結果と同じになるか比較する。出力時刻は遅れてよいが、値と順序と個数は変わってはならない。

### U.12 二次元文字の具体例

白いglyph textureのalphaを使い、文字色を青、背景を黒とする。texture sampleのalphaが0ならalpha testで捨てる。alphaが1なら青を保存する。antialiasされた端で0と1の間を持つなら、alpha testだけでは階段状になり、blendで背景と混ぜる方が滑らかになる。

文字が長方形の背景まで塗る、縁が黒くなる、二回目だけ壊れる場合は、次を分けて確認する。

1. textureのRGBとalphaのformat。
2. TexEnvが頂点色とtexture alphaをどう組み合わせるか。
3. alpha testの比較関数とreference。
4. blend factor。
5. 前のstateが次の文字へ残っていないか。
6. 部分描画で背景を正しく描き直したか。

### U.13 重なる四角形の具体例

最初に赤い四角形、次に半透明青の四角形を重ねる。depth無効、標準alpha blendなら、重なりは紫に近い色になる。順序を逆にすれば別の色になる。blendは可換ではないためである。

部分描画で古いボール位置を黒く塗るだけでは、そこにあった赤いblockも消える。この問題はPerFragmentの誤りではなく、どの図形をどの順で再描画するかというgame renderer側の問題である。hardwareが正しく上書きしているからこそ、背景や重なる物体の再描画が必要になる。

### U.14 PerFragment変更の単体試験

| 変更対象 | 最小入力 | 確認する境界値 |
|---|---|---|
| alpha test | alphaとreference | 直前、等値、直後 |
| depth test | sourceとdestination depth | 0、同値、最大 |
| stencil | 4 bit値とmask | 0、15、overflow、underflow |
| blend | source／destination原色 | alpha 0、1、0.5 |
| logic op | bit pattern `0xAAAA`と`0x5555` | 各truth table |
| write mask | 全componentが異なる色 | 禁止bitが保存値を保つか |

個別演算のsoftware testで期待値を作り、VerilatorでRTLを試し、最後に統合画像を確認する。

## 付録V 内部Framebuffer、DDR3、表示まで

### V.1 三種類のbufferを分ける

本構成でbufferという語は複数のものを指す。

| buffer | 保存内容 | 主な場所 |
|---|---|---|
| display list buffer | 描画命令列 | CPUが使うDDR3領域 |
| internal framebuffer | 現在の帯のcolor／depth／stencil | FPGA内部BRAM |
| external color buffer | 完成画像 | DDR3 |
| command／response FIFO | 32 bitの転送語 | clock境界のFIFO |
| display reader FIFO | 映像出力前の画素 | 表示回路内部 |

front buffer／back bufferと呼ぶ場合は、多くはexternal color bufferの二枚を指す。internal framebufferの色・depth・stencil三種やdisplay list二組とは別である。

### V.2 `InternalFramebuffer`の二port

各internal framebufferは、通常描画用のread／writeと、clear・commit・readなどのcommand用accessを両立させる。内部RAMはdual-portとして扱われ、一方をfragment pipeline、他方をcommand handlerが使う。

ただし、両者が同じaddressへ同時に異なる操作をした場合の優先順位やRAM primitiveのread-during-write挙動が問題になる。`applied`信号によりcommand中は通常経路を適切に止め、同じ領域を無秩序に操作しない。

### V.3 color、depth、stencilは別々のmemory

`RasterIXCoreIF`は、color、depth、stencilのinternal framebufferを別moduleとしてinstance化する。代表的なbit幅はcolorが内部parameterに応じたRGB、depth 16 bit、stencil 4 bitである。外部color streamはRGB565として扱う。

三つを別memoryにすることで、colorだけ、depthだけ、stencilだけのclearやread/write enableを持てる。一方、同じfragmentについて三つのread結果をそろえる必要があり、`StreamConcatFifo`が使われる。

### V.4 MEMSET、READ、COMMIT、SWAP

内部Framebuffer周辺の四操作を図V.1に示す。

![図V.1 内部Framebufferに対する四つの操作](figs/rix-framebuffer-commands.png)

`MEMSET`は内部領域をclear値で埋める。scissorが有効なら対象外を保てる。`READ`はDDR3に残る前の帯を内部へ読み戻す。`COMMIT`は内部の結果をDDR3へ書き出す。`SWAP`は完成したexternal color bufferの表示切替を依頼する。

### V.5 部分描画でREADが必要になる理由

毎frame全画面を描き直すなら、内部帯をclearし、すべての物体を描き、commitできる。変更領域だけを描く場合、変えていない画素を保つ必要がある。external bufferに前の画像があり、内部BRAMは別の帯や別frameに再利用されているため、対象帯の旧画像を`READ`で戻してから一部を上書きする。

ただし本研究の最適化は、二枚のexternal bufferそれぞれに残る状態をsoftwareでも管理する。表示中でないbufferへ次の画像を作るため、そのbufferが何frame前の状態かを考え、必要な物体を描き直す。

### V.6 640×480を五帯へ分ける計算

画面は640×480で307,200画素、internal framebufferは`2^16=65,536`画素である。公式`RenderConfig::getDisplayLines()`は、最大画面が内部sizeと完全一致しない場合、整数除算の商へ1を加える。この設定では`307,200÷65,536=4`余りがあるため5帯になる。

実行時は480行を5帯へ分け、一帯96行とする。一帯は`640×96=61,440`画素で、65,536画素以内に収まる。残る4,096画素はこの帯では使わない。

![図V.2 640×480を65,536画素の内部Framebufferで描く](figs/rix-if-five-strips.png)

### V.7 一つの図形を帯ごとに扱う

高さ100画素の長方形が帯0と帯1にまたがる場合、各帯のdisplay listに、その帯と重なる三角形を入れる。帯1では、Q.14で説明したように属性開始値を帯の開始行まで進める。

図形数が同じでも、帯をまたぐ大きな図形は複数帯で処理される。internal framebufferを大きくすれば帯数を減らせるが、BRAM使用量が増える。性能とresourceのtrade-offを測る対象になり得る。

### V.8 external color bufferと二重buffering

表示回路がbuffer Aを読み続ける間に、RasterIXはbuffer Bへ次frameを作る。完成したら表示先をBへ切り替え、その後Aを次の描画先にできる。これにより、表示途中の画像へ書き込み、上半分だけ新frameになるtearingを避けやすい。

`RIX_CORE_COLOR_BUFFER_LOC_1`と`LOC_2`は、texture memory baseからのoffsetとして設定する。本構成では0x01e00000と0x01c00000を使う。CMakeの値、Linux reserved-memory、RTLが見る物理address、表示回路が読むaddressが一致しなければならない。

### V.9 起動直後に両bufferを初期化する

programを再実行してもDDR3上の二枚の外部画像が自動で0になるとは限らない。一枚だけを全画面描画し、その直後から部分描画へ移ると、もう一枚へ切り替えたとき古い実行の画像が現れる。

そのため二枚それぞれに確実な全画面状態を作ってから部分描画へ入る。本研究のrendererが最初の複数回を全体描画にするのは、この二重bufferの履歴をそろえるためである。内部BRAM一個をclearしただけでは、二枚の外部bufferは初期化されない。

### V.10 commitのmemory転送

`InternalFramebufferCommandHandler`は、内部RAMから順に画素を読み、外部streamへ出す。後段のadapterがAXI write burstを作る。color、depth、stencilは選択bitに応じて個別にcommitできる。

転送先が止まれば、内部readの結果を失わないようstreamを停止・bufferする。commit完了は、最後の画素を内部から読んだだけではなく、定義された外部受渡しが完了した状態で判断する。

### V.11 readのmemory転送

READは外部memoryからAXI readを行い、返ったdataを内部RAMへ書く。requestを出した順とresponseのID、burstのlast、画素packingを一致させる必要がある。本構成のAXI data幅は64 bitで、RGB565なら一beatに複数画素が入る。

address alignment、末尾の有効画素、帯の実画素数61,440と内部最大65,536を区別する。使わない残り4,096画素まで誤ってcommitすると、次のmemory領域を上書きする危険がある。

### V.12 表示切替handshake

RasterIXは`swap_fb`と`fb_addr`で新しい表示先を要求する。表示回路は安全な時点でaddressを取り込み、`fb_swapped`で完了を返す。本研究ではこのhandshakeから`GPUFrameDone`を作り、clock境界を越えてCPU側`FRAME_COUNT`を増やす。

完了countが増えたことは、回路が定める表示先切替を受理したことを示す。ディスプレイが全画面を実際に表示し終えた時刻や、人が見た時刻までは示さない。映像captureによる確認とcounter測定を分ける。

### V.13 DVI送信とRasterIXの境界

公式RasterIXの内部Framebufferは完成画素を作り、外部DDR3へ置く。本研究の標準構成では、別の表示回路がDDR3を読み、HDMI OUT端子からDVI形式を送る。したがって映像timing、TMDS serialization、aspect ratioは表示回路側の責務であり、triangle Rasterizerの責務ではない。

画面が横長に伸びる場合、まずcaptureまたはmonitor側が640×480の4:3を16:9へ引き伸ばしていないか確認する。Framebuffer内で正方形の幅・高さを画素数で数え、映像表示後の見た目と分ける。

### V.14 memory帯域を概算する

640×480のRGB565一枚は`640×480×2=614,400 byte`である。60 frame/sで表示回路が読むだけなら約36.9 MB/sとなる。描画側のcommitも毎frame全画面なら同量のwriteが加わる。READを毎frame行えばさらに同量のreadが加わる。

これは最小限のcolor trafficの概算であり、texture、depth、stencil、AXI overhead、burst境界、CPU accessは含まない。理論DDR帯域より小さいというだけで、stallがないとは言えない。瞬間的な競合、arbitration、latency、短いburstを測る必要がある。

### V.15 内部Framebuffer sizeを増やす判断

`FRAMEBUFFER_SIZE_IN_PIXEL_LG`を16から17へ増やすと、65,536から131,072画素になり、640×480を三帯程度に減らせる。一方、color、depth、stencilの各memoryが増え、BRAM使用量とroutingが変わる。texture bufferもBRAMを使うため、単にresource表の「空きBRAM」がそのまま利用可能とは限らない。

変更前に次を比較する。

| 観点 | 期待される変化 |
|---|---|
| 帯数 | 減る |
| 同じ図形の再処理 | 帯をまたぐ回数が減る可能性 |
| commit回数 | 減る |
| 一回のcommit長 | 増える |
| BRAM | color、depth、stencil分増える |
| timing | 大きなRAMとroutingで悪化する可能性 |
| software ABI | 同じparameterで再buildが必要 |

resourceに余りがあることだけで最善とは決めない。実際のframe時間、帯別命令数、stall、timing slackを比較する。

### V.16 IFからEFへ変える場合

EFへ変えると、内部帯のclear／read／commitという流れが変わり、fragmentごとに外部Framebufferへaccessする。software設定、top module、memory port、性能特性が大きく変わるため、単純なparameter変更ではない。

比較実験を行うなら、同じresolution、同じgame state、同じtexture、同じclock、同じexternal memory条件をそろえ、frame timeだけでなくAXI request数、stall、resourceを測る。IFの結果からEFの優劣を推測して結論にしない。

## 付録W RasterIXを変更・検証できる開発手順

### W.1 読んだことと確認したことを分ける

開発者は、sourceから分かる設計意図、simulationで確認した論理、合成で確認した回路成立、実機で確認した外部挙動を分ける。

| 証拠 | 強く言えること | まだ言えないこと |
|---|---|---|
| source読解 | 実装された条件とdata path | そのpathが実機で使われたか |
| software unit test | C++参照処理の例 | RTLの一致 |
| Verilator unit test | 対象RTLの入力出力 | SoC全体とtiming |
| synthesis／timing | resourceと時間制約成立 | game画像の正しさ |
| 実機counter | 定義したeventの回数・時間 | 人が見た映像の完全性 |
| capture画像 | end-to-endの見た目 | 内部で偶然相殺した誤りの不存在 |

「開発者並み」とは、最も強い証拠だけを集めることではなく、疑問に必要な証拠を選べることである。

### W.2 公式unit testを実行する

RasterIXにはC++ software testとVerilator RTL testがある。公式READMEの手順は次である。[RasterIX]

```bash
cd /path/to/wally-game-console/addins/rasterix

cmake --preset unittest_software
cmake --build build/unittest-software -j8
ctest --test-dir build/unittest-software --output-on-failure

cmake --preset unittest_verilator
cmake --build build/unittest-verilator -j8
ctest --test-dir build/unittest-verilator --output-on-failure
```

Verilatorのversionなど依存関係が合わない場合、失敗を回路不良と断定しない。configure logで「toolがない」「optionが変わった」「compile error」「test assertion」のどこかを分ける。

### W.3 どの試験がどのmoduleを扱うか

| 対象 | 公式試験の例 | 確認内容 |
|---|---|---|
| CPU側Rasterizer | `test_Rasterizer.cpp` | 画素集合、index、帯offset、境界 |
| CPU側属性補間 | `test_AttributeInterpolator.cpp` | 色、depth、texture補間 |
| texture演算 | `test_TextureMap.cpp`、`test_TexEnv.cpp` | samplingと色合成 |
| alpha／depth比較 | `test_TestFunc.cpp` | 比較関数 |
| blend／logic／stencil | 対応software test | 個別演算 |
| FrameStreamingCore | `sim_FrameStreamingCore.cpp` | 転送、停止、長さ、channel |
| fixed補間 | `sim_AttributeInterpolationX.cpp` | 増分command |
| 遠近補正 | `sim_AttributePerspectiveCorrectionX.cpp` | q逆数とformat |
| texture sampler | `sim_TextureSamplerTestModule.cpp` | 四texel読出しとfilter |
| internal FB command | `sim_InternalFramebufferCommandHandler.cpp` | memset、commit、read、停止 |
| FIFO結合 | `sim_StreamConcatFifo.cpp` | 複数streamの対応 |

公式試験に`CommandParser`全体や`PerFragmentPipeline`全体の直接testが見当たらない場合、下位演算のtestがあることをもって全体が完全に検証済みとはしない。変更範囲に応じて統合testを追加する。

### W.4 一つの変更を小さく定義する

「RasterIXを高速化する」は大きすぎる。次のように、入力、変更点、期待出力、非変更条件を一文で定義する。

```text
RGBA=(255,0,0,128)のsourceとRGB=(0,0,255)のdestinationに対し、
標準alpha blendのroundingを変更する。depthとstencilの判定、
valid／ready、出力順序は変えない。
```

この一文から、必要なsoftware期待値、RTL module、境界値、画像testを選べる。

### W.5 開発の確認loop

図W.1の順に、小さなtestから実機へ進み、差が出た段へ戻る。

![図W.1 RasterIXを変更するときの確認の輪](figs/rix-developer-verification-loop.png)

実機で映ったことは重要だが、それだけでは境界値やstall時の正しさを十分に確認できない。反対にunit testだけではWally、DDR3、表示回路まで通ることを示さない。

### W.6 waveformで最初に見る信号

すべてのinternal signalを追加する前に、module境界のhandshakeを見る。

| 境界 | 最初に見る信号 |
|---|---|
| command FIFO→RasterIX | data、valid、ready、last |
| FrameStreamingCore→CommandParser | data、valid、ready、last |
| CommandParser→Rasterizer config | valid、ready、streamCounter |
| Rasterizer→補間器 | x、y、index、command、valid、ready、keep、last |
| 補間器→PixelPipeline | color、depth、s、t、valid、ready |
| Pixel→PerFragment | 新色と旧buffer値のvalid対応 |
| PerFragment→Framebuffer | write enable、index、color、depth、stencil |
| commit→AXI | AW、W、Bの各valid／ready／last |

data busが広すぎる場合、最初はindexとvalid／readyだけを見る。欠落・重複がなければ、異常が出る一indexのdataを詳しく見る。

### W.7 ready停止を意図的に入れる

stream回路のbugは、readyが常に1では現れないことが多い。testbenchで、規則的または擬似乱数的にreadyを0にし、受け渡した要素の列をreferenceと比較する。

確認条件は次である。

```text
受信した要素列 = 送信した要素列
順序は同じ
重複なし
欠落なし
lastの位置は同じ
stall中にdataとcontrolを保持
```

時間が延びることは正常である。要素列が変わることが異常である。

### W.8 新しいrender config registerを追加する例

例として、debug用に出力colorを強制するregisterを追加すると仮定する。

1. 未使用のregister番号とbit配置を決める。
2. C++側に`WriteRegisterCmd`を生成するsetterを作る。
3. `CommandParser`のregister streamが新番号を受けることを確認する。
4. config register bankへ値を保存する。
5. `PerFragmentPipeline`手前へenableとcolorを配線する。
6. disable時は従来出力とbit単位で一致させる。
7. reset後disableとなる既定値を定める。
8. command encode、register decode、color override、stallのtestを作る。

debug機能でも、未使用時にtimingやresourceへ影響し得る。最終版へ残すか、simulation専用にするか決める。

### W.9 blend modeを追加する例

blend factorまたは式を追加する場合、`ColorBlender.v`だけでなく、OpenGL enumからinternal enumへの変換、config bit幅、software reference、RTL truth tableを変更する。

同じ番号を別の意味へ再利用すると、古いprogramが別のblendを実行する。既存番号を保ち、新しい番号を末尾へ追加する。config fieldのbit数が足りなければ、命令ABI変更として扱う。

### W.10 texture formatを追加する例

texture formatは、upload時のbyte列、memory size計算、samplerのunpack、alpha既定値、filter内部bit幅、TexEnv入力へ影響する。次の四画素から始める。

| 位置 | 色 | 目的 |
|---|---|---|
| 左上 | 赤 | channel順 |
| 右上 | 緑 | addressのx方向 |
| 左下 | 青 | addressのy方向 |
| 右下 | 白・半透明 | alphaとfilter |

2×2を整数座標で正しく読めた後、小数座標、端、mipmapへ広げる。

### W.11 internal framebuffer sizeを変える例

size変更では、RTL instanceの`FRAMEBUFFER_SIZE_IN_PIXEL_LG`とC++の`RIX_CORE_FRAMEBUFFER_SIZE_IN_PIXEL_LG`を同じ値にする。帯数、帯高さ、display list buffer数、commit size、BRAM resource、timingを再確認する。

比較表には、少なくとも次を残す。

| 指標 | 変更前 | 変更後 |
|---|---:|---:|
| internal画素数 | 65,536 | 測定値 |
| 帯数 | 5 | 計算値 |
| 一frameのtriangle command数 | 測定値 | 測定値 |
| command送信時間 | 測定値 | 測定値 |
| Rasterizer stall cycle | 測定値 | 測定値 |
| BRAM／LUT／FF | report | report |
| worst slack | report | report |
| end-to-end frame時間 | 測定値 | 測定値 |

### W.12 TMUを二個へ増やす例

TMU数を2へ変えると、第二texture bufferとTMUのresourceが増え、descriptorは39語から48語へ増える。C++ library、hardware parameter、texture state、command sizeを一致させる。第二TMUが無効な描画でも、構成されたpipelineのlatencyやresourceが変わる可能性がある。

試験は、TMU0だけ、TMU1だけ、両方、両方無効の四条件を持つ。二枚のtextureを原色patternにし、TexEnvの前段色との組合せを確認する。

### W.13 performanceを調べるcounter

developerとして性能原因を絞るには、frame全体の時間だけでなく、各段の仕事量と停止を数える。

| counter候補 | 何を分けるか |
|---|---|
| command word数 | CPU送信量 |
| triangle数 | geometry量 |
| candidate fragment数 | Rasterizer仕事量 |
| kept fragment数 | 実際の画素候補 |
| Rasterizer stall cycle | downstream停止 |
| texture load byte | texture転送量 |
| framebuffer read／commit byte | 帯転送量 |
| AXI wait cycle | memory応答待ち |
| swap wait cycle | 表示同期待ち |

counter自体がtimingへ影響するため、幅、reset、読出し方法、overflowを設計する。測定用bitstreamと最終bitstreamを区別する。

### W.14 simulationと実機のreferenceをそろえる

同じ2D sceneを、software rasterizer、RTL simulation、実機で描く。sceneには次を含める。

1. 一様色の二三角形からなる四角形。
2. 三頂点色が異なるgradient。
3. 2×2原色textureの拡大。
4. alpha 0、0.5、1の重なり。
5. 画面端と帯境界をまたぐ図形。
6. scissor内外。

画像比較は完全一致だけでなく、異なるpixel数、最大component差、差の位置を保存する。RGB565や固定小数点のroundingがreferenceと異なる場合、許容差の根拠を明示する。

### W.15 合成後に確認すること

RTL simulationが通っても、FPGAへ実装できるとは限らない。Vivado reportで次を見る。

| report | 確認する点 |
|---|---|
| utilization | LUT、FF、BRAM、DSP、IO |
| timing summary | setup／hold、worst slack、clock domain |
| clock interaction | 非同期clock間の扱い |
| methodology／DRC | unconstrained path、unsafe CDCなど |
| power | 温度・電源の参考値 |

resource使用率が100%未満でも、routing混雑でtimingを満たさないことがある。逆にLUTが多くても、critical pathが短ければclockを満たす。resourceと速度を別々に評価する。

### W.16 実機での段階的な成功条件

| 段階 | 成功条件 |
|---|---|
| bus | IDが`RIX1`、command readyを読む |
| command | 小さなNOP／設定列が完了しbusyが戻る |
| framebuffer | clearした単色がDDR3へcommitされる |
| display | 原色patternが4:3で安定表示される |
| rasterizer | 一様色三角形の位置と境界が正しい |
| interpolation | gradientが期待方向へ変化する |
| texture | 2×2原色patternを正しく拡大する |
| per-fragment | alpha／depth／stencilの小sceneが一致する |
| game | 固定seed・固定入力で同じframe列となる |

段階を飛ばしてgameだけを見ると、異常がAPI、command、Rasterizer、memory、displayのどこか分からない。

### W.17 source変更をしない理解確認

まずコードを変えず、既存moduleで次を説明する。

1. `glVertex2f`の値が保存されるC++配列。
2. `GL_QUADS`が二三角形になる頂点順。
3. `TriangleDescX`のWally構成での語数。
4. 外側`OP_STREAM`と内側`OP_TRIANGLE_STREAM`の違い。
5. `CommandParser`が次のcommandを待つ条件。
6. Rasterizerの`PUSH`／`POP`。
7. `AttributeInterpolatorX`を選ぶgenerate条件。
8. TMUが四texelを読む理由。
9. alpha testとblendの違い。
10. READ、COMMIT、SWAPの違い。

答えをsource pathとsignal名で示せれば、変更へ進む基礎がある。

### W.18 開発者向けの症状別入口

| 症状 | 最初に開くfile | 最初に見る値 |
|---|---|---|
| 図形の位置が違う | `VertexPipeline`、`Rasterizer.cpp` | 変換後頂点、bounding box |
| 三角形に穴がある | software／RTL Rasterizer | 辺関数、境界規則、keep |
| gradientが壊れる | `AttributeInterpolationX.v` | init、X／Y increment |
| textureがずれる | `TextureSampler.v` | s、t、bank address |
| 透明が効かない | `TexEnv.v`、`PerFragmentPipeline.v` | alpha、test、blend factor |
| 前の画像が残る | framebuffer command | memset／read／commit size |
| 数frame後に停止 | command parser／FIFO | state、counter、valid／ready |
| memory trafficで遅い | IF command／AXI | read／commit byte、wait cycle |
| 上下反転 | Rasterizer index／display | y、offset、row address |
| 実機だけ不安定 | timing／CDC／reset | slack、clock、synchronizer |

### W.19 本研究の構成parameter一覧

| parameter | 本研究の値 | 影響 |
|---|---:|---|
| CPU clock | 20 MHz | C++処理とAPB送信速度 |
| RasterIX／DDR clock | 100 MHz | 描画pipelineとmemory interface |
| pixel clock | 25.2 MHz | 640×480映像timing |
| command data width | 32 bit | CPUからのstream語幅 |
| AXI data width | 64 bit | RasterIXのmemory転送幅 |
| framebuffer log2 pixels | 16 | 65,536画素、五帯 |
| TMU count | 1 | descriptor、texture回路、resource |
| display size | 640×480 | 外部画像と帯計算 |
| interpolation | fixed point | `AttributeInterpolatorX`経路 |
| color external format | RGB565 | 2 byte／pixel |
| threaded rasterization | true | command処理threadが頂点変換と記述子生成を担当 |

parameterの説明では値だけでなく、softwareとRTLのどこを一致させるかを書く。

### W.20 公式sourceの索引

| 知りたいこと | 主なsource |
|---|---|
| 全体設計 | `design.md` |
| OpenGL入口 | `lib/gl/opengl`、`RIXGL.cpp` |
| 頂点配列 | `VertexQueue.hpp`、`RenderObj.*` |
| primitive組立て | `transform/PrimitiveAssembler.cpp` |
| CPU側記述子計算 | `renderer/Rasterizer.cpp` |
| command class | `renderer/commands` |
| display list | `renderer/displaylist` |
| 外側転送生成 | `renderer/devicedatauploader` |
| 外側転送RTL | `FrameStreamingCore.v` |
| command／register定義 | `RegisterAndDescriptorDefines.vh` |
| 内側decode | `CommandParser.v` |
| 描画器top | `RasterIXRenderCore.v` |
| 画素列挙 | `Rasterizer.v`、`RasterizerCommands.vh` |
| 属性補間 | `AttributeInterpolationX.v`、`AttributeInterpolatorX.v` |
| 遠近補正 | `AttributePerspectiveCorrectionX.v` |
| texture | `TextureBuffer.v`、`TextureMappingUnit.v`、`TextureSampler.v` |
| 色合成 | `TexEnv.v`、`Fog.v` |
| fragment試験 | `PerFragmentPipeline.v`、`TestFunc.v`、`StencilOp.v` |
| blend／logic | `ColorBlender.v`、`LogicOp.v` |
| 内部画像 | `InternalFramebuffer*.v` |
| IF全体 | `RasterIXCoreIF.v`、`RasterIX_IF.v` |
| test | `unittest/software`、`unittest/verilator` |

### W.21 理解を確認する総合課題

赤い四角形一個について、次を一枚の紙へ描く。

1. 四頂点と二三角形の頂点順。
2. CPU側で作るbounding box、三辺の初期値・増分。
3. Wally APBレジスタ、非同期FIFO、外側command、内側command。
4. `CommandParser`からFramebuffer writeまでのmodule列。
5. valid／readyが0になった場合の保持場所。
6. 一帯のinternal addressと画面全体のDDR3 address。
7. commitとswapの時系列。
8. 各段で失敗したときの観察signalと試験。

この説明を、まずtexture無効の一様色で行う。次にtextureとalpha blendを一つずつ追加する。複雑なsceneを一度に説明するより、機能を一つ追加するたびにdata pathがどこへ増えるかを示す方が、設計を変更できる理解につながる。

### W.22 本付録の限界と次の一次資料

本付録は基準版のsourceを具体的に追える地図であり、すべてのparameter組合せ、OpenGL 1.x互換機能、AXI corner caseを形式検証したものではない。開発者として新しい変更を行う際は、固定版source、付属test、OpenGL ES／OpenGL仕様、AXI仕様、使用FPGAのmemory primitive仕様を一次資料として確認する。

理解の到達点は、「この付録にそう書いてあるから」ではなく、対象sourceで入出力を確認し、小さな再現testを作り、結果から説明できることである。本研究の標準構成を保つ限り、まず本付録の具体例を再現し、その後に一parameterまたは一moduleずつ変更する。
