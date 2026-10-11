<!-- appendix-content:start -->
<a id="ch_3"></a>
# 第3章 資源効率を決めるRTL設計
<!-- appendix-content:end -->

[付録の総目次](../../技術付録.md) ｜ [論文本文](../../本文.md) ｜ [参考文献](../references.md)

[第I部 HDLとFPGAによるデジタル回路設計](README.md)

ファイルパスの表記は、[資料フォルダー](../../README.md)を基準とする。

## このページの目次

- [3.1 「好ましい書き方」の意味](#s_3_1)
- [3.2 MUXとpriority論理](#s_3_2)
- [3.3 演算子と専用資源](#s_3_3)
- [3.4 bit幅は面積と遅延の設計値である](#s_3_4)
- [3.5 memoryをBRAMへ推論させる](#s_3_5)
- [3.6 register enableとclock gating](#s_3_6)
- [3.7 hardwareの並列化と資源共有](#s_3_7)
- [3.8 fanout、logic depth、routing](#s_3_8)
- [3.9 hierarchyを保つ理由とflattenする理由](#s_3_9)
- [3.10 resource reportを読む](#s_3_10)
- [3.11 最適化の前後で保存する証拠](#s_3_11)

<!-- appendix-content:start -->
<a id="s_3_1"></a>
## 3.1 「好ましい書き方」の意味

資源効率のよいRTLには、単一の万能な書式はない。望むhardwareを明確に暗示し、target deviceが持つ専用資源へtoolが推論でき、timing制約と機能要求を満たす書き方が好ましい。可読性だけ、行数だけ、LUT数だけで決めない。[Harris26](../references.md#ref_harris26)[AMD901](../references.md#ref_amd901)[AMD949](../references.md#ref_amd949)

![図3.1 RTLの形から推論される主なFPGA資源](../../figs/wdev-synthesis-resources.png)

最適化前に、baselineの機能、clock、utilization、timing、power条件を保存する。変更後は同じ条件で比較する。異なるVivado版、strategy、constraintを混ぜると、RTL変更の効果とtool設定の効果を分離できない。

<a id="s_3_2"></a>
## 3.2 MUXとpriority論理

三項演算子や`case`はMUXを推論する。互いに排他的な選択なら平衡したMUXになりやすい。長い`if`/`else if` chainは先頭条件に優先順位を与え、priority chainを作る可能性がある。優先順位が仕様なら正しいが、不要な優先順位はlogic depthを増やし得る。

one-hot selectをORでまとめる場合は、本当に同時に一つしか立たないことをassertする。Wallyのuncore読出しMUXはaddress decodeの選択を前提に複数dataをまとめる。decoderとMUXを別々に読むだけでなく、選択の排他性、未選択時のready、errorを一組で確認する。

<a id="s_3_3"></a>
## 3.3 演算子と専用資源

加算・減算はFPGAのcarry chainを使いやすい。定数shiftは配線変更だけで済むことが多いが、可変shiftはMUX段を持つbarrel shifterになり得る。乗算は幅や設定によりDSPへmappingされるかLUTへ実装される。除算は組み合わせで大きな回路にするか、複数cycleの反復器にするかで面積とlatencyが大きく異なる。

演算子を手作りgateへ展開すれば必ず小さくなるわけではない。合成toolは既知の演算構造を認識して最適化する。専用資源を使いたい場合は、AMDの推論template、synthesis report、technology schematicを照合する。[AMD901](../references.md#ref_amd901)

<a id="s_3_4"></a>
## 3.4 bit幅は面積と遅延の設計値である

data幅を64 bitから32 bitへ減らせば、加算器、MUX、register、配線の多くは小さくなる。ただし、architectureが64 bitを要求する経路を狭めれば機能を壊す。address全体、data全体、index、offset、counterなど、必要範囲を別々に求める。

counterが0から999までなら10 bitで足りるが、将来parameterを増やすなら`$clog2`の境界、値1、power-of-two、最大値を確認する。`$clog2(1)`が0になる状況で0幅vectorを作らないよう、最小幅を定める。

<a id="s_3_5"></a>
## 3.5 memoryをBRAMへ推論させる

大きな配列をFFで作ると資源を大量に使う。Vivadoは特定の同期read/write idiomからblock RAMを推論できる。非同期read、port数、byte enable、read-during-writeの意味、reset方法がprimitiveの能力と合わない場合、distributed RAMやFFへ崩れることがある。[AMD901](../references.md#ref_amd901)

Wallyの`src/generic/mem`には、用途別のmemory wrapperがある。設計者は個々のmoduleで独自配列を乱立させず、必要なport、latency、byte enable、初期化、ASIC/FPGA差をwrapperへ集約する。memoryの出力だけをresetできる場合と、配列全bitをresetしようとしてBRAM推論を失う場合を区別する。

<a id="s_3_6"></a>
## 3.6 register enableとclock gating

値を更新しないcycleでは、`if (en) q <= d;`というclock enableを使う。FPGAのFFにはenable機能があり、合成toolが利用できる。一般RTLで`clk & en`を作り、それを新しいclockとして配ると、glitch、skew、未制約clockを招く。clockを止める必要がある場合は専用clocking resourceと設計methodologyを使う。

enableにもcostがある。多数のregisterへ一つのenableを配るとhigh fanout netになる。data側MUXと専用enableのどちらになるか、fanout、placement、powerをreportで確認する。

<a id="s_3_7"></a>
## 3.7 hardwareの並列化と資源共有

二つの演算を同じcycleに実行するなら、原則として二つ分の演算資源が必要になる。一つの乗算器を二cycleで共有すれば面積を減らせるが、MUX、FSM、registerが増え、latencyとthroughputが変わる。資源共有は「同時に必要でない」ことをscheduleとして設計する作業である。

CPU pipelineでは、各stageが異なる命令を同時処理する。ALUを別stageの処理と安易に共有すると、structural hazardが生じる。共有するならstall条件と性能影響まで設計する。

<a id="s_3_8"></a>
## 3.8 fanout、logic depth、routing

一つのsignalが数千のendpointを駆動すると、driverの複製や長いroutingが必要になる。RTL上の論理段数が少なくても、routing delayがcritical pathの大半になる場合がある。reset、stall、global enable、wide decodeはhigh fanoutになりやすい。

対策には、階層ごとのlocal decode、register複製、pipeline、物理的に近い階層分割がある。ただし手動複製は等価性と更新の同時性を守る。まずtiming reportでlogic delayとnet delay、fanoutを確認し、想像だけで複製しない。[AMD906](../references.md#ref_amd906)[AMD949](../references.md#ref_amd949)

<a id="s_3_9"></a>
## 3.9 hierarchyを保つ理由とflattenする理由

module階層は理解、再利用、局所検証に役立つ。一方、強い階層境界が最適化を妨げることもある。Vivadoは階層をflattenまたはrebuiltし、境界を越えて最適化できる。debugしやすさ、incremental build、OOC IP、timing最適化のtrade-offを考える。

source上のmodule名が合成後に残るとは限らない。階層別utilizationを比較したい場合は、同じflatten方針とreport条件を固定する。

<a id="s_3_10"></a>
## 3.10 resource reportを読む

総使用率だけでなく、階層別のLUT、LUTRAM、FF、BRAM、DSP、BUFGを読む。利用率が低くてもtimingは失敗し得る。逆に高利用率でも、配置可能でslackが正なら動作し得るが、routing congestionや将来拡張の余裕は小さい。

LUT数が減ってFF数が増えるpipeline化、BRAMが増えてLUTRAMが減るmemory推論など、一種類だけの増減で優劣を決めない。目的が最高clock、最低面積、最低latency、最低powerのどれかを明示する。

<a id="s_3_11"></a>
## 3.11 最適化の前後で保存する証拠

| 種類 | 最低限保存するもの | 比較時の注意 |
|---|---|---|
| source | commitとdiff | generated fileだけを比較しない |
| 機能 | 同じtestと結果 | 入力seed、parameterを固定する |
| 合成 | utilization階層表 | target device、strategyを固定する |
| timing | worst path、WNS、TNS | clockとexceptionを固定する |
| 実機 | bitstream hash、条件、log | 古いbitstreamとの取り違えを防ぐ |

「資源効率がよい」と主張するなら、少なくとも機能が同じであることと、比較したresource指標を示す。「高速化した」と主張するなら、timing closureと実行性能のどちらを意味するかを分ける。
<!-- appendix-content:end -->

---

[前：第2章 SystemVerilogから回路を読み取る](chapter-02.md) ｜ [次：第4章 Timing closureとpipeline設計](chapter-04.md)
