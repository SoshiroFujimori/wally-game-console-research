## 第51章 描画回路の画素列挙と属性の補間

CPUが用意した三角形の情報を使い、回路は画面上のどの位置を調べ、そこへ何色を渡すかを繰り返し計算する。この章では、同名のCPU側クラスとRTLモジュールを分けてから、辺の値と属性の値が隣の画素へどう更新されるかを扱う。

### 51.1 CPU側RasterizerとRTL側Rasterizerの違い

同じ`Rasterizer`という名前が二箇所にある。

| 実装 | 入力 | 出力 | 主な仕事 |
|---|---|---|---|
| `lib/gl/renderer/Rasterizer.cpp` | 変換済み三頂点 | `TriangleDesc` | 辺関数・属性の初期値と増分を計算 |
| `rtl/RasterIX/Rasterizer.v` | 固定小数点の記述子 | 画素候補座標stream | 三角形内の画素を列挙 |

CPU側が設計図を作り、RTL側がその設計図に従って画素を歩く、と考える。CPU側の出力が誤っていればRTLは正しく誤った図形を描く。RTL側が誤っていれば同じ記述子をソフトウェア rasterizerへ渡した結果とずれる。

### 51.2 RTL Rasterizerの二つの状態機械

RTLには、全体のcommandを管理する主state machineと、三角形の辺を歩くエッジ walker state machineがある。主なエッジ状態は`INIT`、`SEARCH_LEFT`、`WALK_OUT`、`WALK`、`YINC`、`SEARCH_RIGHT`である。

![図51.1 辺関数で三角形の内側を一行ずつ探す](figs/rix-edge-walk.png)

最初に境界箱の一行で左から内側を探し、内側へ入った位置を保存する。右へ進みながら有効画素候補を出し、外へ出たら次の行へ移る。三角形の形に応じて、前の行の左端付近から探すことで、毎行を境界箱の端から完全に探し直す費用を減らす。

### 51.3 内側判定

三つの辺関数`w0,w1,w2`はsigned値である。CPU側で向きをそろえた後、符号bitが一つも立っていなければ内側または辺上と判定する。さらにxとyがbounding box内にあることを確認する。

```text
inside = (w0 >= 0) and (w1 >= 0) and (w2 >= 0)
         and x in bounding box and y in bounding box
```

固定したRTLでは`isInTriangle = !(w0[31] | w1[31] | w2[31])`であり、三辺すべてが0以上なら内側とする。0に等しい辺を辺の向きで除外するtop-left規則はない。公式C++記述子生成器とソフトウェア rasterizerをそのまま呼んだ4×4四角形では、共有対角線の`(0,0)`、`(1,1)`、`(2,2)`、`(3,3)`を二三角形が両方生成した。異なる画素は16個、重複を含む画素候補は20個である。

この結果から言えるのは、「この入力と固定commitでは共有辺が二重に生成される」である。すべての図形で必ず二重になるとは限らず、頂点の固定小数点化とsample格子に依存する。見た目の隙間がないことと、画素候補が一度だけ生成されることも別である。

### 51.4 `PUSH`と`POP`の役割

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

### 51.5 framebuffer indexとy座標

OpenGLの画面座標は左下を原点とする考え方を使う。一方、linearly保存する画像や表示回路は上から下へ読むことが多い。RTL Rasterizerは、概念上次のようにyを反転して一列のindexを作る。

```text
index = ((resolutionY − 1) − y) × resolutionX + x
```

例えば640×480でOpenGL座標`(0,0)`は、メモリ上では最下行側のoffsetになる。画像が上下反転した場合、頂点変換だけでなく、このindex規則、帯のy offset、表示回路の行順を確認する。

### 51.6 `AttributeInterpolationX`の増分更新

`AttributeInterpolationX`は、color、depth、テクスチャの各componentについて、現在値、X増分、Y増分、保存値を持つ。Rasterizer commandに従い、同じ周期で並列に更新する。

```text
INIT  : current = initial
X_INC : current = current + xIncrement
X_DEC : current = current − xIncrement
Y_INC : current = current + yIncrement
PUSH  : saved = current
POP   : current = saved
```

RGBAの四成分、depthのzとw、TMUごとのs,t,qが同じ移動commandを受ける。これにより、画素座標と属性値がずれない。

### 51.7 固定小数点のrangeとprecision

固定小数点には、表せる最大範囲と最小刻みのtrade-offがある。32 bitのうち小数部を増やすと細かな値を表せるが、大きな整数を表すbitが減る。RasterIXは属性ごとに異なる形式を選ぶ。

