<!-- appendix-content:start -->
<a id="ch_10"></a>
# 第10章 命令pipelineとarchitectural state
<!-- appendix-content:end -->

[付録の総目次](../../技術付録.md) ｜ [論文本文](../../本文.md) ｜ [参考文献](../references.md)

[第II部 Wally CPUとSoCアーキテクチャ](README.md)

ファイルパスの表記は、[資料フォルダー](../../README.md)を基準とする。

## このページの目次

- [10.1 一命令の流れを最後まで追う](#s_10_1)
- [10.2 architectural stateと一時状態](#s_10_2)
- [10.3 control hazardと分岐予測](#s_10_3)
- [10.4 data hazardとforwarding priority](#s_10_4)
- [10.5 structural hazard](#s_10_5)
- [10.6 precise trapとcommit](#s_10_6)
- [10.7 CSR、interrupt、exception](#s_10_7)
- [10.8 performance counterを解釈する](#s_10_8)
- [10.9 pipeline変更のreview表](#s_10_9)

<!-- appendix-content:start -->
<a id="s_10_1"></a>
## 10.1 一命令の流れを最後まで追う

一つの`add x5, x6, x7`を例にする。Fetchで命令を読み、Decodeでopcodeとregister番号を読み、register fileからx6とx7を得る。Executeで加算し、Memoryではload/storeでないため結果を通し、Writebackでx5へ書く。各stage間のregisterはdataとcontrolを同じ命令として運ぶ。

追跡時はPC、命令word、source値、ALU control、結果、destination番号、write enableを表にする。波形で一つだけstageがずれていれば、別命令のcontrolで値を書き込む重大な誤りになる。

<a id="s_10_2"></a>
## 10.2 architectural stateと一時状態

general-purpose register、PC、CSR、memoryのsoftware-visible内容はarchitectural stateである。pipeline register、予測器counter、cache tag、FIFO pointerはmicroarchitectural stateである。microarchitectural stateは実装により違ってよいが、最終的にISAで許されるarchitectural結果を作る必要がある。[RISCVUnpriv26](../references.md#ref_riscvunpriv26)[RISCVPriv26](../references.md#ref_riscvpriv26)

debug時にpipeline内部の一時値が違うだけでISA違反とは限らない。retireした命令列とarchitectural stateを比較する。逆に、最終画面が同じでも例外順序やmemory side effectが違えば、CPUとして正しいとは限らない。

<a id="s_10_3"></a>
## 10.3 control hazardと分岐予測

branchの行先はFetch時には未確定である。予測器は先にPCを選び、後段で条件とtargetが確定したとき、誤りなら若い命令をflushする。予測は性能機能であり、誤予測してもarchitectural結果は正しくなければならない。

予測器変更ではaccuracyだけでなく、誤予測回復、RAS、BTB、instruction class予測、flush stageを確認する。予測情報の更新がsquashされた命令で行われないかも検討する。

<a id="s_10_4"></a>
## 10.4 data hazardとforwarding priority

複数の後段stageが同じsource registerの新しい値を持つ場合、最も新しい命令の結果を選ぶ。Memory stageとWriteback stageの両方が一致したときのpriorityを明示する。x0は常に0であり、x0へのwrite予定をforward sourceとして扱わない。

load-useではdataが得られる時刻を確認する。cache hit、uncached bus、miss refillでlatencyが違う場合、固定一cycleの想定だけでは不十分になる。valid/readyまたはstallで完了まで保持する。

<a id="s_10_5"></a>
## 10.5 structural hazard

二つの処理が同じhardwareを同cycleに必要とするとstructural hazardになる。単一port memoryをinstructionとdataが同時に使う、一つのdividerへ別命令を投入する、共有busへIFUとLSUが要求する場合が例である。

対策は資源複製、port追加、仲裁、stall、schedule変更である。面積と性能のtrade-offを測る。WallyのEBUはIFUとLSU要求を外部AHBへ仲裁するため、bus側の完了とpipeline stallが結び付く。

<a id="s_10_6"></a>
## 10.6 precise trapとcommit

trap発生時に、どこまでを完了した命令と見なすかがcommit境界である。storeが外部へ出た後で命令をflushしても、周辺回路のside effectは取り消せない。このためbus transaction開始条件と、interruptを受けられる安全な時点を設計する。

`BusCommitted`のようなsignalは、進行中memory operationがありinterruptで中断すべきでない期間を示す。名前だけで意味を推測せず、assert条件、解除条件、trap logicでの利用先を追う。

<a id="s_10_7"></a>
## 10.7 CSR、interrupt、exception

CSR instructionは通常のregister fileとは別のarchitectural stateを読み書きする。interruptは外部またはtimerなどの非同期的な出来事を、instruction境界でtrapとして扱う。exceptionは実行中命令に起因するillegal instruction、page fault、misalignmentなどである。

同じtrap経路を使っても原因と再開PCは異なる。`mepc`、`mcause`、`mtval`などへ何を記録するかを仕様とtestで照合する。device interrupt追加では、peripheralのpending、PLIC source、CSR enable、global enable、handlerまで全経路を確認する。[RISCVPriv26](../references.md#ref_riscvpriv26)

<a id="s_10_8"></a>
## 10.8 performance counterを解釈する

cycle、retired instruction、cache miss、branch mispredictionなどのcounterは、性能原因を分解する材料になる。CPIはcycle/instructionである。clock frequencyとCPIを組み合わせて実行時間を考える。

counterの定義、増えるevent、reset、overflow、privilege accessを確認する。softwareの区間計測では、計測前後のfence、compiler最適化、warm-up、OS割込みを考える。counter一個だけで「GPUが遅い」「CPUが遅い」と断定しない。

<a id="s_10_9"></a>
## 10.9 pipeline変更のreview表

| 観点 | 確認質問 |
|---|---|
| data | 新しい値はどのstageで生成されるか |
| control | その値のvalidと選択信号は同じstageか |
| hazard | forwarding、stall、flushへ何を足すか |
| exception | fault時にside effectを止められるか |
| timing | どのregister間pathが長くなるか |
| verification | 依存命令、branch、trap、stallを試したか |

pipeline registerを一個足す変更でも、この全項目を確認する。
<!-- appendix-content:end -->

---

[前：第9章 Wallyの階層と構成を読む](chapter-09.md) ｜ [次：第11章 Memory systemとon-chip bus](chapter-11.md)
