## 第15章 命令の流れとプログラムから見えるCPUの状態

命令を途中まで計算した結果と、プログラムが正式な結果として使える値は同じとは限らない。分岐の予測が外れた場合や例外が起きた場合には、途中の処理を取り消す。この章では一命令の計算を追ってから、何を残し、何を止め、何を捨てるかを区別する。

### 15.1 一命令の流れを最後まで追う

一つの`add x5, x6, x7`を例にする。Fetchで命令を読み、Decodeでopcodeとレジスタ番号を読み、レジスタ ファイルからx6とx7を得る。Executeで加算し、Memoryではload/storeでないため結果を通し、Writebackでx5へ書く。各段間のレジスタはdataとcontrolを同じ命令として運ぶ。

追跡時はPC、命令word、ソース値、ALU control、結果、destination番号、write enableを表にする。波形で一つだけ段がずれていれば、別命令のcontrolで値を書き込む重大な誤りになる。

### 15.2 architectural stateと一時状態

general-purpose レジスタ、PC、CSR、メモリのsoftware-visible内容はarchitectural stateである。パイプライン レジスタ、予測器counter、キャッシュ tag、FIFO ポインタはmicroarchitectural stateである。microarchitectural stateは実装により違ってよいが、最終的にISAで許されるarchitectural結果を作る必要がある。[RISCVUnpriv26][RISCVPriv26]

debug時にパイプライン内部の一時値が違うだけでISA違反とは限らない。retireした命令列とarchitectural stateを比較する。逆に、最終画面が同じでも例外順序やメモリ side effectが違えば、CPUとして正しいとは限らない。

### 15.3 control hazardと分岐予測

branchの行先はFetch時には未確定である。予測器は先にPCを選び、後段で条件と対象が確定したとき、誤りなら若い命令をflushする。予測は性能機能であり、誤予測してもarchitectural結果は正しくなければならない。

予測器変更ではaccuracyだけでなく、誤予測回復、RAS、BTB、instruction class予測、flush 段を確認する。予測情報の更新がsquashされた命令で行われないかも検討する。

### 15.4 data hazardとforwarding priority

複数の後段段が同じソース レジスタの新しい値を持つ場合、最も新しい命令の結果を選ぶ。Memory 段とWriteback 段の両方が一致したときのpriorityを明示する。x0は常に0であり、x0へのwrite予定をforward ソースとして扱わない。

load-useではdataが得られる時刻を確認する。キャッシュ hit、uncached bus、miss refillで遅延が違う場合、固定一周期の想定だけでは不十分になる。valid/readyまたはstallで完了まで保持する。

### 15.5 structural hazard

二つの処理が同じハードウェアを同周期に必要とするとstructural hazardになる。単一port メモリをinstructionとdataが同時に使う、一つのdividerへ別命令を投入する、共有busへIFUとLSUが要求する場合が例である。

対策は資源複製、port追加、仲裁、stall、schedule変更である。面積と性能のtrade-offを測る。WallyのEBUはIFUとLSU要求を外部AHBへ仲裁するため、bus側の完了とパイプライン stallが結び付く。

### 15.6 precise trapとcommit

trap発生時に、どこまでを完了した命令と見なすかがcommit境界である。storeが外部へ出た後で命令をflushしても、周辺回路のside effectは取り消せない。このためbus transaction開始条件と、interruptを受けられる安全な時点を設計する。

`BusCommitted`のような信号は、進行中メモリ operationがありinterruptで中断すべきでない期間を示す。名前だけで意味を推測せず、assert条件、解除条件、trap logicでの利用先を追う。

### 15.7 CSR、interrupt、exception

CSR instructionは通常のレジスタ ファイルとは別のarchitectural stateを読み書きする。interruptは外部またはtimerなどの非同期的な出来事を、instruction境界でtrapとして扱う。exceptionは実行中命令に起因するillegal instruction、page fault、misalignmentなどである。

同じtrap経路を使っても原因と再開PCは異なる。`mepc`、`mcause`、`mtval`などへ何を記録するかを仕様とtestで照合する。device interrupt追加では、peripheralのpending、PLIC ソース、CSR enable、global enable、handlerまで全経路を確認する。[RISCVPriv26]

### 15.8 performance counterを解釈する

周期、retired instruction、キャッシュ miss、branch mispredictionなどのcounterは、性能原因を分解する材料になる。CPIはcycle/instructionである。クロック frequencyとCPIを組み合わせて実行時間を考える。

counterの定義、増えるevent、リセット、overflow、privilege accessを確認する。ソフトウェアの区間計測では、計測前後のfence、コンパイラ最適化、warm-up、OS割込みを考える。counter一個だけで「GPUが遅い」「CPUが遅い」と断定しない。

### 15.9 pipeline変更のreview表

| 観点 | 確認質問 |
|---|---|
| data | 新しい値はどの段で生成されるか |
| control | その値のvalidと選択信号は同じ段か |
| hazard | forwarding、stall、flushへ何を足すか |
| exception | fault時にside effectを止められるか |
| timing | どのレジスタ間pathが長くなるか |
| verification | 依存命令、branch、trap、stallを試したか |

パイプライン レジスタを一個足す変更でも、この全項目を確認する。
