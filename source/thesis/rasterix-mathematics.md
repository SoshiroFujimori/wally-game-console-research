## 付録X 座標、境界、辺関数を数式と実装で一致させる

### X.1 この章でいう「厳密」の範囲

この章は、RasterIX commit `9fdcf97a31b2e4247594e06d605871980cd5e9e1`と、本研究の統合commit `d3e181ac434a01a1f174549b5fbc7ee03a8875b4`を対象とする。将来のRasterIX、別parameter、別compilerにも無条件で同じ結論が成り立つとは扱わない。 また、E6では、この固定版にも同じ内容で存在した命令解析回路に、合法的な入力間隔と受信停止でページ番地が重複する条件を再現した。本付録の数式や保存済み試験が、回路全体のあらゆる転送条件を証明するものではない。新しい反例と診断用修正候補は技術付録29.13〜29.14節に示す。[E6]

ここで結果を四種類に分ける。

| 種類 | 意味 | 例 |
|---|---|---|
| 代数的に導出 | 整数がoverflowしないという前提で全入力に成り立つ | 辺関数の三つの和、X・Y増分 |
| 有限集合を全数確認 | 記した範囲内の全組合せを試した | 8 bit色の補間端点65,536組 |
| 決定的な実装試験 | 固定入力で公式sourceを実行した | 4×4四角形の画素集合 |
| 未証明の境界 | sourceまたは試験から一般化できない | 任意sceneでの完全なsoftware／RTL同値 |

「式が正しい」と「有限bitの実装が同じ値を返す」は別である。実数上で正しい式でも、固定小数点化、overflow、丸め、pipelineの停止により実装結果が変わる。本章は、式、表現、実装、試験を順に重ねる。

![図X.1 座標が辺関数へ到達するまでの値の変化](figs/rix-coordinate-pipeline-exact.png)

### X.2 記号と単位を固定する

同じ`x`でも段階ごとに単位が違う。数値だけを比べず、必ず単位を添える。

| 記号 | 単位・表現 | 意味 |
|---|---|---|
| `x_obj,y_obj` | application座標、float | Breakoutが渡す位置 |
| `x_clip,y_clip,z_clip,w_clip` | clip座標、float | 行列変換直後 |
| `x_ndc,y_ndc,z_ndc` | 無次元、float | clip座標を`w_clip`で割った値 |
| `x_win,y_win` | 画素座標、float | viewport変換後 |
| `X,Y` | Q5相当の整数 | `x_win,y_win`を32倍して整数化した値 |
| `p=(Px,Py)` | Q5相当の整数 | 辺関数を評価するsample位置 |
| `E(A,B,P)` | Q10相当の整数 | 向き付き辺関数 |
| `A_tri` | Q10相当の整数 | 三角形の向き付き面積の2倍に比例する値 |
| `λ0,λ1,λ2` | float | 正規化したbarycentric weight |

Q5という呼び方は「小数部が5 bit」を表す。座標の保存型そのものは32 bit signed整数である。辺関数は二つのQ5差を乗算するため小数部10 bitに相当するが、sourceは専用のQ10型ではなく`int32_t`を使う。

### X.3 object座標からclip座標まで

頂点`v_obj=(x,y,z,1)`には、model-view行列とprojection行列が適用される。sourceの行列格納順を目で追うと転置が入るため混乱しやすいが、外から見た結果は、設定したOpenGL風の変換を頂点へ適用することである。

Breakoutは次を設定する。

```cpp
glViewport(0, 0, Width, Height);
glOrtho(0, Width, Height, 0, -1, 1);
glTranslatef(-0.5f, 0.5f, 0.0f);
```

`W=Width`、`H=Height`とする。正投影だけなら、application座標`(x,y)`は次のNDCへ写る。

```text
x_ndc =  2x/W - 1
y_ndc = -2y/H + 1
```

`bottom=H, top=0`なのでyの符号が反転し、applicationでは上から下へyが増える。これが、ゲームで自然な左上原点の見方を、OpenGL風の左下原点へ対応させる。

### X.4 Breakoutの半画素移動を最後まで計算する

viewport式は次である。

```text
x_win = (x_ndc + 1) W/2
y_win = (y_ndc + 1) H/2
```

正投影式を代入すると、半画素移動前は`x_win=x`、`y_win=H-y`になる。model-viewの`(-0.5,+0.5)`も含めると次になる。

```text
x_win = x - 0.5
y_win = H - y - 0.5
```

例えばapplication上の左端`x=0`はwindow座標`-0.5`、右端`x=4`は`3.5`になる。RasterIXは整数window座標をsampleするため、0、1、2、3が四つの画素中心に対応する。yも同じ考えだが上下が反転する。

「半画素を足せばよい」という一般論だけでは不十分である。RasterIXのfloatからQ5への変換は負数で非対称なので、`-0.5`は数学的な`-16/32`ではなく`-15/32`として保存される。それでも、この4×4例では画素0から3が選ばれることをsource-level試験で確認した。

ここでの`-0.5`から`3.5`は、Rasterizer単体の境界規則と負数変換を同時に見るためのwindow座標micro exampleである。実際の画面左端をまたぐprimitiveは、その前にclip-spaceで切られるため、この入力だけでclipperを含む画面端経路まで証明したとは扱わない。画面内のapplication座標`[10,14)`を半画素移動したwindow座標`[9.5,13.5)`でも別に試験し、画素10から13の16画素、共有辺4画素、合計20 fragmentという同じ局所形状を確認した。

### X.5 clippingが扱う六つの不等式

perspective divideより前のclip座標は、次の六条件をすべて満たすと視体積内である。

```text
-w_clip <= x_clip <= w_clip
-w_clip <= y_clip <= w_clip
-w_clip <= z_clip <= w_clip
```

`Clipper.hpp`は各平面への符号付き距離を次のように定義する。

| 平面 | 距離`d(v)` | 内側 |
|---|---|---|
| left | `x+w` | `d>=0` |
| right | `w-x` | `d>=0` |
| bottom | `y+w` | `d>=0` |
| top | `w-y` | `d>=0` |
| near | `z+w` | `d>=0` |
| far | `w-z` | `d>=0` |

辺の一方が内側、他方が外側なら、交点の割合を次で求める。

```text
a = d_current / (d_current - d_previous)
v_intersection = (1-a) v_current + a v_previous
```

距離は座標の一次式なので、交点の距離は次のように0になる。

```text
d_intersection
= (1-a)d_current + a d_previous
= d_current - d_current(d_current-d_previous)/(d_current-d_previous)
= 0
```

これは分母が0でない交差辺についての代数的な結論である。実装はfloatを使うため、実際の値には丸め誤差が残る。独立監査では、正負の距離10万組について最大残差を記録した。三角形は六平面を順に通り、一平面で最大一頂点増えるため、保存配列は`3+6=9`頂点である。

### X.6 perspective divideとviewport

`Vec::perspectiveDivide()`は、元の`w_clip`の逆数`r=1/w_clip`を求める。出力は次である。

```text
(x_ndc, y_ndc, z_ndc, r)
= (x_clip*r, y_clip*r, z_clip*r, r)
```

第四成分を1へ置き換えず、逆数`r`を保存する点が重要である。この値を後でtextureの遠近補正に使う。

viewport変換は次である。

```text
x_win = (x_ndc+1) width/2 + viewportX
y_win = (y_ndc+1) height/2 + viewportY
z_win = (depthScale*z_ndc + depthOffset) * 65534/65536
```

既定のdepth rangeが0から1なら、`depthScale=1/2`、`depthOffset=1/2`である。最後の`65534/65536`は、1.0ちょうどを16 bit depthの範囲外へ送らないための縮小である。

### X.7 float座標からQ5整数への正確な変換

`Veci::createFromVec`の式は次である。

