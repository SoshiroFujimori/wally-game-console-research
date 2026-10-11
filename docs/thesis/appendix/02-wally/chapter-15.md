<!-- appendix-content:start -->
<a id="ch_15"></a>
# 第15章 IEUとpipeline hazardを深く読む
<!-- appendix-content:end -->

[付録の総目次](../../技術付録.md) ｜ [論文本文](../../本文.md) ｜ [参考文献](../references.md)

[第II部 Wally CPUとSoCアーキテクチャ](README.md)

ファイルパスの表記は、[資料フォルダー](../../README.md)を基準とする。

## このページの目次

- [15.1 IEUの役割を四つへ分ける](#s_15_1)
- [15.2 decodeはbit列から意味を取り出す](#s_15_2)
- [15.3 register fileとx0](#s_15_3)
- [15.4 ALU sourceとimmediate](#s_15_4)
- [15.5 forwardingの必要性](#s_15_5)
- [15.6 load-use hazardだけは待つ場合がある](#s_15_6)
- [15.7 long-latency unitとstructural hazard](#s_15_7)
- [15.8 branch、trap、stallの優先順位](#s_15_8)
- [15.9 CPIを原因別に考える](#s_15_9)

<!-- appendix-content:start -->
<a id="s_15_1"></a>
## 15.1 IEUの役割を四つへ分ける

Integer Execution Unitは、命令decode、register fileのread/write、immediate生成、ALUとbranch判定、pipeline registerとforwardingを扱う。固定版の入口は`src/ieu/ieu.sv`、controlは`controller.sv`、data pathは`datapath.sv`、演算は`alu.sv`や`shifter.sv`などに分かれる。

「命令を解読する」と「値を計算する」を分ける。controllerはopcodeやfunct fieldからcontrol signalを作る。datapathはregister値とimmediateを選び、ALUへ渡し、結果を後段へ運ぶ。control signalも同じpipeline stageへ遅延させないと、別の命令のdataへ作用する。

![図15.1 五段pipelineでdataとcontrolが同じ命令として進む関係](../../figs/deep-pipeline-hazard.png)

<a id="s_15_2"></a>
## 15.2 decodeはbit列から意味を取り出す

32 bit命令にはopcode、rd、funct3、rs1、rs2、funct7などのfieldがある。命令形式により同じbit位置の用途が変わる。controllerはcase表でALU source、register write、memory read/write、branch、CSRなどを決める。未対応encodingはillegal instructionとして扱う。

decodeを変更するときは、似たopcodeとの重なり、extensionの有効条件、RV32/RV64差、compressed命令の展開後形式を確認する。`casex`やwildcardで広く一致させると、将来extensionまたはreserved encodingを誤って受け入れる危険がある。

<a id="s_15_3"></a>
## 15.3 register fileとx0

RISC-V integer registerは32本で、x0はreadすると常に0、writeは無視される。decode stageでrs1とrs2を読み、writeback stageでrdへ書く。readとwriteが同じcycleに同じregisterを指す場合の値は、register file実装とbypassで定義する。

architectural register fileと、pipeline registerを区別する。x5の値はarchitectural stateだが、`RdE`や`RdM`は「現在そのstageにいる命令のdestination番号」という一時的な制御状態である。flushされた命令は、その一時状態がbitとして残っていてもwrite enableを無効化し、architectural stateを変えてはならない。

<a id="s_15_4"></a>
## 15.4 ALU sourceとimmediate

ALUの入力Aはrs1、PC、0など、入力Bはrs2、immediateなどから選ぶ。immediateはI/S/B/U/J形式ごとに命令bitを並べ直し、XLENへsign extensionする。branch offsetの下位0やJALのbit順は連続していないため、図とcodeを照合する。

bit幅とsignednessは回路の意味を変える。signed less-thanとunsigned less-than、算術右shiftと論理右shiftは同じbit列でも結果が違う。SystemVerilogの暗黙castに任せず、operandの型と必要なextensionを確認する。

<a id="s_15_5"></a>
## 15.5 forwardingの必要性

次の二命令を考える。

```text
add x5, x1, x2
sub x6, x5, x3
```

二命令目がdecodeでx5を読む時点では、一命令目がまだwritebackしていない可能性がある。しかし結果はexecuteまたはmemory stageに既にある。forwarding MUXは、その新しい結果をregister file read値の代わりにALU入力へ渡す。

priorityは最も新しいproducerを選ぶ必要がある。同じrdへ連続writeする場合、W stageよりM stageの結果が新しい。x0、write enable、命令valid、結果が利用可能になるstageを条件へ含める。

<a id="s_15_6"></a>
## 15.6 load-use hazardだけは待つ場合がある

loadのdataはmemory stageの後半まで得られない。直後の命令がexecute stageでその値を必要とすると、通常のforwardingだけでは間に合わない。そのため一cycle stallし、後続命令を待たせる。これはdata依存があるすべての組合せを止めるのではなく、結果の利用可能時点とconsumerの必要時点が合わない場合である。

stall時にはF/Dを保持し、Eへbubbleを入れる必要がある。すべてを単に保持するとload命令自体も進まず、deadlockになり得る。`hazard.sv`の「次stageがstallなら前もstall」「最初にstallしていないstageをflush」という規則は、このbubble生成を一般化する。

<a id="s_15_7"></a>
## 15.7 long-latency unitとstructural hazard

divisionや一部FPU操作は一cycleで終わらない。execute stageのunitがbusyなら、そこへ新しい命令を入れず、前段をstallする。二つの命令が同じhardware resourceを同時に必要とする場合はstructural hazardである。

resourceを複製すればthroughputを上げられる場合があるが、LUT/DSP/配線が増える。共有すれば資源は減るが、arbitrationとstallが増える。正しい選択はworkloadとtarget clockを測って決める。

<a id="s_15_8"></a>
## 15.8 branch、trap、stallの優先順位

branch mispredictionはexecute stageで分かり、若い命令をflushする。trapはmemory stageで確定し、より広い範囲をflushする。division中、WFI、IFU/LSU stallが同時に起こる場合もある。priorityを局所moduleごとにばらばらに決めると、あるFSMだけがstallを見続けるなどの不整合が起きる。

固定版`hazard.sv`はflush causeとstall causeを分け、各stageの最終信号を作る。reviewでは真理値表またはpropertyを用意し、trap時に誤ったstoreがcommitしない、branch修正時にdivideを不正に捨てない、stall解除後に一回だけ進むことを確認する。

<a id="s_15_9"></a>
## 15.9 CPIを原因別に考える

理想的な五段pipelineは、充填後に一cycle一命令をretireできる。しかしcache miss、load-use、branch misprediction、division、I/O waitがbubbleを作る。実行時間は概ね次の関係で考えられる。

```text
実行時間 = 命令数 × CPI × clock周期
CPI = 1 + 各stall・flushが加えるcycle / retired命令数
```

clockを高くする変更がCPIを悪化させる場合も、命令数を減らすsoftware変更がcache miss率を変える場合もある。一つのcounterだけで原因を断定せず、命令数、cycle、各event、wall timeを同じ区間で測る。
<!-- appendix-content:end -->

---

[前：第14章 IFUと命令取得を深く読む](chapter-14.md) ｜ [次：第16章 LSUとmemory hierarchyを深く読む](chapter-16.md)
