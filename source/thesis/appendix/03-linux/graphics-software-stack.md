## 第32章 RasterIXの描画ソフトウェアの処理経路

描画関数を呼んだ後には、CPU上のライブラリが頂点や色を整理し、回路が読める数値列を用意する処理が続く。この章は、その途中で何が保存され、どの関数が次の処理へ渡すかをコードの層ごとに説明する。

### 32.1 一つのOpenGL風呼出しは直接register一語ではない

gameは`glBegin`、`glVertex`、`glColor`などのAPIを使う。RasterIXのソフトウェア側はcurrent state、頂点配列、matrix、primitive assembly、clipping、triangle descriptor、display listを処理し、最終的に32 bit word列を`IBusConnector`へ渡す。

![図32.1 game APIからWallyBusConnectorとRasterIX RTLまでのsoftware stack](figs/deep-rasterix-software-stack.png)

### 32.2 API stateとdraw call

OpenGLのimmediate modeでは、`glColor`は以後の頂点に関連付くcurrent colorを変える。`glBegin`はprimitive種別を開始し、`glVertex`は頂点を蓄え、`glEnd`でまとまりを処理する。関数名一つがその場で画素を塗るとは限らない。

matrix、viewport、テクスチャ enable、depth test、blendなどもstateである。draw時に現在stateと頂点を組み合わせ、ハードウェア commandへ変換する。state changeの順序が描画結果を変える。

### 32.3 `ThreadedVertexTransformer`と本構成

upstream ソフトウェアはworkerとtransfer runnerを抽象化し、並列実行可能な構造を持つ。本構成はsingle-core Wallyで`NoThreadRunner`を使い、処理と転送を順次実行する。class名にThreadedとあっても、実際に別threadが走るかは渡したrunnerで決まる。

この選択は正しさと初期統合を単純にする。将来thread化しても20 MHz single-coreでは同時実行のハードウェア coreが増えるわけではなく、context switchと同期costがある。測定して判断する。

### 32.4 command用buffer

`WallyBusConnector`は複数の`std::vector<uint32_t>`を持ち、upstreamからwrite bufferを要求されたときspanを返す。ソフトウェアはまずhost-side bufferへword列を作り、`writeData`でMMIOへ順番に送る。

これは「GPUがC++ vectorを直接読む」方式ではない。vectorはWallyのプロセス メモリにあり、connectorが各wordをAPB レジスタへstoreする。最後のwordだけoffset 0x04へ書きTLASTを示す。buffer index、size、offsetは範囲と4 byte alignmentを検査する。

### 32.5 二層のpacket

RasterIXには、device data uploadなどを扱う外側のtransfer framingと、rasterizerが解釈する内側のrender commandがある。word列を観察するときは、どのlayerのlength、type、TLASTかを区別する。

一語欠けると後続wordの境界までずれる可能性がある。色だけがおかしい場合、triangle descriptorのfieldかもしれないが、全commandが停止するならpacket length、TLAST、ready/validを先に疑う。

### 32.6 software処理とhardware処理の分担

固定版RasterIXでは、頂点変換や一部triangle setupをソフトウェア側が行い、RTL側はdescriptorからpixel/fragmentを生成し、テクスチャ、test、blend、framebuffer処理を行う。したがって「RasterIXはすべてのOpenGL処理をハードウェアで行う」ではない。

性能を調べるとき、CPU側command preparation、MMIO transfer、GPU execution、DDR commit、display waitを分ける。本研究で測定した準備時間は、ソフトウェア側のdraw call数やcommand作成方法で変わる。

### 32.7 `RIXGL` instanceと初期化

`RIXGL::createInstance`はdeviceとソフトウェア stackを結び、OpenGL風APIのcontextを用意する。resolution変更前後には内部display listがflushされるため、固定版gameはclearを先に実行し、その後resolutionを設定する。これは起動時に古い内部画素が残る問題と関係する。

初期化順は偶然ではない。transport、uploader、runner、device、contextの依存方向を図にし、破棄は逆順にする。constructorが途中でexceptionを投げた場合も既に獲得したresourceが解放されるか確認する。

### 32.8 errorの伝わり方

MMIO mapping失敗、ID不一致、response timeout、display timeoutはC++ exceptionとしてmainへ伝わり、stderrへ表示して非zero終了する。OpenGL state errorは`glGetError`で確認する。

ハードウェアが返すerror bit、transport timeout、API misuseを同じ文字列にまとめない。error code、段、番地、last command countを記録できると診断しやすい。prototypeでもsilent failureを避ける。

### 32.9 sourceを追う具体的な入口

1. `examples/rasterix/breakout.cpp`の`present` lambda。
2. `BreakoutRenderer.hpp`のdraw sequence。
3. upstream `RIXGL`とvertex パイプライン。
4. `DeviceDataUploader`とdisplay list。
5. `WallyBusConnector::writeData`。
6. APB adapterのレジスタ map。
7. async FIFOと`RasterIX_IF`。
8. CommandParser、Rasterizer、PerFragmentPipeline。

各段階でinput型、output型、所有するstate、完了条件を書く。関数名だけを矢印で結ばず、一つの四角形について実際の頂点値とword数を追う。