```text
Q5(x) = truncTowardZero(32x + 0.5)
```

![図X.2 RasterIXのQ5変換が負数で非対称になる理由](figs/rix-fixed-rounding-asymmetry.png)

| 入力x | `32x+0.5` | 保存整数 | 保存値÷32 |
|---:|---:|---:|---:|
| -1.0 | -31.5 | -31 | -0.96875 |
| -0.5 | -15.5 | -15 | -0.46875 |
| -0.03125 | -0.5 | 0 | 0 |
| 0 | 0.5 | 0 | 0 |
| 0.03125 | 1.5 | 1 | 0.03125 |
| 0.5 | 16.5 | 16 | 0.5 |
| 1.0 | 32.5 | 32 | 1.0 |

正数の代表例だけを見ると四捨五入に見えるが、負数では原点側へ偏る。これは推測ではなく、公式templateを呼ぶC++監査でも同じ出力を確認した。入力が`int32_t`の表現範囲を越えるfloatの場合のC++変換は保証できないため、座標は変換可能範囲内でなければならない。

### X.8 bounding boxの整数化

三頂点をQ5整数`Xi,Yi`へ変換した後、各軸の最小値と最大値を求める。sourceの式をそのまま書くと次になる。

```text
bbStart = (minQ5 + 16) >> 5
bbEnd   = (maxQ5 + 32 + 16) >> 5
```

RTLは`bbStart <= position < bbEnd`という半開区間で走査する。`bbEnd`自体は候補に含まれない。負のsigned値に対する右shiftは、使用するC++規格とcompilerの動作を確認する必要がある。本研究のGCC環境は算術shiftとなるが、sourceを別環境へ移すときは試験を残す。

4×4例のx座標は、Q5変換後に`-15`と`112`になる。したがって次である。

```text
bbStart = (-15+16)>>5 = 0
bbEnd   = (112+48)>>5 = 5
```

候補xは0、1、2、3、4である。x=4はbounding boxには入るが、辺関数で三角形外となる。bounding boxは「必ず塗る範囲」ではなく「調べる候補範囲」である。

![図X.3 bounding box、整数sample格子、実際の内側画素](figs/rix-bbox-sample-lattice.png)

### X.9 辺関数を展開する

向き付き辺`A=(Ax,Ay)`から`B=(Bx,By)`と点`P=(Px,Py)`に対し、RasterIXは次を使う。

```text
E(A,B,P) = (Px-Ax)(By-Ay) - (Py-Ay)(Bx-Ax)
```

これは二次元ベクトル`P-A`と`B-A`の行列式である。`E=0`なら三点は同一直線上、符号はPが辺のどちら側にあるかを表す。頂点順を逆にすると符号も逆になる。

CPU側は`area=E(v0,v1,v2)`を計算し、`area>0`なら`sign=1`、それ以外なら`sign=-1`を選ぶ。その後、areaと三辺の値・増分へ同じsignを掛ける。areaが0なら退化三角形として捨てる。

### X.10 一画素増分を導出する

PをQ5で一画素右へ動かすと`Px`へ32を足す。式の差を取る。

```text
E(A,B,(Px+32,Py)) - E(A,B,(Px,Py))
= ((Px+32)-Ax)(By-Ay) - (Py-Ay)(Bx-Ax)
  - {(Px-Ax)(By-Ay) - (Py-Ay)(Bx-Ax)}
= 32(By-Ay)
```

同様に一画素上へ動かすと次になる。

```text
E(A,B,(Px,Py+32)) - E(A,B,(Px,Py))
= 32(Ax-Bx)
```

これが`Rasterizer.cpp`の`wXInc`と`wYInc`である。毎画素二回の乗算をやり直さず、32 bit加算で更新できる。

![図X.4 辺関数のX増分とY増分の導出](figs/rix-edge-increment-proof.png)

### X.11 三つの辺関数の和とbarycentric weight

三角形`v0,v1,v2`に対し、次を置く。

```text
w0(P)=E(v1,v2,P)
w1(P)=E(v2,v0,P)
w2(P)=E(v0,v1,P)
A=E(v0,v1,v2)
```

各式を展開してPを含む項を集めると相殺し、overflowしない整数演算では次の恒等式が成り立つ。

```text
w0(P)+w1(P)+w2(P)=A
```

向きをそろえた後に`λi=wi/A`とすれば、`λ0+λ1+λ2=1`である。頂点属性`a0,a1,a2`のaffine補間は次になる。

```text
a(P)=λ0 a0 + λ1 a1 + λ2 a2
```

CPU側は開始点Pで`a(P)`をfloat計算し、一画素分のweight増分から`aXInc`と`aYInc`を作る。RTLはその三値を受け、座標移動に合わせて加減算する。独立監査では、辺関数の和とX・Y差分を乱数20万例で照合した。恒等式自体は乱数試験によって成立するのではなく、上の展開によって成立し、乱数試験は実装した監査式の取り違えを探す補助である。

### X.12 RTLが採用するsample格子

CPU側が記述子へ保存する開始点は次である。

```text
p = (bbStartX << 5, bbStartY << 5)
```

つまり辺関数を評価する初期sampleは整数window座標であり、ここへ16を加える処理はない。RTL Rasterizerはxまたはyを1増減するたび、対応する`wXInc`または`wYInc`を属性と一緒に適用する。

Breakoutの半画素移動は、長方形の境界をこの整数sample格子の間へ置くためにapplication側で行う。座標変換側の半画素移動、bounding box側の`+16`、texture samplerのhalf-pixel optionは別の目的であり、一つの「0.5処理」として混同しない。

### X.13 4×4四角形を画素集合まで追う

application上の四頂点を、半画素移動後のwindow座標として次に固定する。

```text
P0=(-0.5,-0.5)
P1=( 3.5,-0.5)
P2=( 3.5, 3.5)
P3=(-0.5, 3.5)
```

`GL_QUADS`は`T0=(P0,P1,P2)`と`T1=(P0,P2,P3)`を作る。公式C++記述子生成器とsoftware rasterizerが返した集合は次である。

| 三角形 | 生成した画素 |
|---|---|
| T0 | (0,0), (1,0), (1,1), (2,0), (2,1), (2,2), (3,0), (3,1), (3,2), (3,3) |
| T1 | (0,0), (0,1), (0,2), (0,3), (1,1), (1,2), (1,3), (2,2), (2,3), (3,3) |

和集合は16画素で、4×4を隙間なく覆う。共通部分は4画素である。

### X.14 top-left規則がなく共有辺を二度生成する

RTLの内側判定は三つのsign bitのORを否定したものであり、数式では次である。

```text
inside = (w0 >= 0) and (w1 >= 0) and (w2 >= 0)
```

`w=0`の辺を特定方向だけ除外する条件はない。共有辺では一方の三角形でも他方でも対応するwが0になるため、両方がそのsampleを含める。

![図X.5 4×4四角形の共有対角線で生じる二重fragment](figs/rix-shared-edge-double-hit.png)

| 指標 | 結果 |
|---|---:|
| 異なる画素数 | 16 |
| 二三角形のfragment数の合計 | 20 |
| 重複fragment数 | 4 |
| 重複位置 | (0,0), (1,1), (2,2), (3,3) |

不透明色を上書きするだけなら同じ色を二度書いても画像は同じである。source-alpha blendなら、最初に混ぜた結果へ二度目を混ぜるため色が変わり得る。stencil incrementなら値が二回変わり得る。このため、将来共有辺を含む透明図形を扱う場合は、top-left規則の追加またはprimitive構成の変更を検討対象にする。

### X.15 scissorは二段階で働く

scissorは、指定長方形の外を描かない機能である。固定sourceでは二つの場所が関係する。

