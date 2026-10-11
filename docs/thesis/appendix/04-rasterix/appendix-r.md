<!-- appendix-content:start -->
<a id="ch_r"></a>
# 付録R RTL全体の制御と停止を読む
<!-- appendix-content:end -->

[付録の総目次](../../技術付録.md) ｜ [論文本文](../../本文.md) ｜ [参考文献](../references.md)

[第IV部 RasterIXと描画システム](README.md)

ファイルパスの表記は、[資料フォルダー](../../README.md)を基準とする。

## このページの目次

- [R.1 hardware pipelineの全体順序](#s_r_1)
- [R.2 `CommandParser`の三状態](#s_r_2)
- [R.3 なぜ前の仕事の終了を待つのか](#s_r_3)
- [R.4 `ValueTrack`が防ぐread-after-write衝突](#s_r_4)
- [R.5 stream broadcastとconcat](#s_r_5)
- [R.6 validとreadyの受渡し](#s_r_6)
- [R.7 `ce`は低位pipelineの時計を止める許可](#s_r_7)
- [R.8 skid bufferが必要な場面](#s_r_8)
- [R.9 `TLAST`とhidden flush fragment](#s_r_9)
- [R.10 performance信号の意味](#s_r_10)
- [R.11 pipeline latencyとthroughputを分ける](#s_r_11)
- [R.12 reset時に確認する状態](#s_r_12)
- [R.13 control変更の試験観点](#s_r_13)
- [R.14 一つの命令をcycleごとに追う](#s_r_14)
- [R.15 制御変更時に置くassertion](#s_r_15)

<!-- appendix-content:start -->
<a id="s_r_1"></a>
## R.1 hardware pipelineの全体順序

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

<a id="s_r_2"></a>
## R.2 `CommandParser`の三状態

`CommandParser`には、主に`WAIT_FOR_IDLE`、`COMMAND_IN`、`EXEC_STREAM`がある。図R.1は役割を簡略化したものである。

![図R.1 CommandParserの三状態と次の命令を受ける条件](../../figs/rix-command-parser-fsm.png)

`WAIT_FOR_IDLE`では、前の三角形、framebuffer操作、TMUの準備などが終わるのを待つ。`COMMAND_IN`でoperationを解読する。三角形やtextureのように後続streamがある場合、`EXEC_STREAM`で指定先へpayloadを渡す。payloadが終わると次のcommandへ戻る。

<a id="s_r_3"></a>
## R.3 なぜ前の仕事の終了を待つのか

次の三角形のregisterを上書きした時点で、前の三角形のfragmentがまだpipelineに残っていると、前の画素が新しい色や増分を使う危険がある。またFramebufferをclear中にfragmentを書けば、clearと描画の順序が壊れる。

そのため`CommandParser`は、Rasterizerだけでなく、pipeline内の未完了画素、Framebuffer command、texture準備の状態も見て開始を制御する。単に「CPUが遅いから待たなくてよい」とは言えない。CPUが次のcommandをいつ送れるかと、内部pipelineに前の仕事が残るかは別問題である。

<a id="s_r_4"></a>
## R.4 `ValueTrack`が防ぐread-after-write衝突

同じ画素へ連続して二三角形が描かれる場合、後の三角形がFramebufferの古い色やdepthを読んだ後、前の三角形の書込みが遅れて到着すると、順序が逆転する可能性がある。`ValueTrack`はpipeline内の画素数を追跡し、新しい三角形の開始条件を制御する。

これはCPUのregister hazardに似ているが、対象は画素のFramebuffer readとwriteである。公式`design.md`は、前のtriangleのpixelがpipelineを流れている間に次のtriangleを開始するread-before-write conflictを避けるためと説明している。[RasterIX](../references.md#ref_rasterix)

<a id="s_r_5"></a>
## R.5 stream broadcastとconcat

Rasterizerから出た一つのfragment情報は、属性補間器と、color、depth、stencilの読出しへ分岐する。後段では、新しいfragmentの色・depthと、三つの既存値を同じ画素について再結合する必要がある。

`StreamConcatFifo`は、必要な入力がそろうまで待ち、対応する一組として`PerFragmentPipeline`へ渡す。無効にしたbufferの入力はbypassされる。内部Framebufferのread port自体には自由なbackpressureを掛けられないため、read結果を受けるFIFOが必要になる。

<a id="s_r_6"></a>
## R.6 validとreadyの受渡し

高位module間では、送信側が`valid`、受信側が`ready`を出し、両方が1のcycleに一要素が移る。

| valid | ready | 意味 |
|---:|---:|---|
| 0 | 0または1 | 送信側に有効データがない |
| 1 | 0 | データは提示中だが未受領。保持する |
| 1 | 1 | このcycleに一要素を受け渡す |

受信側が停止すると`ready=0`が上流へ戻る。各段は処理中のfragmentを失わず保持する。図R.2では、右端のFramebuffer側の停止が左へ伝わる。

![図R.2 valid／readyで停止がパイプライン全体へ戻る](../../figs/rix-valid-ready-pipeline.png)

<a id="s_r_7"></a>
## R.7 `ce`は低位pipelineの時計を止める許可

高位のvalid／readyを、各演算段内部ではclock enableの`ce`へ変換する。`ce=0`のcycleでは、pipeline registerを更新せず同じ中間値を保持する。物理clockそのものを停止しているのではなく、registerが次の値を取り込まないようにする。

逆数計算や乗算など、複数cycleのpipelineを途中で停止するとき、dataだけでなくvalid、座標、index、lastも同じcycle数だけそろえて停止しなければならない。一つだけ進むと、色と画素addressが別のfragmentの組合せになる。

<a id="s_r_8"></a>
## R.8 skid bufferが必要な場面

readyが0へ変わる情報には組合せ経路の遅延がある。送信側が停止を認識する直前に一語を出していた場合、その一語を一時保存する場所が必要になる。`CommandParser`はskid bufferを持ち、destinationが受け取れない一語を保持する。

skid bufferは大量の待ち行列ではなく、readyの変化を安全に受ける小さな弾力性である。非同期FIFOと目的が異なる。skid bufferは同じclock領域内の即時停止、非同期FIFOはclock領域間のdata transferと短期bufferingを担当する。

<a id="s_r_9"></a>
## R.9 `TLAST`とhidden flush fragment

各triangleの最後を示す`last`は、pipelineのすべての段を通る。Rasterizerは、内部pipelineに残る値を最後まで押し出すため、画素として書かない`tkeep=0`の終端要素を出す場合がある。`valid=1`でも`keep=0`なら、その要素はcontrolを進めるがFramebufferへ有効画素を書かない。

したがって、simulationで出力要素数を数えるとき、`valid`だけで画素数としない。`valid && ready && keep`を有効画素の受渡しとして数える。終端確認には`last`も見る。

<a id="s_r_10"></a>
## R.10 performance信号の意味

上位には`perfBusy`、`perfTriangleRendering`、`perfRasterizerStall`などがある。

| 信号 | 分かること | 分からないこと |
|---|---|---|
| `perfBusy` | command処理がidleでない期間 | どの段が原因か単独では不明 |
| `perfTriangleRendering` | triangle処理が進行中か | 画面全体のFPSではない |
| `perfRasterizerStall` | Rasterizer出力validに対しreadyが0 | downstreamのどの段が根因か |

一つのperformance信号だけでボトルネックを断定しない。例えばRasterizer stallは、TMU、Framebuffer、AXI、またはさらに先の停止がbackpressureで戻った結果かもしれない。段ごとのvalid／readyと一緒に観察する。

<a id="s_r_11"></a>
## R.11 pipeline latencyとthroughputを分ける

あるfragmentが入力から出力まで進むcycle数をlatency、一度pipelineが満たされた後に一cycle当たり何fragmentを受けられるかをthroughputと呼ぶ。17 cycleの補間器でも、各段がpipeline化されていれば、毎cycle一fragmentを受けられる場合がある。

公式コメントには、固定小数点の属性補正約17 cycle、TMU各部の複数段、PerFragment約4 cycleなどの深さが記されている。ただし機能parameter、bypass、stallで実効latencyは変わる。各数を単純加算して「一画素に何cycle」と評価しない。

<a id="s_r_12"></a>
## R.12 reset時に確認する状態

state machine、valid register、FIFO pointer、framebuffer commandの`applied`は、reset解除時に一貫したidle状態でなければならない。Wally構成ではCPU、DDR、pixelのclock領域ごとにresetがある。RasterIX本体はDDR側100 MHzで動く。

reset問題を調べるときは、次を順に確認する。

1. DDR clockが安定している。
2. RasterIX側resetが同期して解除された。
3. command FIFOの両側が空を示す。
4. `CommandParser`が`COMMAND_IN`へ入る。
5. Framebuffer commandが未適用状態に残っていない。
6. 最初のcommand受渡しでvalid／readyが同時に1になる。

<a id="s_r_13"></a>
## R.13 control変更の試験観点

状態機械を変更した場合、正常に連続データを流す試験だけでは足りない。次の停止を挿入する。

| 停止条件 | 期待すること |
|---|---|
| command入力validが途切れる | 受領済みcounterを保持し再開する |
| destination readyが0 | 未転送の語を保持する |
| framebuffer readが遅れる | fragmentと既存値の対応を保つ |
| 最後の一語でstall | lastとdataを保持する |
| resetがpacket途中に入る | 規定のidleへ戻り、古いvalidを出さない |

backpressure試験を行わず、常にready=1だけで通すと、実機の混雑時だけ起きるdata lossを見逃す。

<a id="s_r_14"></a>
## R.14 一つの命令をcycleごとに追う

状態機械を理解するときは、波形全体を眺めるのではなく、一つの短い命令について「そのcycleで所有権が移ったか」を表にする。次は、header一語とpayload二語を持つ命令を、二語目の直前で受信側が一cycle停止する例である。

| cycle | state | input valid | input ready | input data | destination ready | 起きること |
|---:|---|---:|---:|---|---:|---|
| 0 | `COMMAND_IN` | 1 | 1 | header | 1 | headerを受領し、長さと送信先を記録 |
| 1 | `EXEC_STREAM` | 1 | 1 | payload 0 | 1 | 一語目を転送し、counterを一つ減らす |
| 2 | `EXEC_STREAM` | 1 | 0 | payload 1 | 0 | handshakeなし。dataとlastを保持 |
| 3 | `EXEC_STREAM` | 1 | 1 | payload 1 | 1 | 二語目を転送し、最後として完了 |
| 4 | `COMMAND_IN` | 0 | 1 | ― | 1 | 次のheaderを待つ |

cycle 2で`valid=1`でも`ready=0`なので、payload 1はまだ受領されていない。counterを減らしたり、dataを次へ進めたりしてはいけない。cycle 3で`valid && ready`になった瞬間にだけ、同じ語の所有権が次段へ移る。この原則を入力、出力、Framebuffer read responseの各streamで適用する。

<a id="s_r_15"></a>
## R.15 制御変更時に置くassertion

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
<!-- appendix-content:end -->

---

[前：付録Q CPU側で三角形記述子を作る](appendix-q.md) ｜ [次：付録S hardware Rasterizerと属性補間](appendix-s.md)