| 属性 | 代表形式 | 重視すること |
|---|---|---|
| テクスチャ補間 | S3.28 | 小数精度 |
| depth補間 | S1.30 | 0から1付近の高精度 |
| color補間 | S7.24 | gradient精度と一時的な範囲 |
| 補正後テクスチャ座標 | S16.15 | texel index範囲と小数割合 |

形式を変えると、C++変換、descriptor width、RTL slice、乗算結果のshift、test期待値が連鎖して変わる。一つのパラメータだけで自由に精度を増やせるとは限らない。

### 51.8 遠近補正を段階に分ける

`AttributePerspectiveCorrectionX`は、補間されたqの逆数を近似し、補間済みのs×q、t×qに掛けてsとtを復元する。図51.2は役割だけを示す。

![図51.2 テクスチャ座標の補間と遠近補正](figs/rix-perspective-correction.png)

公式RTLのコメントでは、この固定小数点補正パイプラインは17 周期で、最初の段が逆数計算、次が乗算とformat変換を行う。`XRecip`は反復回数を持つ近似回路であり、数学の無限精度の除算ではない。入力qが0または範囲外のときの扱いは、clippingと入力制約を含めて確認する。

### 51.9 色とdepthのclamp

補間途中の色は0未満または最大値より大きくなる可能性がある。出力段では負値を0、上位bitが立つ過大値を最大へclampし、画素色のbit幅へ落とす。depthも16 bitへ変換する。

wrap-aroundで255の次が0になると、三角形端に不自然な色が出る。clampはそれを防ぐ。ただし、どの段で何bitを捨てるかによりrounding errorが生じる。gradientのbandingを調べる場合、最終RGB565だけでなく、この中間量子化も見る。

### 51.10 Wally構成が使う補間器

`RasterIX_IF`のパラメータ`RASTERIZER_ENABLE_FLOAT_INTERPOLATION`は既定で0であり、本研究はoverrideしていない。そのためWally構成は`AttributeInterpolatorX`という固定小数点経路を使う。浮動小数点版`AttributeInterpolator`がソース treeにあっても、本bitstreamの実行経路ではない。

「ソースに存在する」ことと「現在のパラメータで生成される」ことを区別するため、`RasterIXRenderCore.v`の`generate`条件と、Wally側`rasterix.sv`のinstance パラメータを両方確認する。

### 51.11 2D一様色で各段はどうなるか

赤い長方形で四頂点の色、z、wが同じ場合、色・depth・wのX増分とY増分は0になる。Rasterizerは多数の画素を列挙するが、補間器は同じ値を次へ渡す。テクスチャが無効ならs,t,qは最終色に使われない。

この簡単な入力はハードウェア試験に適している。形が壊れればRasterizer、gradientだけ壊れれば補間器、テクスチャを有効にしたときだけ壊れればTMU以降、と段階的に切り分けられる。

### 51.12 Rasterizerのsoftware試験とRTL試験

公式unit testには、ソフトウェア rasterizerについて、単一画素、2×2の四角形、水平・垂直、空三角形、退化境界箱、負の辺関数、index、y offset、帯境界、対角pattern、境界上などの例がある。固定commitでソフトウェア CTest 9件を実行し、全件成功した。[RasterIX]

一方、`unittest/verilator/cpp/sim_rasterizer.cpp`は実質的に空の`main`で、VerilatorのCTestへRTL `Rasterizer.v`単体試験として登録されていない。Verilator CTest 31件は全件成功し、属性補間、遠近補正、float-to-fixed変換、TextureSampler、FramebufferScissorなどは含むが、RTL Rasterizerの画素集合そのものを網羅する試験にはならない。したがって、本章では「RTL Rasterizerも公式試験済み」とは主張しない。

これらの試験は、Wallyとの統合全体を証明するものではない。しかし辺関数と走査規則の変更を行うとき、実機だけで異常を探すより小さな反例を早く見つけられる。

### 51.13 数値を追う練習

三頂点`A=(0,0)`、`B=(4,0)`、`C=(0,3)`を考える。まずareaを計算し、点`P=(1,1)`について三辺のEを求める。次にPを`(2,1)`へ動かした差が、計算したX増分と一致するか確かめる。最後に、Aが赤、Bが緑、Cが青の場合のbarycentric colorを計算する。

この手計算の目的は、大きなtriangle全体を描くことではない。符号、頂点順、一画素の増分、属性の重みという四点を、RTL信号へ対応できるようにすることである。計算結果がソフトウェア testと一致した後に波形を見る。