![図X.6 CPUの早期除外とRTLの画素単位scissor](figs/rix-scissor-two-layers.png)

| 段階 | 処理 | しないこと |
|---|---|---|
| CPU `Rasterizer.cpp` | 三角形とscissorが全く重ならなければ`false`を返す | 記述子のbounding boxを書き換えない |
| RTL `FramebufferScissor.v` | `startX<=x<endX`かつ`startY<=y<endY`だけwrite strobeを通す | Rasterizerのfragment生成量を減らさない |

公式sourceを呼ぶ監査では、scissorを有効にしても、重なりのある三角形の`bbStart`と`bbEnd`は無効時と同じだった。したがってscissorは最終書込みを制限するが、現在の記述子経路では重なる三角形の走査仕事をscissor面積まで減らさない。

threaded経路には別の注意がある。`Renderer`はScissorEnd registerへ絶対終端`x+width,y+height`を書く。一方、`ThreadedVertexTransformer`はその値を`Rasterizer::setScissorEnd`へ渡し、この関数は開始座標を再び加える。開始が0でない場合、CPU側早期除外がRTLの半開区間と異なる範囲を見る可能性がある。Breakoutはscissorを使わないため本研究のゲーム結果には作用しないが、公式sourceの一般的なscissor経路としては追加の単体試験が必要である。

### X.16 32 bit辺関数が正しいための範囲

辺関数の差と積は`int32_t`で計算される。C++のsigned overflowは正しい値の下位32 bitを得る操作として保証されず、未定義動作になる。RTLの32 bit registerと加算は上位bitを捨てるため、二の補数のwrapとして現れる。両者はoverflow時の意味が同じとは保証できない。

viewport内の幅W、高さHの長方形に三点A、B、Pがあるとする。辺関数は各座標を一つずつ固定して見ると一次式になるため、長方形上の最大値と最小値は四隅の組合せで達成される。三点について`4^3=64`通りの隅を調べると、向き付き面積の絶対値の最大は`WH`である。Q5では両軸を32倍するため、三頂点の面積上限は次になる。

```text
|A| <= (32W)(32H) = 1024WH
```

| 画面 | 上限`1024WH` | `INT32_MAX`に対する状態 |
|---|---:|---|
| 640×480 | 314,572,800 | 約6.83倍の余裕 |
| 1280×720 | 943,718,400 | 約2.28倍の余裕 |
| 1920×1080 | 2,123,366,400 | ごく小さい余裕 |
| 2048×2048 | 4,294,967,296 | 範囲外 |

正方形ならこの面積上限で一辺1448画素までがsigned 32 bit内、1449画素で超える。RTL edge walkerは右辺探索で最大頂点より一画素右の`bbEndX`までPを動かす場合があるため、中間辺関数には`1024(W+1)H`も確認する。640×480では315,064,320で約6.82倍、1920×1080では2,124,472,320で約1.011倍の余裕があり、2048×2048では4,297,064,448となり範囲外である。

この証明の前提は、Q5化されたA、Bが幅`32W`・高さ`32H`内にあり、走査点Pが横に一画素だけ拡張した範囲内にあることである。任意の画面外記述子、C++で既にoverflowした値、異常なbboxには適用できない。本研究の通常の640×480 clip済み座標には大きな余裕があるが、sourceが許す最大viewport 2048×2048を同じ辺関数幅で安全と断定できない。

### X.17 座標段階で守るべき前提

| 前提 | 破ると起こり得ること | 確認方法 |
|---|---|---|
| clip-space `w_clip`が0でない | perspective divide不能 | clip前の頂点dump |
| Q5変換がint32範囲内 | C++変換の未定義・不定結果 | 変換前座標のrange assertion |
| 辺関数がint32範囲内 | CPUとRTLの不一致 | 64 bit referenceとの比較 |
| bounding boxが解像度内 | index範囲外 | clipping試験とdescriptor dump |
| 半画素規則を一箇所で管理 | 一画素のずれ | 1×1、4×4、画面端scene |
| shared edgeの二重作用を許容 | blend・stencilの線 | overlap counterと画像差分 |

この表の前提を満たさない入力まで含めて「Rasterizerは数学的に正しい」と言うことはできない。研究で使う640×480の二次元sceneに範囲を固定し、その範囲を試験することが必要である。

## 付録Y 固定小数点、補間、texture、混色の数値を追う

### Y.1 Q形式をbit列から読む

本付録では`S整数bit数.小数bit数`を、符号bitを別に数える。32 bit signedの代表形式は次である。

![図Y.1 RasterIXが使う32 bit固定小数点形式](figs/rix-fixed-formats.png)

| 形式 | bit構成 | 最小値 | 最大値 | 刻み |
|---|---|---:|---:|---:|
| S3.28 | 符号1、整数3、小数28 | -8 | `8-2^-28` | `2^-28` |
| S1.30 | 符号1、整数1、小数30 | -2 | `2-2^-30` | `2^-30` |
| S7.24 | 符号1、整数7、小数24 | -128 | `128-2^-24` | `2^-24` |
| S16.15 | 符号1、整数16、小数15 | -65536 | `65536-2^-15` | `2^-15` |

同じ32 bitでも、小数部を増やすほど刻みは細かく、整数範囲は狭くなる。bit列`N`をS3.28として読む実数は、Nをsigned 32 bit整数として解釈して`N/2^28`とする。

### Y.2 float-to-fixed変換の語ごとの動作

`TriangleStreamF2XConverter.v`は三角形streamの語番号を見て、変換する語とその小数bit数を選ぶ。

| 属性 | offset | 出力形式 |
|---|---:|---|
| texture s,t,qと増分 | -28 | S3.28 |
| color r,g,b,aと増分 | -24 | S7.24 |
| depth z,wと増分 | -30 | S1.30 |
| bounding box・辺関数 | 変換なし | 既に整数 |

`FloatToInt.v`はIEEE 754 singleのsign、exponent、mantissaを分け、offsetで二進小数点を移す。右shiftする場合、最初に捨てる一bitを`one_round`として保存し、結果の絶対値へ加える。負数はその後で二の補数にする。

この方式は、保持bitより小さい全bitを使うties-to-evenではない。ちょうど半分でも絶対値を大きくする。overflow判定時は最大値へ飽和せず0になる。したがって、入力範囲を守ることは画質だけでなく、値が突然0になることを避けるために必要である。

さらに、回路はmantissaの手前へ常にhidden bitの1を補う。これは正規化された有限のIEEE 754値に対応する読み方であり、subnormal、NaN、infinityを一般的に正しく変換する回路としては扱えない。非常に大きいshift量は`shiftSize`のbit幅へ切り詰められるため、特殊値を含む全32 bit patternへ通常の数値変換を一般化しない。正規化有限floatでも、非常に小さい非0値にはY.3の追加制約がある。本研究で使う値については、範囲だけでなく、0へ量子化される極小値をそのまま送らないことも入力契約に含める。

### Y.3 右shift量0の境界と極小値aliasを4値simulationと合成後回路で分ける

正規化有限floatの非負の絶対値を`x`、小数bit数を`F`とすると、意図する固定小数点の絶対値は概ね`round(x×2^F)`である。IEEE 754の非正規化前の仮数整数を`M=2^23+mantissa`、不偏指数を`e`とすれば、変換器内の有効指数は`e+F`となる。有効指数が23以下のときは、次の右shiftを行う。

```text
shiftSize = 23 - (e + F)
number    = M >> shiftSize
```

`shiftSize>0`なら、最初に捨てるbitは`M[shiftSize-1]`である。ところが`shiftSize=0`では捨てるbitが存在しないため、数学上のround bitは0でなければならない。公式`FloatToInt.v`はこの分岐を設けず、同じ式`number[shiftSize-1]`を評価する。この場合のindexは範囲外となる。

この差は、simulationが0と1だけを扱うか、不定値`X`も扱うかで見え方が変わる。Verilatorの通常modelは2値であり、このcaseを期待値どおりに見せる。一方、Vivado XSIMで未変更RTLを4値simulationすると、正の入力では`X`が出力へ伝播し、負の入力も期待する二の補数にならなかった。

次の表は、実行した11 caseから、式との対応を説明しやすい8 caseを抜き出したものである。

| 入力 | offset | `shiftSize` | 未変更RTLの4値simulation | 期待値 |
|---|---:|---:|---:|---:|
| color `+0.5` | -24 | 0 | `xxxxxxxx` | `00800000` |
| color `-0.5` | -24 | 0 | `00000001` | `ff800000` |
| color `1.0未満の最大float` | -24 | 0 | `xxxxxxxx` | `00ffffff` |
| texture `1/32` | -28 | 0 | `xxxxxxxx` | `00800000` |
| depth `1/128` | -30 | 0 | `xxxxxxxx` | `00800000` |
| color `0.25` | -24 | 1 | `00400000` | `00400000` |
| colorの極小正規化値、mantissa bit 0が1 | -24 | 33→5 bitでは1 | `00000001` | `00000000` |
| 上と同じ負値 | -24 | 33→5 bitでは1 | `ffffffff` | `00000000` |

次に、Nexys Videoと同じArtix-7 `xc7a200tsbg484-1`を対象としてVivado 2025.2で合成し、合成後functional netlistを4値simulationした。全11 caseのうち、六つの`shiftSize=0`代表値、`shiftSize=1`、左shift、真のshift量32の計9 caseは期待値と一致した。すなわち、今回の合成器は`shiftSize=0`で「round bitなし」に相当する回路を選んだ。

一方、極小値二件は合成後にも`+1`と`-1`になり、期待する0と一致しなかった。原因は、真のshift量33を5 bitの`shiftSize`へ入れると1になり、`mantissa[0]`を「最初に捨てるbit」と誤認するためである。正規化有限値について、有効指数を`p=e+F`とすると、数学的に正しいunderflow丸めは次だけで足りる。

```text
p = -1 : |x|×2^F は [0.5,1) なので、絶対値1へ丸める
p <= -2: |x|×2^F は 0.5未満なので、0へ丸める
```

現在のsourceは`23-p`を5 bitへ切り詰めるため、`p<-8`では32周期でmantissaまたはhidden bitを再び選び得る。正規化有限floatについて、公式sourceの分岐と今回確認した範囲を`p`ごとに分けると次になる。

| `p=e+F` | 公式sourceの経路 | 今回確定したこと |
|---:|---|---|
| `p<-8` | 真の右shift量が31を超え、5 bitへ切り詰められる | 指数によって仮数またはhidden bitを再選択し得るため、安全を一般化できない |
| `-8<=p<=-2` | underflow、選ぶround bitは`number[30:24]`のいずれか | 全24 bit正規化仮数でround bitが0、出力0 |
| `p=-1` | underflow、hidden bitをround bitにする | 全24 bit正規化仮数で出力絶対値1 |
| `0<=p<=22` | 右shiftし、最初に捨てるbitを加える | 全24 bit正規化仮数で絶対値のhalf-up丸め式と一致 |
| `p=23` | `shiftSize=0`で`number[-1]`を読む | 4値RTLでは未定義、今回のArtix-7合成後代表値は期待値と一致 |
| `24<=p<=30` | 左shift | 全24 bit正規化仮数で数学的な左shiftと一致し、正の大きさは`INT32_MAX`以下 |
| `p>=31` | `one_overflow=1` | 符号にかかわらず0を出すため、通常の飽和変換ではない |

負号は最後に32 bit二の補数として適用される。この操作がbit-vector上の剰余否定と等しいことも全32 bit patternで証明した。ただし、表の`p=23`にあるsource上の範囲外indexは、その証明範囲へ含めていない。

極小値aliasだけを避ける単純で保守的な下限は、値が厳密な0であるか、非0の正規化値について`p>=-8`であることとなる。実数の絶対値で書けば、各形式の下限は次である。上限側では別に`p<=30`が必要であり、sourceとして4値RTLでも定義済みであることまで要求するなら`p=23`を除くか、公式RTLへ明示分岐が必要である。

| 形式 | 非0値をそのまま送る保守的下限 |
|---|---:|
| S7.24 | `2^-32`、約`2.33×10^-10` |
| S3.28 | `2^-36`、約`1.46×10^-11` |
| S1.30 | `2^-38`、約`3.64×10^-12` |

![図Y.2 float-to-fixed変換で別々に現れるshift 0境界と極小値alias](figs/rix-float-to-fixed-boundaries.png)

この下限より小さい値は、本来0へ量子化されるため、CPU側で0にするか、RTL側で`p<=-2`を明示的に0へする設計が考えられる。`shiftSize=0`だけを直しても極小値aliasは直らない。

Breakout相当の公式descriptor生成も確認した。単色四角形のcolor・depth増分はbit列になる前のfloat段階で厳密な0だった。8×8文字、64×32 atlasの代表三角形では、texture開始値が`[0.00451055, 0.0090211, 0.57735]`、X増分が`[0.0090211,0,0]`、Y増分が`[0,0.0180422,0]`であり、非0値はS3.28の保守的下限より十分大きかった。この確認範囲では、極小値aliasは現在のBreakout描画へ現れない。

ただし、RTL simulationと合成後simulationが異なるsourceは保守上安全とは言えない。sourceだけを見て`shiftSize=0`を明示する最小変更は次だが、これは極小値aliasまで直す完全な修正ではない。

```systemverilog
one_round <= (shiftSize == 0) ? 1'b0 : number[shiftSize - 1];
```

本研究のrepositoryは公式RasterIX submoduleを変更しない方針なので、この修正は取り込んでいない。結果は`../../experiments/rasterix-math/rasterix-float-to-int-audit.json`、元RTLのlog、合成log、合成後simulation logへ保存した。この試験は代表境界値に対する合成後結果であり、任意のIEEE 754 bit patternについての形式的同値証明ではない。

### Y.4 属性のincrement更新は有限bitの漸化式である

属性`a`について、CPUが`a_init`、`a_x`、`a_y`を送る。RTL `AttributeInterpolationX.v`は32 bit registerで次を実行する。

```text
INIT  : a <- a_init
X_INC : a <- a + a_x
X_DEC : a <- a - a_x
Y_INC : a <- a + a_y
PUSH  : saved <- a
POP   : a <- saved
```

数学上は開始点から右へi画素、上へj行進んだ値が`a_init+i a_x+j a_y`になる。32 bit RTLでは各加算後に上位bitが保持されないため、範囲を越えるとmodulo `2^32`のbit列になる。色とdepthの出力段にはclampがあるが、補間途中のwrapを元へ戻すことはできない。

### Y.5 affine補間の開始値と増分

頂点属性`a0,a1,a2`と正規化weightを使うと開始値は次である。

```text
a_init = λ0(P0)a0 + λ1(P0)a1 + λ2(P0)a2
```

一画素のweight差を`Δx λi`、一行の差を`Δy λi`とすると次になる。

```text
a_x = Σ(Δx λi)ai
a_y = Σ(Δy λi)ai
```

三頂点の色が同じCなら、`Σλi=1`、`ΣΔλi=0`なので、無限精度では`a_init=C`、増分は0である。float計算とfixed変換後には微小な非0が生じる可能性があるため、試験では「理論上0」と「bit列が厳密に0」を分けて記録する。

### Y.6 textureのperspective-correct interpolation

頂点iのclip-space wの逆数を`r_i=1/w_clip,i`、同次texture座標を`(s_i,t_i,q_i)`とする。CPUは次の三値をaffine補間する。

```text
S(P) = Σ λ_i(P) s_i r_i
T(P) = Σ λ_i(P) t_i r_i
Q(P) = Σ λ_i(P) q_i r_i
```

RTLはQの逆数を近似して次を求める。

```text
s(P)=S(P)/Q(P)
t(P)=T(P)/Q(P)
```

![図Y.3 分子と分母を別々に補間してtexture座標を復元する](figs/rix-perspective-exact.png)

`q_i=1`なら一般的なperspective-correct interpolationである。正投影かつ全頂点の`r_i`が同じなら、その共通値が分子と分母で消え、通常のaffine補間になる。

### Y.7 CPU側のw正規化が比を変えない理由

固定小数点経路では、CPU側`Rasterizer.cpp`が`(r0,r1,r2)`をEuclidean normで割る。共通倍率を`c`とすると、送る値は`r'_i=c r_i`である。

```text
S'(P)=c Σλ_i s_i r_i
Q'(P)=c Σλ_i q_i r_i
S'(P)/Q'(P)=S(P)/Q(P)
```

実数演算では結果を変えない。目的はS3.28の範囲へ値を収めやすくすることである。ただし、fixedへ量子化すると分子と分母が別々に丸められるため、有限bitでは完全に同じ値とは限らない。共通倍率は数学的な座標を保ちながら数値範囲を変える設計である。

### Y.8 逆数器の精度と入力前提

`AttributePerspectiveCorrectionX.v`の既定`CALC_PRECISION=25`では、符号用の余裕を除いた`TEXQ_PRECISION=24`を使う。`XRecip.v`は次の構成である。

| 項目 | 値 |
|---|---:|
| 初期推定 | 6 bit |
| Newton反復 | 2回 |
| 説明上の精度 | 約24 bit |
| 逆数段のlatency | `7+3×2=13` cycle |
| 後段 | 乗算・形式変換4 cycle |
| 合計 | 17 cycle |

source commentは入力qが0から1に正規化されることを前提とし、sign bitを外して逆数器へ入れる。q=0を明示的に処理する分岐はなく、公式`AttributePerspectiveCorrectionX`試験にもq=0例はない。したがって正しさの前提は`Q(P)>0`である。clip-space wが0でないだけでは十分でなく、texture qも含む補間後Qが正でなければならない。

### Y.9 colorとdepthの出力clamp

colorはS7.24の上位16 bitを一度取り出す。その16 bit値について、sign bitが1なら0、8 bitより上の7 bitのいずれかが1なら255、それ以外は下位8 bitを出す。S7.24の整数bit列を`fixedColor`と書けば、概念的には次である。

```text
color8 = clamp(fixedColor >> 16, 0, 255)
```

ただし実装は一回の理想的な実数丸めではなく、先にbit sliceを取ってから判定する。depth zはsign bitが1なら0、bit30が1なら65535、それ以外は`depth_z[14 +: 16]`を出す。これもS1.30から16 bitへbit sliceする具体的な規則である。

### Y.10 texture座標S16.15からtexel addressを作る

`TextureSampler.v`は1×1から256×256の2のべき乗textureを扱う。入力はS16.15である。texture sizeのregister値はlog2サイズで、0が1画素、1が2画素、8が256画素を表す。

線形filterでhalf-pixel offsetが有効なら、sample位置の左右上下へtextureサイズに応じた0.5 texelを引き足しする。無効なら現在位置と1 texel先を使う。その後、座標の整数側から四address`00,01,10,11`を作り、小数側からQ0.16のsub-coordinateを作る。

addressは概念的に次である。

```text
address(u,v) = mipOffset + v * textureWidth + u
```

RTLでは幅と高さが2のべき乗なので、乗算の代わりにshiftとORで組み立てる。mipmap levelに応じたoffsetも前段で加える。

### Y.11 repeatとclamp-to-edge

repeatでは座標の下位bitをaddressへ使うことで、texture幅・高さを越えた整数部が周期的に折り返される。clamp-to-edgeでは負座標を0へ、1以上の正規化座標を端側へ制限する。

四texelの右または下が端を越えると、`TextureSampler`は越えた側のtexelを端のtexelで置き換える。例えば右だけ越えた場合、`01=00`、`11=10`となる。これにより、線形filterがtexture外の別addressを混ぜない。

### Y.12 線形filterの整数式

`TextureFilter.v`はsub-coordinate U、Vを16 bitで受けるが、`ColorInterpolator.v`は上位8 bitだけをweightとして使う。`u8=floor(U/256)`、`v8=floor(V/256)`とする。

一channelについて、RasterIXの補間関数は次である。

```text
mix(A,B,u8)
= min(255, floor((A(255-u8) + B u8 + 255)/256))
```

まず上段`00-01`と下段`10-11`を横に混ぜ、その二結果を縦に混ぜる。

```text
h0  = mix(C00,C01,u8)
h1  = mix(C10,C11,u8)
out = mix(h0,h1,v8)
```

![図Y.4 RasterIXのbilinear filterが行う三回の整数混合](figs/rix-bilinear-integer.png)

重みの和は255で、分母は256、最後に255を足してからshiftする。理想式`(1-u)A+uB`を実数で一度計算するものではない。各段で8 bitへ戻すため、横方向の量子化誤差が縦方向へ入力される。一方、`u8=0`ならA、`u8=255`ならBを8 bit全組合せで正確に返すことを独立監査で全数確認した。

### Y.13 ColorMixerの式をbit sliceまで読む

既定の8 bit精度では、`ColorMixer.v`の一channelは二つの積を17 bitで加え、定数255を加える。bit16が1なら255へ飽和し、そうでなければbit15から8を結果にする。従って正確な整数式は次である。

```text
result = min(255, floor((A*B + C*D + 255)/256))
```

独立監査はA、B、C、Dを0から255の乱数20万組で計算し、bit shiftで書いた式と一致すること、結果が0から255に収まることを確認した。この式はtexture filterだけでなくColorBlenderでも使われる。

### Y.14 alpha blendの具体例

Breakoutの文字は`SRC_ALPHA`と`ONE_MINUS_SRC_ALPHA`を使う。source colorをCs、destination colorをCd、source alphaをAsとすると、各RGB channelは次の整数式になる。

```text
Cout = min(255, floor((Cs*As + Cd*(255-As) + 255)/256))
```

例えば`Cs=255`、`Cd=0`、`As=128`なら次である。

```text
Cout = floor((255*128 + 0*127 + 255)/256)
     = floor(32895/256)
     = 128
```

同じfragmentが共有辺で二度処理されると、二回目のCdは一回目の結果である。従って半透明textureを二三角形で描くと、共有対角線だけ濃くなる可能性がある。これは付録X.14の境界規則と本節の混色式を組み合わせた帰結である。

### Y.15 test、stencil、logic operationを区別する

PerFragment pipelineには複数の機能がある。

| 機能 | 入力 | 主な出力 |
|---|---|---|
| alpha test | 新fragmentのalphaと基準値 | fragmentを通すか |
| depth test | 新depthと保存済みdepth | fragmentを通すか、depth更新 |
| stencil test | 保存済みstencilと基準値 | 通過判定とstencil更新 |
| blend | 新色、旧色、factor | 算術的に混ぜた色 |
| logic op | 新色、旧色 | AND、OR、XORなどのbit演算色 |

testの比較関数とstencil operationはenumで選び、公式software試験と一部RTL試験がある。blendとlogic opは同時に同じ意味で使う処理ではない。機能enable、比較結果、write maskを順に追わないと、「testに落ちた」「maskで書かなかった」「同じ値を書いた」を区別できない。

### Y.16 量子化誤差を一つの数字へまとめない

最終画素までには複数の誤差源がある。

| 段階 | 主な誤差・境界 |
|---|---|
| float座標→Q5 | `+0.5`後の0方向切捨て、負数非対称 |
| barycentric計算 | int32 overflow、float除算 |
| float属性→fixed | guard bit丸め、overflow時0 |
| fixed increment | 32 bit wrap |
| reciprocal | 有限初期推定とNewton反復2回 |
| texture座標 | S16.15へのshiftと切捨て |
| filter weight | Q0.16から上位8 bitだけ使用 |
| ColorMixer | `/256`、`+255`、各段8 bit化 |
| external color | RGBA内部値からRGB565へ量子化 |

「誤差は最大1」と一括して断定できない。各段の入力範囲と、誤差が次段で増幅されるかを調べる。二次元Breakoutでは一様色の図形が多く、textureは文字だけなので、座標境界とalpha blendを優先して試験する。

### Y.17 二次元だから不要になる処理と残る処理

| 処理 | 2D Breakoutでの状態 |
|---|---|
| perspectiveの見た目 | 正投影なので通常は不要 |
| perspective補正回路 | 汎用pipelineとして通る |
| depth test | applicationがdisable |
| depth値の補間 | 記述子・pipelineには残る |
| texture | 文字で使用 |
| bilinear filter | texture設定に従って使用 |
| alpha blend | 文字で使用 |
| shared-edge規則 | 四角形を二三角形にするため関係する |

「2DだからRasterizerの数値問題は関係ない」とは言えない。奥行きの理解を発表の中心にしなくても、四角形の境界、文字texture、alpha blendは本研究の画像へ直接作用する。

## 付録Z 数学、source、試験を結び付けた検証記録

### Z.1 完璧という語を検証可能な主張へ分解する

有限規模の卒業研究で、C++、SystemVerilog、compiler、FPGA、DDR3、displayを含む全状態について誤りが存在しないことを証明するのは現実的でない。本付録では代わりに、主張ごとに前提、導出、試験、未確認範囲を示す。

![図Z.1 数式から実機までの検証層と各層が証明しないもの](figs/rix-verification-layers.png)

| 証拠 | 強く言えること | それだけでは言えないこと |
|---|---|---|
| 代数導出 | overflow前の式が全入力に成立 | RTLの配線が式どおり |
| SMTによる反例探索 | 論理式と前提の範囲で反例がない | 数式化していない回路状態、tool自体の誤り |
| source inspection | 固定commitの記述内容 | synthesis後の全動作 |
| C++ source harness | そのcompiler・入力での出力 | 他の全入力、RTL同値 |
| official CTest | 登録されたcaseが成功 | 未登録module、実機統合 |
| independent randomized audit | 多数caseで恒等式の実装が一致 | 無限入力の形式証明 |
| FPGA実機画像 | そのbitstream・sceneで表示 | 内部全状態や境界case |

### Z.2 固定したsourceと変更禁止範囲

| 対象 | commit | 状態 |
|---|---|---|
| Wally統合repository | `d3e181ac434a01a1f174549b5fbc7ee03a8875b4` | 監査開始時clean |
| 公式RasterIX submodule | `9fdcf97a31b2e4247594e06d605871980cd5e9e1` | 監査開始時clean |

監査programとbuild directoryはrepository外へ置き、RasterIX sourceを変更していない。公式sourceを変えずにinclude・linkし、結果だけを研究資料側へ保存した。

### Z.3 公式software試験

out-of-tree buildでsoftware CTest 9件を実行し、9件すべて成功した。

| test | 結果 |
|---|---|
| attributeInterpolator | pass |
| blendFunc | pass |
| fog | pass |
| logicOp | pass |
| rasterizer | pass |
| stencilOp | pass |
| testFunc | pass |
| texEnv | pass |
| textureMap | pass |

software rasterizer試験には`w==0`の境界を含むcaseがある。これはsoftware modelの境界規則を確認するが、RTL Rasterizerの同値を直接試験しない。

### Z.4 公式Verilator試験

Verilator 5.026を使うout-of-tree buildで、登録された31件すべてが成功した。数値経路に直接関係する主なtestは次である。

| test | 主に確認する対象 |
|---|---|
| attributeInterpolationX | fixed属性の増分更新 |
| attributePerspectiveCorrectionX | 逆数、texture復元、color・depth出力 |
| triangleStreamF2XConverter | float語からfixed語への変換 |
| textureSampler | 四texel address、clamp、sub-coordinate |
| colorInterpolator | 8 bit色補間 |
| texEnv | textureと前段色の合成 |
| framebufferScissor | 半開区間のwrite mask |
| stencilOp、logicOp | 画素単位operation |

`sim_rasterizer.cpp`という名前のfileは存在するが、内容は有効なRasterizer検証を行わず、CTestにもRTL Rasterizer試験として登録されない。このため31/31成功を「Rasterizerを含む全RTLの証明」と解釈しない。

### Z.5 公式C++を呼ぶsource-level監査

`../../experiments/rasterix-math/rasterix_descriptor_audit.cpp`は、公式`Rasterizer.cpp`とsoftware rasterizerをrepository外でcompileし、次をassertした。

1. Breakoutと同じ半画素移動をした4×4四角形を二三角形へする。
2. 二つの`TriangleDesc`を公式software rasterizerへ渡す。
3. 画素集合の和が16であることを確認する。
4. 共有辺4画素が重複し、fragment合計が20であることを確認する。
5. scissorが記述子bounding boxを書き換えないことを確認する。
6. `Veci::createFromVec`の負数を含む8入力を確認する。

| 観察値 | 結果 |
|---|---|
| triangle 0 bounding box | [0,0,5,5] |
| triangle 1 bounding box | [0,0,5,5] |
| union | 16画素 |
| overlap | 4画素 |
| fragment合計 | 20 |
| scissorによるdescriptor bbox書換え | false |
| Q5変換 | [-31,-15,0,0,1,16,32,48] |

この試験はRTL Rasterizerを実行していない。しかし、CPU側記述子、software walker、既存境界規則を同じ入力で具体化し、従来説明の誤りを見つける役割を果たした。

### Z.6 独立したRTL Rasterizer監査

公式repositoryには有効なRTL Rasterizer単体試験が登録されていなかったため、`qa/rtl_rasterizer_audit`にrepository外のVerilator harnessを作った。公式`Rasterizer.v`は変更せず、moduleへbbox、三辺の初期値、X増分、Y増分を直接与えた。

まず、Z.5で公式C++が作った4×4四角形の二つの記述子を、同じ数値のままRTLへ入れた。software walkerとRTL walkerは同一行を走る順序が一部異なったため、両者については`(x,y,index)`の**多重集合**を比較した。単なる集合ではなく多重集合にしたのは、同じ画素を誤って二度生成した場合も失敗させるためである。二つの三角形はいずれも全fragmentが一致した。

次に、RTL内部の`ready`を周期的に0へし、pipelineの受取り停止を発生させた。この場合はRTLの常時ready実行と、値だけでなく出力順序まで一致した。さらに`w0=w1=w2=0`の1×1境界入力が1画素を生成することを確認した。

最後に、6×6整数格子の36点から異なる三点を選ぶ全組合せを取り、面積0の組を除き、両方の頂点順を試した。各入力について、RTLとは別に三辺の辺関数を全bbox画素で直接評価し、`w0>=0 && w1>=0 && w2>=0`となる参照多重集合を作った。

| 確認 | 結果 |
|---|---:|
| 非退化三角形・両頂点順 | 13,536 case pass |
| 比較したRTL fragment | 86,496 fragment |
| 4×4のsoftware／RTL多重集合 | 二三角形とも一致 |
| 周期ready停止 | 値・順序とも常時ready実行と一致 |
| `w==0`境界 | 1×1の1画素を生成 |

この全数試験は「6×6整数格子から作る三角形」という有限領域では漏れがない。一方、任意の32 bit記述子、画面外座標、全tile offset、算術overflow、synthesis後の回路まで証明するものではない。実行結果は`../../experiments/rasterix-math/rasterix-rtl-rasterizer-audit.json`へ保存した。

Verilatorは`if (rrCmd & RR_CMD_*)`の五箇所に、6 bit値を条件式へ使う`WIDTHTRUNC` warningを出した。現在の定数では、0なら偽、非0なら真という意図どおりにsimulationされ、上記照合も成功した。これは直ちに機能不良を示す結果ではないが、将来のsource整理では`if ((rrCmd & RR_CMD_*) != 0)`と意図を明示できる箇所である。

### Z.7 FloatToIntの4値RTLとArtix-7合成後監査

`qa/float_to_int_audit`は、公式RasterIX checkoutを変更せず、Y.3で示した`shiftSize=0`と極小値aliasを二段階で試した。

1. XSIMで未変更`FloatToInt.v`を4値RTL simulationした。
2. 同じsourceをNexys Videoの`xc7a200tsbg484-1`向けにVivado 2025.2で合成し、functional netlistを4値simulationした。

| 層 | case | pass | fail | 読み取れること |
|---|---:|---:|---:|---|
| 未変更RTL、4値XSIM | 11 | 3 | 8 | shift 0の範囲外bit選択と極小値aliasを検出した |
| Artix-7合成後functional netlist | 11 | 9 | 2 | shift 0代表値は正しいが、極小正負値が±1になる |

未変更RTLのshift 0失敗を、そのままNexys Video上の故障件数と読んではならない。この部分は合成後には正しい。一方、極小値二件は合成後にも再現したため、回路の入力契約または公式RTLで対処すべき実在の数値境界である。ここで確定したのは、RTLと合成後netlistの意味がshift 0で一致しないこと、現在の合成後回路にも5 bit shift量の極小値aliasが残ること、Breakout代表記述子はその値域へ入らないことの三点である。

保存物は次である。

| file | 内容 |
|---|---|
| `../../experiments/rasterix-math/rasterix-float-to-int-rtl-four-state.txt` | 未変更RTLのXSIM log |
| `../../experiments/rasterix-math/rasterix-float-to-int-synthesis.txt` | Artix-7合成log |
| `../../experiments/rasterix-math/rasterix-float-to-int-post-synth.txt` | 合成後functional simulation log |
| `../../experiments/rasterix-math/rasterix-float-to-int-audit.json` | caseごとの入力、offset、出力、期待値 |

### Z.8 独立した数理監査

`../../experiments/rasterix-math/rasterix_math_audit.py`は公式実装を呼ばず、式をPythonの任意精度整数で独立計算した。

| 確認 | case数 | 結果 |
|---|---:|---|
| 辺関数の和とX・Y増分 | 200,000 | pass |
| clip交点の平面距離 | 100,000 | pass |
| ColorMixer式 | 200,000 | pass |
| 8 bit補間の両端 | 65,536組×両端 | pass |
| bilinearの四隅 | 4 | pass |
| fixed形式の範囲 | 4形式 | pass |
| FloatToInt underflow指数分類 | 正規化指数254個×3形式 | counterexampleと安全域を確認 |
| 640×480のint32面積上限 | 1 | pass |

乱数seedは`0x524958`に固定し、同じcaseを再現できる。JSON結果は`../../experiments/rasterix-math/rasterix-mathematical-audit.json`へ保存した。

乱数試験とは別に、`../../experiments/rasterix-math/rasterix_formal_audit.py`をZ3 5.1.0で実行した。各命題の否定をsolverへ渡し、`unsat`、すなわち記した前提の下では反例が存在しないことを確認した。

| 形式的に確認した命題 | 変数領域 | 結果 |
|---|---|---|
| 三辺関数の和が向き付き面積に等しい | 数学的な全整数 | 反例なし |
| X・Y一画素移動の増分式 | 数学的な全整数 | 反例なし |
| 遠近補正で共通非0倍率が比から消える | 分母非0の実数 | 反例なし |
| clipping交点の平面距離が0 | 二距離が異なる実数 | 反例なし |
| 17 bit ColorMixer bit sliceと整数式が同値 | 全有効中間値255から130,305 | 反例なし |
| ColorMixer出力が0から255 | 同上 | 反例なし |
| 8 bit補間の`u=0`と`u=255`が両端値を返す | A、Bの全65,536組に相当する整数制約 | 反例なし |
| FloatToIntの`p=-1`は絶対値1へ丸める | 全24 bit正規化仮数 | 反例なし |
| FloatToIntの`-102<=p<=-2`は数学上0へ丸める | 全24 bit正規化仮数と指数 | 反例なし |
| sourceの`-8<=p<=-2`で選ぶround bitは0 | 全24 bit正規化仮数と指数 | 反例なし |
| sourceの`p=-1`で選ぶround bitはhidden bitの1 | 全24 bit正規化仮数 | 反例なし |
| sourceの`0<=p<=22`は絶対値のhalf-up式と同値 | 全24 bit正規化仮数と23指数 | 反例なし |
| sourceの`24<=p<=30`は正確な左shiftでsigned正値範囲内 | 全24 bit正規化仮数と7指数 | 反例なし |
| 負号の`~magnitude+1`は32 bit剰余否定 | 全32 bit pattern | 反例なし |

Z3では16命題の否定を`unsat`とした。これとは別に、辺関数の長方形上限は多重一次式の極値が隅で得られる性質を使い、各画面について64隅組を任意精度整数で全数確認した。監査JSON上は合計17検証項目であり、結果は`../../experiments/rasterix-math/rasterix-formal-audit.json`へ保存した。Z3の証明も、有限bit C++やRTLが正しく配線されていることを単独で証明しないため、source試験とRTL試験を別に残す。

### Z.9 主張からsourceと試験への対応表

| 主張 | 主なsource | 検証 |
|---|---|---|
| Q5式は`trunc(32x+0.5)` | `lib/gl/math/Veci.hpp` | C++ harness、Python既知値 |
| bboxは`+16`と`+48`後にshift | `lib/gl/renderer/Rasterizer.cpp` | C++ harnessの[0,0,5,5] |
| 辺増分は一定 | `Rasterizer.cpp` | 代数導出、Z3反例なし、20万case |
| insideは三辺`>=0` | `rtl/RasterIX/Rasterizer.v` | source inspection、software境界test、RTL有限全数試験 |
| top-left規則なし | `Rasterizer.v` | source inspection、software／RTLの4画素重複 |
| scissorは半開区間 | `FramebufferScissor.v` | 公式Verilator test |
| CPU scissorはbboxを書換えない | `Rasterizer.cpp` | C++ harness |
| texture固定形式はS3.28 | `TriangleStreamF2XConverter.v` | 公式converter test |
| shift 0のRTLと合成後挙動は異なる | `FloatToInt.v` | XSIM 4値RTL、Vivado Artix-7合成後simulation |
| 極小floatは5 bit shift量でaliasし得る | `FloatToInt.v` | 代数的分類、正負のRTL・合成後再現、Breakout代表descriptor監査 |
| perspective段は17 cycle | `AttributePerspectiveCorrectionX.v` | source、公式Verilator test |
| ColorMixerは`(+255)/256` | `ColorMixer.v` | Z3で全有効17 bit中間値、20万case、端点全数 |
| Breakoutは半画素移動する | `examples/rasterix/BreakoutRenderer.hpp` | source、画素集合test |

### Z.10 今回訂正した説明

| 以前の読み方 | source照合後の説明 |
|---|---|
| 辺関数は画素中心へ直接0.5を足して評価する | 辺関数sampleは整数格子。0.5はbbox整数化とBreakout側変換に別々に現れる |
| Q5変換は正負対称な四捨五入 | `value×32+0.5`を0方向へ整数化するため負数で非対称 |
| 共有辺は片方だけが描く | top-left規則がなく、4×4例では4画素を両方が生成 |
| CPU scissorがbboxを切り詰める | CPUは非重複を早期除外するだけで、画素maskはRTL後段 |
| 公式RTL Rasterizer testがある | file名はあるが有効な登録testではないため、repository外の独立Verilator試験を追加した |
| fixed変換は範囲外を飽和する | `FloatToInt` overflowは0を出す |
| Verilatorで通れば4値RTLでも定義済み | `shiftSize=0`は2値Verilatorで見えず、4値RTLでは不定値が現れる。ただしArtix-7合成後代表値は正しい |

訂正を残す理由は、最初から正しかったように見せるためではない。どの思い込みがsourceと一致しなかったかを明示すると、同じ誤読を防げる。

### Z.11 再実行手順

公式checkoutを変更せず、監査側のPythonを再実行する。

```bash
python ../../experiments/rasterix-math/rasterix_math_audit.py
```

形式監査には`z3-solver`が必要である。

```bash
python ../../experiments/rasterix-math/rasterix_formal_audit.py
```

公式software testの保存済みbuildを再実行する例は次である。

```bash
cd "$RESEARCH_ROOT/build/rasterix-software"
ctest --output-on-failure
```

公式Verilator testは次である。

```bash
cd "$RESEARCH_ROOT/build/rasterix-verilator"
ctest --output-on-failure
```

C++ source harnessの実行結果はJSONとして保存する。

```bash
"$RESEARCH_ROOT/build/rasterix-descriptor/rasterix_descriptor_audit"
```

独立RTL Rasterizer監査は、公式checkoutを変更せず次でbuildして実行する。

```bash
bash qa/rtl_rasterizer_audit/build_and_run.sh
```

FloatToIntの未変更RTL 4値simulationとArtix-7合成後simulationは次である。現在の公式sourceでは、最初のcommandは11件中8件、二番目は11件中2件の`AUDIT_FAIL`を検出し、どちらも非0終了する。これは試験環境の失敗ではなく、前者では`shiftSize=0`の4値RTL問題と極小値alias、後者では合成後にも残る極小値aliasを再現した結果である。case別の期待値と実測値は`../../experiments/rasterix-math/rasterix-float-to-int-audit.json`で照合する。

```bash
bash qa/float_to_int_audit/run_vivado.sh
bash qa/float_to_int_audit/run_post_synth.sh
```

build directoryは再利用物なので、別PCでの再現には同じcommitからCMake configureとcompileをやり直す。成功条件はtest数だけでなく、0 failure、使用commit、compiler、Verilator versionを一緒に保存することである。

### Z.12 まだ証明していないこと

| 未証明項目 | 現在言える範囲 | 次の検証 |
|---|---|---|
| RTL Rasterizerと参照式の任意入力同値 | 6×6格子の13,536 caseと4×4実記述子は一致 | 形式検証または入力範囲を拡大した差分試験 |
| 全座標でoverflowしないこと | 640×480の単純上限は安全 | 64 bit referenceと全descriptor range assertion |
| q=0、負qの遠近補正 | current testは正q | 入力契約をassertし、異常caseを試験 |
| FloatToIntの任意float bit patternと合成後回路 | 正規化値の`p=-8..22`と`24..30`は全仮数で式を確認し、11境界値では合成後も比較した。`p<-8`のalias反例も確定 | `p=23`について合成後回路の全仮数同値、subnormal・NaN・infinityの仕様化。RTLを修正する場合は修正版との形式的同値 |
| threaded scissorの開始非0 | source上の不整合候補 | register列からdescriptorまでの単体test |
| 全blend・stencil共有辺結果 | 4×4不透明集合だけ確認 | 半透明・stencil sceneのpixel-exact比較 |
| 任意OpenGL programの仕様準拠 | 本研究で使う機能を確認 | 対象APIごとのconformance corpus |
| synthesis後の算術とRTL simulationの同値 | 公式testと実機scene | formal equivalenceまたはILA trace |
| metastabilityやtiming failureがないこと | timing reportは別資料 | CDC、timing、実機長時間試験 |

この表を空にするまで「完全」と言うのではなく、研究の主張に必要な行を選び、その行の検証を完了させる。Breakoutの設計説明に直接必要なのは、640×480、使用API、固定parameter、実際の四角形・文字sceneである。

### Z.13 RTL Rasterizer監査で固定したものと残る拡張

今回の独立試験は、次のうち1から5を実装した。

1. C++ harnessが作った`TriangleDescX`の全語をtest vectorへ保存する。
2. RTL Rasterizerへ同じbbox、w初期値、X・Y増分を与える。
3. `valid && ready && pixel && keep`のcycleだけ`(spx,spy,index)`を収集する。
4. readyを常時1、周期停止、擬似乱数停止の三条件で実行する。
5. softwareとは画素多重集合を比較し、RTLのready条件間では順序も比較する。
6. `w=0`、1×1、4×4共有辺を個別caseにする。

負座標はmodule portがunsigned画面座標であるため、通常は前段clipping後に現れない。帯offset、空bbox、最大bit幅付近、32 bit wrapは追加余地として残る。現在のtest vectorは、境界規則をtop-leftへ変更したとき、意図した画素差とready停止への耐性をreviewする基礎になる。

### Z.14 「正しい画像」と「正しい内部処理」を分ける

4×4四角形は最終画像として16画素を正しく塗るが、内部では20 fragmentを生成する。この例は、画像一致だけでは内部効率や副作用を証明できないことを示す。

| 観点 | 4×4不透明例 |
|---|---|
| 覆われた画素集合 | 正しい16画素 |
| 欠け | なし |
| fragment重複 | 4 |
| 不透明な最終色 | 見た目は同じ |
| blend・stencilへの一般化 | 別試験が必要 |
| 性能 | 重複分のpipeline仕事が増える |

発表では「四角形が正しく見えた」と「fragmentが一度ずつ処理された」を同じ結果として述べない。

### Z.15 本研究で採用できる最終的な主張

現在の証拠から、次は根拠を示して述べられる。

1. 固定した公式RasterIXを変更せずWallyへ結合した。
2. 640×480のBreakoutと同じ半画素規則を使う画面内4×4例は、16画素を隙間なく覆う。
3. RasterIXの辺関数増分とbarycentric恒等式は、overflow前の全整数について代数導出とZ3の反例なし結果が一致した。
4. 固定小数点、遠近補正、texture、混色の実装形式とlatencyをsourceへ対応付けた。
5. 公式software 9件とVerilator 31件は固定環境で全件成功した。
6. 独立RTL Rasterizer監査では、6×6格子の13,536入力と86,496 fragmentが参照式に一致し、4×4実記述子とready停止も一致した。
7. 共有辺の二重fragment、負座標丸め、CPU scissorの役割、任意32 bit入力の形式証明不足を限界として特定した。
8. float-to-fixedのshift 0境界では未変更RTL 4値simulationとArtix-7合成後simulationが異なり、合成後のshift 0代表値は期待値と一致した。
9. 5 bit shift量による極小値aliasをRTLと合成後回路で再現し、現在のBreakout代表descriptorがその値域へ入らないことを確認した。
10. 正規化有限値について、`p=-8..22`と`p=24..30`のsource算術を全24 bit仮数で形式確認し、未定義の`p=23`と誤変換し得る`p<-8`を証明範囲から分離した。

「RasterIX全体を数学的に完全証明した」「任意のOpenGL programで正しい」「すべての境界条件を試験した」とは述べない。主張を狭くすることは成果を弱める行為ではなく、どこまで確認したかを第三者が再現できる形にする行為である。
