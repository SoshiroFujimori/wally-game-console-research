## 第1章 Wally開発者が使う抽象化階層

### 1.1 この本編の到達目標

この本編の目標は、SystemVerilogの文法を暗記することではない。Wallyへ変更を加える際に、要求を回路へ落とし、生成された回路が意図と一致するかを検証し、資源・速度・正しさの結果から設計を修正できる状態を目指す。対象は固定コミット`d3e181ac434a01a1f174549b5fbc7ee03a8875b4`であり、一般論と固定版の事実を区別する。[Console26][Wally]

開発者レベルの理解には、次の問いへ別々に答えられる必要がある。

| 問い | 主に使う資料 | 答えとして必要なもの |
|---|---|---|
| 何を実現するのか | ISA、周辺回路仕様、要求表 | 入出力、状態、例外、完了条件 |
| どの構造で実現するのか | ブロック図、module階層 | 所有者、interface、clock domain |
| 各cycleで何が起きるのか | RTL、波形 | register更新条件と組み合わせ論理 |
| 何の資源になったか | 合成netlist、utilization report | LUT、FF、BRAM、DSP、clock資源 |
| 指定周期で動くか | timing report、XDC | startpoint、endpoint、slack、制約 |
| 仕様どおりか | test、assertion、実機記録 | 前提、刺激、観測値、期待値 |

最後の列を説明できない場合、「コードを読んだ」ことと「設計を理解した」ことを分ける。例えば`+`を見て加算だと分かっても、幅、符号、overflow、前後のregister、合成先、critical pathへの影響を確認していなければ、その加算器を安全に変更できる理解には達していない。

### 1.2 仕様から実機までの六層

![図1.1 Wally開発者が行き来する抽象化階層](figs/wdev-abstraction-stack.png)

上から下へ進むほど実物に近づく。要求・仕様は、外から観察できる約束を定める。マイクロアーキテクチャは、その約束をpipeline、cache、bus、FSMなどの構造で実現する方法である。RTLは、その構造をclock edge間の転送として記述する。合成後netlistは、RTLをFPGAのLUT、flip-flop、BRAM、DSPなどへ写した論理構造である。配置配線後designには、素子の場所と配線遅延が入る。bitstreamは、その配置配線結果をFPGAへ設定するデータである。[Harris26][AMD901][AMD949]

一つの層で得た結果を、別の層の証明として使い過ぎてはならない。RTL simulationの成功は、与えた入力に対するRTLの動作を示す。配置配線後の正のslackは、指定したclockと例外条件の下でtimingを満たしたことを示す。bitstreamを書き込んでUARTが動くことは、少なくともclock、reset、CPU、UART、software起動経路の一部が実機で働いたことを示す。どれも、別の層すべてを単独で証明しない。

### 1.3 ISAとマイクロアーキテクチャを分ける

RISC-V ISAは、命令の意味、register、例外など、softwareから見えるarchitectural stateの約束を定める。同じ命令列を正しく実行するCPUでも、単cycle、5段pipeline、out-of-orderなど内部構造は異なり得る。WallyのIFU、IEU、LSU、cache、分岐予測器はマイクロアーキテクチャであり、ISAそのものではない。[RISCVUnpriv26][RISCVPriv26][Harris26]

この区別は周辺回路追加でも重要である。RasterIXをmemory-mapped I/Oとして接続しても、RISC-V命令の意味を変えたわけではない。既存のload/store命令が特定の物理addressへ到達したとき、uncoreがRasterIXを選ぶようにSoCのaddress mapを拡張した。したがって変更箇所は主にSoC integrationであり、命令decodeへ独自命令を追加した変更とは異なる。

### 1.4 動作記述、RTL、構造記述の関係

「動作記述」と「構造記述」は、必ずしも別言語や排他的な二分類ではない。`assign y = a + b;`は、望む動作を演算子で書いた動作寄りの記述であり、合成可能で、register間に置けばRTL設計の一部になる。別のmoduleを実体化して端子を結ぶ記述は構造寄りである。一つの設計は通常、両方を含む。[Harris26]

![図1.2 動作記述、cycleを持つRTL、構造記述の関係](figs/wdev-rtl-three-forms.png)

RTLは「使用した構文名」よりも、registerとregisterの間で、どの値が、どのclock edgeに、どの条件で移るかを明確にする設計の抽象度である。ゲート一個ずつを手で接続する必要はない。一方、任意のsoftware algorithmを書けば望む回路になるわけでもない。設計者は、書いた式が加算器、MUX、priority encoder、memory、FSMのどれを推論させるかを予測する。

### 1.5 RTL、論理合成、ゲートレベルという語

論理合成は、合成可能なRTLを論理networkへ変換し、等価変形と最適化を行い、対象technologyの部品へ写す。ASICならNAND、NOR、flip-flopなどを含むstandard cell libraryへmappingする。FPGAではLUT、carry chain、FF、BRAM、DSP、I/O bufferなどのprimitiveへmappingする。このためFPGAの「gate-level netlist」は、文字どおり二入力AND gateだけが並ぶとは限らない。[Harris26][AMD901]

Vivadoの`write_verilog -mode funcsim`で得る合成後netlistは、元のmodule名や式が最適化され、primitiveと接続へ変換された姿を確認する資料である。`write_verilog -mode timesim`とSDFは配置配線後の遅延simulationに使える。ただし、netlistを人が最初から最後まで読むことが通常の設計方法ではない。元RTL、schematic、階層別utilization、timing pathを対応付け、疑わしい箇所へ絞る。

### 1.6 一つの信号を六層で追う

例として`StallW`を追う。仕様上は、writeback stageを進められない原因があるとき、pipelineを止める必要がある。マイクロアーキテクチャ上は、後段の停止を前段へ伝える。RTLでは`hazard.sv`が`StallW`を求め、`StallM`、`StallE`、`StallD`、`StallF`へ連鎖させる。合成後は論理式を実現するLUTと配線になる。配置配線後には、そのfanoutと配線距離が遅延へ加わる。実機ではcache missや外部stallなどの条件でpipelineの進行が止まる。

この追跡は「信号名の意味」だけでなく、発生源、利用先、clock domain、assertされる期間、解除条件、timing pathを含む。新しいstall原因を足すなら、論理式へORするだけでなく、flushとの優先順位、進行中bus transaction、例外のprecise性、coverageを再検討する。

### 1.7 説明の確度を三段階に分ける

設計文書では、次の三種類を明示する。

1. **仕様またはsourceから直接読めること**: module port、式、状態遷移、parameter値など。
2. **toolで確認したこと**: 合成資源、timing、CDC、simulation結果など。tool版と入力版を固定する。
3. **設計案または予想**: pipeline追加で速くなる、BRAMへ移せる、という未検証の案。

「一般にこうなる」と「この固定版でそうなった」を混ぜない。特に資源推論とtimingは、RTL、target device、tool版、constraint、最適化optionで変わる。好ましいidiomはあるが、最終判断はreportで行う。

## 第2章 SystemVerilogから回路を読み取る

### 2.1 moduleは回路の境界である

SystemVerilogの`module`は、softwareの関数呼出しとは異なる。実体化したmoduleは回路として常に存在し、入力が変わると組み合わせ論理が反応し、clock edgeで内部状態が更新される。portは、その回路境界を越えるsignalの方向と幅を定める。[Harris26]

Wallyでは`wallypipelinedcore.sv`がIFU、IEU、LSU、privileged unit、hazard unitなどを実体化する。ここで`ieu(...)`の記述が先にあり、`lsu(...)`が後にあることは、IEUを実行し終えてからLSUを呼ぶ意味ではない。両者は同時に存在し、signalで接続される。

module境界を設計するときは、責務、clock/reset、要求と応答、data幅、backpressure、error、所有する状態を表にする。port名を増やし続ける前に、二つのmoduleを分ける境界が安定しているかを考える。

### 2.2 `logic`、net、変数、driver

`logic`は4値の変数型で、0、1、X、Zを表せる。SystemVerilogでは連続代入や一つのprocedural blockから駆動する多くのsignalに`logic`を使える。しかし`logic`と書いたからregisterになるわけではない。何が駆動するかで回路が決まる。

複数の回路が同じsignalを同時に駆動すると、意図しないmultiple driverになる。chip内部で複数の出力を直接短絡して選択する設計は避け、MUXで一つを選ぶ。Wallyの`uncore.sv`が複数の読出しdataをselect signalでまとめる式は、この考え方を明示している。

### 2.3 `assign`と`always_comb`

現在の入力だけで出力が決まり、過去を覚えない回路が組み合わせ論理である。単純な式は`assign`で表す。複数の条件、`case`、一時値を順に計算したい場合は`always_comb`を使う。`always_comb`内では、通常、blocking代入`=`を用いる。[Harris26]

```systemverilog
always_comb begin
  NextState = CurrState;
  PREADY    = 1'b0;
  case (CurrState)
    IDLE: if (PSEL) NextState = ACCESS;
    ACCESS: begin
      PREADY = Done;
      if (Done) NextState = IDLE;
    end
    default: NextState = IDLE;
  endcase
end
```

冒頭のdefault代入は、すべての経路で値を定義する。代入されない経路があると、前の値を保持する必要が生じ、latchを推論する可能性がある。latchが仕様なら明示するが、Wallyの同期設計では通常、意図しないlatchを残さない。

### 2.4 `always_ff`とclock edge

`always_ff @(posedge clk)`は、正のclock edgeで値を保存するflip-flopを表す。Wallyの`flopenr.sv`はenable付き同期reset registerを次の形で記述する。[Wally]

```systemverilog
always_ff @(posedge clk)
  if (reset)   q <= '0;
  else if (en) q <= d;
```

`en`が0のとき代入がないのは、`q`を保持するという順序回路の仕様である。これは`always_comb`で値を代入し忘れる場合と違う。`reset`はclock edgeで評価される同期resetであり、`reset`が変化した瞬間に非同期で`q`を変える記述ではない。

### 2.5 blocking代入とnonblocking代入

組み合わせ計算にはblocking代入`=`、clocked register更新にはnonblocking代入`<=`を用いる。nonblocking代入では、右辺はedge時点の古い値で評価され、左辺の更新はまとめて反映される。この規則により、pipeline registerを同じblockへ並べても、一つのedgeでdataが複数stageを飛び越えない。

```systemverilog
always_ff @(posedge clk) begin
  InstrD <= InstrF;
  InstrE <= InstrD;
end
```

この記述で`InstrE`へ入るのはedge直前の`InstrD`であり、同じedgeで`InstrF`から更新された新しい`InstrD`ではない。blocking代入を使うとsimulation上の意味が変わり、合成意図が読みにくくなる。

### 2.6 resetの種類と優先順位

resetには同期・非同期、High active・Low activeがある。どれを使うかは、device、clock起動、IP、system要求に依存する。重要なのは、assertとdeassertの条件、各domainでの解除時刻、data path enableとの優先順位を一貫させることである。

resetをすべてのdata registerへ無条件に配ると、高fanout routingを増やし、SRLやBRAMの推論を妨げる場合がある。一方、control state、valid bit、外部へ見える状態を未初期化のままにすると、起動が不定になる。data本体をresetせずvalid bitで無効化できるか、仕様から判断する。資源節で、memory初期化との関係を扱う。[AMD901][AMD949]

### 2.7 FSMを状態registerと次状態論理へ分ける

FSMは少なくとも、現在状態を保存するregister、次状態を決める論理、出力論理からなる。Wallyの`busfsm.sv`では列挙型`CurrState`と`NextState`を使い、`always_ff`で状態を更新し、`always_comb`の`case`でAHB transactionの進行を決める。[Wally]

列挙型は、bit patternより状態名で考えられる利点がある。状態追加時は、全遷移、reset state、illegal stateからの回復、各状態の出力、待ち条件を確認する。`default`で初期状態へ戻すだけでは、なぜillegal stateに入ったかを検証しなくてよい意味にはならない。

### 2.8 構造記述と暗黙port接続

Wallyでは`.clk`のような短縮表記を多く使う。これはport名`clk`へ同名のsignalを接続する記法である。簡潔だが、同名のsignalが期待する幅・domain・極性かをmodule宣言で確認する必要がある。異名接続は`.ReadDataW(ReadDataW[P.XLEN-1:0])`のように明示される。

構造記述を読む順番は、module種類、instance名、parameter、clock/reset、要求方向、応答方向である。大量のportを上から眺めるより、interfaceの契約ごとにまとまりを付ける。

### 2.9 parameter、package、`cvw_t P`

Wallyは、global macroの衝突を避け、構成を一つの型として階層へ渡すため、`src/cvw.sv`にpacked structure `cvw_t`を定義する。`P.XLEN`、`P.BUS_SUPPORTED`、cache容量、peripheral addressなどをmodule parameterとして使う。[Harris26][Wally]

parameterは実行中に変わるregisterではない。elaboration時に値が決まり、幅、generate分岐、配列数、回路の有無を変える。`if (P.BUS_SUPPORTED) begin : ebu`は、条件が真ならEBU回路を生成し、偽なら代替の定数接続を生成する。softwareの実行時ifとは異なる。

### 2.10 `generate`とprocedural `for`を区別する

generateは、elaboration時にmoduleや接続を複数作る。procedural `for`は`always_comb`や`always_ff`の内部で、静的な反復範囲なら通常、複数の論理へ展開される。どちらもCPUが一回ずつloopを実行する意味ではない。

例えば64 bitの各bitへ同じ論理を適用するloopは、64個分の回路を生み得る。反復回数を倍にするとsimulation行数はほぼ変わらなくても、面積が倍に近づくことがある。順番に一個の演算器を再利用したいなら、FSM、counter、register、完了signalを設計する。

### 2.11 幅、符号、式の途中のbit数

HDLの算術では、入力幅、signed/unsigned、定数の幅、式の自己決定幅が結果へ影響する。`logic [7:0] a, b; logic [7:0] y; assign y = a + b;`では9 bit目のcarryは`y`に保存されない。carryが必要なら出力を広げ、operandも意図した幅へ拡張する。

比較でもsignednessを確認する。二の補数の負値をunsignedとして比較すると、上位bitが1の大きな正値として扱われる。castは警告を消すためではなく、仕様上の解釈を明示するために使う。幅警告を一括で無効化せず、切捨て、符号拡張、zero拡張が意図どおりか一件ずつ判断する。

### 2.12 XとZを異常の手掛かりにする

4値simulationのXは、未初期化、競合、範囲外index、case未定義などを表し得る。Xを0として見なす2値simulationだけでは、設計上の穴を見逃す場合がある。前章で監査したRasterIXの`number[shiftSize-1]`は、`shiftSize=0`で範囲外を読み、4値simulationがXを露出させた例である。

Zは高impedanceを表し、主に外部tri-state I/Oで使う。FPGA内部の共有busは通常MUXへ変換される。Xを消すために無条件の初期値や`casex`を足す前に、原因が実回路でも危険か、simulationだけのmodelかを分ける。

### 2.13 合成可能な記述とtestbench専用記述

`#10`のdelay、任意のfile I/O、simulationを停止する`$finish`、時刻を進めるtestbench clock generatorなどは、通常のhardwareとして合成しない。`initial`も用途とtargetで扱いが異なり、FPGA memory初期値として使える場合と、ASICで回路にならない場合を分ける。Wallyのtestbenchにある`$value$plusargs`やELF file読込みはsimulation環境であり、CPU内部に文字列処理回路を作っているわけではない。

## 第3章 資源効率を決めるRTL設計

### 3.1 「好ましい書き方」の意味

資源効率のよいRTLには、単一の万能な書式はない。望むhardwareを明確に暗示し、target deviceが持つ専用資源へtoolが推論でき、timing制約と機能要求を満たす書き方が好ましい。可読性だけ、行数だけ、LUT数だけで決めない。[Harris26][AMD901][AMD949]

![図3.1 RTLの形から推論される主なFPGA資源](figs/wdev-synthesis-resources.png)

最適化前に、baselineの機能、clock、utilization、timing、power条件を保存する。変更後は同じ条件で比較する。異なるVivado版、strategy、constraintを混ぜると、RTL変更の効果とtool設定の効果を分離できない。

### 3.2 MUXとpriority論理

三項演算子や`case`はMUXを推論する。互いに排他的な選択なら平衡したMUXになりやすい。長い`if`/`else if` chainは先頭条件に優先順位を与え、priority chainを作る可能性がある。優先順位が仕様なら正しいが、不要な優先順位はlogic depthを増やし得る。

one-hot selectをORでまとめる場合は、本当に同時に一つしか立たないことをassertする。Wallyのuncore読出しMUXはaddress decodeの選択を前提に複数dataをまとめる。decoderとMUXを別々に読むだけでなく、選択の排他性、未選択時のready、errorを一組で確認する。

### 3.3 演算子と専用資源

加算・減算はFPGAのcarry chainを使いやすい。定数shiftは配線変更だけで済むことが多いが、可変shiftはMUX段を持つbarrel shifterになり得る。乗算は幅や設定によりDSPへmappingされるかLUTへ実装される。除算は組み合わせで大きな回路にするか、複数cycleの反復器にするかで面積とlatencyが大きく異なる。

演算子を手作りgateへ展開すれば必ず小さくなるわけではない。合成toolは既知の演算構造を認識して最適化する。専用資源を使いたい場合は、AMDの推論template、synthesis report、technology schematicを照合する。[AMD901]

### 3.4 bit幅は面積と遅延の設計値である

data幅を64 bitから32 bitへ減らせば、加算器、MUX、register、配線の多くは小さくなる。ただし、architectureが64 bitを要求する経路を狭めれば機能を壊す。address全体、data全体、index、offset、counterなど、必要範囲を別々に求める。

counterが0から999までなら10 bitで足りるが、将来parameterを増やすなら`$clog2`の境界、値1、power-of-two、最大値を確認する。`$clog2(1)`が0になる状況で0幅vectorを作らないよう、最小幅を定める。

### 3.5 memoryをBRAMへ推論させる

大きな配列をFFで作ると資源を大量に使う。Vivadoは特定の同期read/write idiomからblock RAMを推論できる。非同期read、port数、byte enable、read-during-writeの意味、reset方法がprimitiveの能力と合わない場合、distributed RAMやFFへ崩れることがある。[AMD901]

Wallyの`src/generic/mem`には、用途別のmemory wrapperがある。設計者は個々のmoduleで独自配列を乱立させず、必要なport、latency、byte enable、初期化、ASIC/FPGA差をwrapperへ集約する。memoryの出力だけをresetできる場合と、配列全bitをresetしようとしてBRAM推論を失う場合を区別する。

### 3.6 register enableとclock gating

値を更新しないcycleでは、`if (en) q <= d;`というclock enableを使う。FPGAのFFにはenable機能があり、合成toolが利用できる。一般RTLで`clk & en`を作り、それを新しいclockとして配ると、glitch、skew、未制約clockを招く。clockを止める必要がある場合は専用clocking resourceと設計methodologyを使う。

enableにもcostがある。多数のregisterへ一つのenableを配るとhigh fanout netになる。data側MUXと専用enableのどちらになるか、fanout、placement、powerをreportで確認する。

### 3.7 hardwareの並列化と資源共有

二つの演算を同じcycleに実行するなら、原則として二つ分の演算資源が必要になる。一つの乗算器を二cycleで共有すれば面積を減らせるが、MUX、FSM、registerが増え、latencyとthroughputが変わる。資源共有は「同時に必要でない」ことをscheduleとして設計する作業である。

CPU pipelineでは、各stageが異なる命令を同時処理する。ALUを別stageの処理と安易に共有すると、structural hazardが生じる。共有するならstall条件と性能影響まで設計する。

### 3.8 fanout、logic depth、routing

一つのsignalが数千のendpointを駆動すると、driverの複製や長いroutingが必要になる。RTL上の論理段数が少なくても、routing delayがcritical pathの大半になる場合がある。reset、stall、global enable、wide decodeはhigh fanoutになりやすい。

対策には、階層ごとのlocal decode、register複製、pipeline、物理的に近い階層分割がある。ただし手動複製は等価性と更新の同時性を守る。まずtiming reportでlogic delayとnet delay、fanoutを確認し、想像だけで複製しない。[AMD906][AMD949]

### 3.9 hierarchyを保つ理由とflattenする理由

module階層は理解、再利用、局所検証に役立つ。一方、強い階層境界が最適化を妨げることもある。Vivadoは階層をflattenまたはrebuiltし、境界を越えて最適化できる。debugしやすさ、incremental build、OOC IP、timing最適化のtrade-offを考える。

source上のmodule名が合成後に残るとは限らない。階層別utilizationを比較したい場合は、同じflatten方針とreport条件を固定する。

### 3.10 resource reportを読む

総使用率だけでなく、階層別のLUT、LUTRAM、FF、BRAM、DSP、BUFGを読む。利用率が低くてもtimingは失敗し得る。逆に高利用率でも、配置可能でslackが正なら動作し得るが、routing congestionや将来拡張の余裕は小さい。

LUT数が減ってFF数が増えるpipeline化、BRAMが増えてLUTRAMが減るmemory推論など、一種類だけの増減で優劣を決めない。目的が最高clock、最低面積、最低latency、最低powerのどれかを明示する。

### 3.11 最適化の前後で保存する証拠

| 種類 | 最低限保存するもの | 比較時の注意 |
|---|---|---|
| source | commitとdiff | generated fileだけを比較しない |
| 機能 | 同じtestと結果 | 入力seed、parameterを固定する |
| 合成 | utilization階層表 | target device、strategyを固定する |
| timing | worst path、WNS、TNS | clockとexceptionを固定する |
| 実機 | bitstream hash、条件、log | 古いbitstreamとの取り違えを防ぐ |

「資源効率がよい」と主張するなら、少なくとも機能が同じであることと、比較したresource指標を示す。「高速化した」と主張するなら、timing closureと実行性能のどちらを意味するかを分ける。

## 第4章 Timing closureとpipeline設計

### 4.1 register間pathの時間予算

同期回路の代表的なsetup条件は、概念的に次である。

```text
Tclock >= Tcq + Tlogic + Troute + Tsetup + Tskew/uncertainty
```

送信FFがclock edge後に出力を変える時間、組み合わせ論理、配線、受信FFのsetup要求、clock差とuncertaintyを合計し、次の有効edgeまでに収める。Vivadoのslackはrequired timeとarrival timeの差としてreportされ、setupでは負なら指定周期を満たさない。[AMD906]

![図4.1 register間pathとpipeline registerの追加](figs/wdev-timing-path.png)

式は理解用の分解であり、実際のreportではclock path、data path、uncertainty、clock pessimismなどをtoolの定義で読む。単にRTLの演算子数を数えてdelayを決めない。

### 4.2 setupとholdを分ける

setup checkはdataが遅すぎないかを見る。hold checkは、同じedge直後にdataが早く変わり過ぎ、受信FFが古い値を保持すべき時間を破らないかを見る。clockを遅くすればsetupは改善しやすいが、holdは単純にclock周期を長くしても解決しない。

implementation toolはhold修正のためdata pathへdelayを加える場合がある。その変更がsetupを悪化させ得るため、max delayとmin delayの両方を見る。WNSだけを見て「timing成功」とせず、unconstrained path、clock interaction、hold violationも確認する。[AMD903][AMD906]

### 4.3 WNS、TNS、failing endpoint

WNSは最悪pathのslack、TNSは負slackの総和である。一つのpathだけ大きく違反する場合と、多数のpathが少しずつ違反する場合では対策が異なる。endpoint数とclock groupを併記する。

達成可能な最大周波数を一回のWNSから断定しない。配置配線はstrategyやseedで変動し、異なるclock groupもある。固定条件で複数runを比較し、完全にrouteしたdesignの結果を使う。[AMD949]

### 4.4 pipeline化が変えるもの

組み合わせ論理の途中にregisterを入れると、一stageのpathを短くできる。しかし出力までのcycle数が増え、valid、stall、flush、exception、feedback loopを変更する。throughputが一cycle一件のままでもlatencyは増える。依存する命令やprotocolが追加latencyを許さない場合、bypassや待ち制御が必要になる。

pipeline化はtiming修正であると同時に機能変更である。registerだけを追加してtestが通るとは限らない。各stageの「data」と「そのdataが有効であるというcontrol」を一緒に遅らせる。

### 4.5 WallyのF、D、E、M、W

Wallyの基本pipelineはFetch、Decode、Execute、Memory、Writebackの五段で読む。IFUがPCと命令取得、IEUがdecode・整数演算、LSUがload/store、privileged unitがCSRとtrap、hazard unitがstall/flushを調整する。[Harris26][Wally]

![図4.2 Wallyの五段pipelineとstall・flush](figs/wdev-pipeline-control.png)

stage suffixを手掛かりに、`InstrD`はDecode、`PCE`はExecute、`ReadDataW`はWritebackの値として読む。ただしすべてのsignalが単純に一stageだけに属するとは限らない。exception原因、cache stall、分岐予測情報は複数stageをまたぐため、宣言と接続を追う。

### 4.6 stallは保持、flushは無効化

stallはstageの内容を保持して進行を待つ。flushはそのstageの命令を無効化し、後でarchitectural stateへ影響しないようにする。Wallyの`hazard.sv`は、後段stallを前段へ伝え、最初に進めるstageへbubbleを入れる規則と、trap・return・CSR write・branch mispredictionによるflushをまとめる。[Wally]

同じcycleにstallとflush原因がある場合の優先順位が重要である。例えば誤った経路の除算命令、cache miss中のtrap、WFIの割込みなどは、単純な全段clearでは扱えない。既存コメント、式、testを読み、変更前の不変条件を列挙する。

### 4.7 forwardingとload-use hazard

前の命令の結果がregister fileへ書き戻される前に、後の命令が必要とする場合がdata hazardである。ALU結果は後段からforwardできる場合がある。load dataはmemory access完了まで得られないため、直後の依存命令を一cycle以上stallする場合がある。

forwarding pathは性能を上げる一方、operand MUXと比較論理を増やし、Execute stageのcritical pathになり得る。新しい結果sourceを追加するときは、正しさ、priority、x0除外、valid、timingを同時に検討する。

### 4.8 critical pathをreportから読む

critical pathでは、startpoint、endpoint、clock group、logic level、cell delay、net delay、fanoutを読む。source fileの長さや、目立つ大きなmoduleだけで原因を推測しない。よく現れるcellやnetが複数のworst pathへ共通するかも調べる。[AMD906][AMD949]

Wallyを20 MHzで動かしてtimingに余裕があっても、別domainの100 MHz RasterIXやpixel clockのpathは別groupである。また、unconstrained pathは「余裕がある」のではなく、正しく検査されていない可能性がある。

### 4.9 timing修正の順序

1. clockとgenerated clock、I/O delay、clock relationが正しいか確認する。
2. false pathやmulticycle pathが本当に仕様上成立するか確認する。
3. worst pathの論理とfanoutを特定する。
4. 不要なpriority、幅、重複計算を直す。
5. 必要ならpipeline、register複製、memory latency変更を設計する。
6. place/route strategyやphysical optimizationを比較する。
7. 同じ機能testとtiming reportで再確認する。

制約を緩めて赤いreportを消すことは、回路を高速化したことではない。false pathは、そのpathを機能上決してcaptureしないことを説明できる場合にだけ使う。multicycle pathは、受信側が何cycle後のedgeでcaptureするかをprotocolとして保証する必要がある。[AMD903]

### 4.10 latency、throughput、clock frequencyを区別する

clock frequencyは一秒あたりのcycle数、latencyは一件の開始から完了まで、throughputは定常状態で一秒または一cycleに完了できる件数である。100 MHzの回路が20 MHzの回路より常に五倍速いとは限らない。100 MHz側が一件に100 cycle、20 MHz側が一件に1 cycleなら結果は逆になる。

本研究の命令FIFOでも、CPU 20 MHzとRasterIX 100 MHzだけから満杯・空を予測できない。一命令当たりの語数、CPUのstore間隔、RasterIXの命令種類、memory stall、display operationを測る。

### 4.11 timing closureの完了条件

| 確認 | 失敗時に意味すること |
|---|---|
| `check_timing`に重大な未制約がない | 検査対象が欠けている可能性 |
| setup/hold slackが全groupで非負 | 指定条件のtiming違反 |
| `report_clock_interaction`が意図と一致 | clock関係またはexceptionの誤り |
| `report_cdc`の違反を説明できる | CDC構造の不足または認識漏れ |
| 機能testが変更前後で一致 | pipeline・reset・制約変更の機能破壊 |
| 実機で持続動作する | board、電源、温度、I/Oを含む問題 |

正slackだけで完了とせず、正しいconstraintの下で正slackであることを確認する。

## 第5章 FPGAへ実装されるまで

### 5.1 Artix-7の主な資源

Nexys VideoのArtix-7には、組み合わせ論理を実装するLUT、状態を保存するFF、分散memory、block RAM、乗算・積和に向くDSP、clock管理、I/O buffer、serializerなどがある。DDR3 controllerのPHYやclocking wizardはdevice固有資源とvendor IPを使う。[NexysVideo][AMD901]

同じ論理機能でも、どの資源へmappingされるかで面積、速度、powerが変わる。sourceの演算子名から最終資源を断定せず、synthesis reportとschematicを確認する。

### 5.2 build flowの各段階

![図5.1 SystemVerilogからbitstreamまでのbuild flow](figs/wdev-fpga-flow.png)

elaborationはparameter、generate、幅、階層を確定する。synthesisはRTLを論理netlistへ変換する。optimizationは定数伝搬、不要論理削除などを行う。placementはcellの場所、routingは配線を決める。bitstream generationは配置配線結果をFPGA設定dataへする。[AMD901][AMD949]

`fpga/generator/wally.tcl`はsource/IP/constraintを読み、compile orderを更新し、synthesisとimplementationを実行し、timing、utilization、CDC report、simulation netlist、bitstreamを生成する。どの段階で失敗したかをlogから分ける。[Console26]

### 5.3 compile orderとpackage

SystemVerilog packageやtypedefは、利用するmoduleより先にcompileする必要がある。`include_dirs`はfileを自動でcompileする指定ではなく、`` `include ``の探索場所を定める。fileを置いただけではVivado projectへ入らない。

同名moduleを別libraryに置く場合、どのinstanceがどのlibraryを参照するかを管理する。RasterIX sourceを別libraryへ置く処理は、Wally側の同名dependencyとの衝突を避けるためである。compile order reportを保存する。

### 5.4 合成後netlistと配置配線後netlist

合成後netlistはlogical optimizationとtechnology mapping後の構造で、まだ最終配線遅延を持たない。配置配線後netlistは実際の配置・配線を反映する。functional simulation netlistは論理動作、timing simulationはSDF遅延を用いる。

timing simulationを行っても、analog signal integrity、電源noise、温度全範囲、外部deviceの全挙動を完全には再現しない。STA、CDC、simulation、実機試験を役割分担する。

### 5.5 XDCはpin表だけではない

XDCにはpackage pin、IOSTANDARD、drive、slew、clock、I/O delay、timing exception、physical constraintが入る。XDC commandはTclとして順に評価されるため、対象objectが存在する時点とfile orderが重要である。[AMD903]

Nexys Videoの`constraints-nexysvideo.xdc`ではboard pinと電気規格、非同期input、SD I/O delay、TMDS出力などを指定する。誤ったIOSTANDARDは機能不良だけでなく電気的問題を起こし得る。board manualとbank voltageを照合する。

### 5.6 primary clockとgenerated clock

外部oscillatorへ`create_clock`を与え、MMCM/PLL出力はgenerated clockとして関係をtoolへ伝える。vendor IPが制約を生成する場合、同じclockへ重複・矛盾した定義を加えない。`report_clocks`と`report_clock_interaction`で認識結果を確認する。[AMD903]

RTLのsignal名が`clk100`だから100 MHzとしてtiming解析されるわけではない。constraint objectがperiodとsource relationを定義する。

### 5.7 input/output delay

外部deviceとの同期interfaceでは、board上の相手がいつdataを出し、いつcaptureするかを基準clockに対して指定する。`set_input_delay`はFPGA pinまでの外部arrival、`set_output_delay`は外部receiverの要求を表す。値はFPGA内部delayを手入力するためのものではない。

UARTのような非同期signalはsynchronizerとprotocol samplingで扱う。SD SPIのようにCPU clockからedgeを作る経路では、card/PCBのreturn budgetと内部pathを分けてconstraintする。仮の数値を「規格保証」として扱わない。

### 5.8 false pathとasynchronous clock group

metastabilityを受けるsynchronizerの最初のFFまでのpathなど、通常の同期captureとして解析できないpathへ例外を置く場合がある。しかしexceptionはCDC回路を作らない。false pathを付けても、dataが安全に渡るわけではない。

clock間をasynchronousと宣言すると、それらの通常timing解析を止める。代わりにsynchronizer/FIFO構造、`report_cdc`、protocol testで安全性を確認する。domain内pathは引き続きtiming解析する。

### 5.9 utilizationと配置可能性

device全体のLUT使用率が50%でも、特定clock regionやBRAM columnへ偏ればroutingが混雑する。hierarchical utilization、pblock、congestion、clock regionを読む。RasterIXとCPUを同時実装した構成では、全体量だけでなくmemory、wide bus、display経路の物理分布が重要になる。

place directiveで結果が改善しても、原因をRTL変更と混同しない。strategyは再現条件として保存する。

### 5.10 bitstreamとsoftware imageを区別する

bitstreamはFPGA回路を設定する。Linux kernel、device tree、OpenSBI、game executableはsoftware imageであり、SDまたはmemoryへ置かれる。RTLだけ直して古いbitstreamを使う、device treeだけ直して古いSDを使う、といった取り違えをhashで防ぐ。

board上のCPUが同じでも、bitstreamが違えばperipheral mapやclockが変わる。softwareは実機のhardware構成と一致する情報を使う必要がある。

### 5.11 build結果の保存単位

保存すべきものは、source commit、submodule commit、Vivado版、target part、environment、Tcl/XDC、strategy、主要report、bitstream hashである。generated IPをGitへ含めるか再生成するかはproject方針で決めるが、再生成手順とtool版を失わない。

## 第6章 Clock domain crossingとreset設計

### 6.1 clock domainを先に色分けする

一つのclock edgeで更新されるregister群をclock domainとして考える。Wally CPU clock、RasterIX clock、pixel clock、DDR user clockなどをブロック図で色分けする。各interfaceにsource domain、destination domain、data性質、更新頻度、resetを記録する。

clock周波数が同じでも、位相関係が保証されなければasynchronous crossingである。逆に同じMMCMから生成され、関係をtoolへ伝えられるclockはsynchronousに解析できる場合がある。

### 6.2 metastabilityはsimulationだけでは見えない

非同期signalがFFのsetup/hold window付近で変化すると、FF出力が一定時間0/1の中間状態になり得る。digital RTL simulationは通常このanalog現象を再現しない。synchronizerはmetastabilityの発生を0にするのではなく、次段へ伝わる確率を下げる。

MTBFはclock、data toggle rate、device特性、解決時間に依存する。二段FFという形だけで、任意の安全要求を自動達成するとは限らない。

### 6.3 一bit levelの二段synchronizer

一定時間保持されるenableやstatus levelは、destination clockで二段以上のFFを通す典型方式がある。最初のFFがmetastableになっても、二段目で使うまでに解決時間を与える。source側の短いpulseは、destinationが一度もsampleせず消える可能性があるため、この方式だけでは不十分である。

### 6.4 pulse、toggle、handshake

短いeventはsource側でtoggle bitを反転し、destination側で同期後の変化を検出できる。eventが次々に来る場合、前の変化をdestinationが観測する前に再反転すると失う。request/acknowledge handshakeなら一件ずつ確実に渡せるが、往復latencyがある。

event lossを許すか、複数件を数えるか、sourceを待たせられるかで方式を選ぶ。

### 6.5 複数bitを個別同期しない

複数bit busを各bitの二段FFへ入れると、各bitの解決時刻が異なり、存在しなかった組合せを受ける可能性がある。ゆっくり変わる設定値なら、sourceで値を保持し、同期したrequestを渡し、destinationでまとめてcaptureし、ackを返す。

連続streamには非同期FIFOを用い、data memoryとpointer同期で順序を守る。Gray codeはpointer更新時に変化するbit数を一つへ抑えるが、CDC constraintと同期FFが不要になるわけではない。

![図6.1 渡す信号の性質に応じたCDC方式](figs/wdev-cdc-patterns.png)

### 6.6 reset assertionとdeassertion

外部resetを非同期assertし、clockが安定した後に各domainで同期deassertする方式がよく使われる。assertを早く効かせつつ、解除edgeをdomain clockへそろえるためである。複数domainが通信する場合、片側だけ先に動いて要求を出さないようstartup protocolを設ける。

`ClockLocked`やDDR calibration完了をCPU reset解除へ使う場合、それらのdomainと同期、glitch、再lock時の挙動を確認する。LED表示は観測補助であり、reset sequenceの形式的保証ではない。

### 6.7 resetで初期化すべき状態

control FSM、valid bit、FIFO pointer、protocol stateは既知状態が必要である。data array全体はvalidが0なら読まれない設計にできる場合がある。大きなmemoryを一cycleで全clearする記述は物理的に実現できず、FFへ展開されるか、複数cycle clear FSMが必要になる。

起動時のframebuffer初期化では、resetで全画素を同時clearするのではなく、commandまたはCPUが領域を書き、完了を待つ。制御stateのresetと画像dataの初期化を分ける。

### 6.8 clock enableと新しいclock domain

低速動作が必要なだけなら、元clockでcounter enableを作り、registerを一部cycleだけ更新する方が、新しいlogic-generated clockを作るより安全なことが多い。新しいclock domainを作ると、clock buffer、constraint、CDC、resetが増える。

外部protocolが特定edgeを要求する場合や、pixel serializerのように専用clockが必要な場合は、MMCM/PLLとclocking resourceを使う。

### 6.9 本構成の主な境界

| 境界 | 運ぶもの | 採用する仕組み |
|---|---|---|
| CPU→RasterIX | 32 bit commandと終端 | AXI4-Stream非同期FIFO |
| RasterIX→CPU | status/response | response経路と同期 |
| GPU→pixel | frame切替要求・address | handshake型制御 |
| DDR user clock間 | memory transaction | vendor AXI clock converter/IP |
| 外部button/UART | 一bit非同期入力 | synchronizerとprotocol sampling |

名称だけで安全とせず、source/destination clock、reset、full/empty、request/ackの各signalを固定版sourceで確認する。

### 6.10 CDC review checklist

1. すべてのregisterをclock domainへ分類したか。
2. crossing signalのbit数と意味を分類したか。
3. pulseを失う可能性を評価したか。
4. busの同時性を守る仕組みがあるか。
5. backpressure時にdataを保持するか。
6. reset中と片側だけ起動した状態を扱うか。
7. `report_cdc`のwarningを一件ずつ説明したか。
8. 非同期位相を変えたsimulationまたはformal propertyがあるか。

「二段FFを入れた」だけを完了条件にしない。

## 第7章 検証を層に分ける

### 7.1 test caseより先にpropertyを書く

propertyは常に守るべき条件、test caseは特定の入力例である。例えばvalid/ready interfaceでは「validが1でreadyが0の間、dataとlastを保持する」がpropertyである。readyを3cycle下げる試験はその一例である。

要求をpropertyへ変換すると、正常例だけでなく境界と停止条件が見える。入力範囲、reset、同時event、overflow、illegal accessを列挙する。

![図7.1 Wally開発で積み重ねる検証層](figs/wdev-verification-layers.png)

### 7.2 lintとelaboration

lintは未使用signal、幅変換、multiple driver、latch、unreachable code、coding styleなどを早期に見つける。elaborationはparameterとgenerateを確定し、存在しないportや幅不一致を検出する。warningを数で無視せず、新規warningがない状態を保つ。

lint cleanは機能正しさを証明しないが、後段debugのnoiseを減らす。意図的な例外は狭い範囲で理由をコメントし、全体disableを避ける。[AMD901][AMD949]

### 7.3 module simulation

小さなmoduleへ直接入力し、全分岐と境界を試す。combinational moduleなら全入力を総当たりできる場合がある。FSMなら各状態・遷移・wait・resetを試す。random testは広い探索に有効だが、seedと失敗入力を保存する。

clocked interfaceでは、値だけでなくcycleとhandshakeを検査する。dataが正しくても一cycle早い、wait中に変化する、二回side effectを起こす場合は失敗である。

### 7.4 assertion

assertionはsimulation中またはformal toolでproperty違反を検出する。例として、streamの停止中にdataを保持するpropertyは次の考え方になる。

```systemverilog
assert property (@(posedge clk) disable iff (reset)
  valid && !ready |=> valid && $stable({data, last}));
```

実際に導入するときは、protocolがvalid取消しを許すか、reset極性、unknown値、連続stallを仕様と照合する。assertionをtestbenchだけに置くかinterface近くへbindするかもproject方針で決める。

### 7.5 formal verification

formalは、定めた前提の下で全状態・全入力についてpropertyの反例を探索できる。小さなdecoder、arbiter、FIFO control、算術等価性に有効である。state explosionがあるため、SoC全体を無条件に証明するより、境界を分ける。

「solverがunsat」とは、model化した論理式と前提の範囲で反例がない意味である。RTL全体、synthesis、analog、softwareまで自動で証明した意味に広げない。付録Zはこの範囲分けを実例で示す。

### 7.6 core-levelとISA test

ISA testは命令のarchitectural動作を調べる。Wally testbenchはELFを読み、構成に応じたtest群を選び、結果を照合する。新しいmicroarchitecture最適化では、対応する命令testと回帰testを実行する。[Wally]

ISA testが通っても、未試験のinterrupt timing、cache競合、peripheral integration、Linux workloadは残る。coverageとsystem testを追加する。

### 7.7 differential verificationとRVVI

reference modelとretired instruction traceを比較すると、同じ命令列でarchitectural stateが一致するかを確認できる。内部pipeline timingは異なってよい。比較interfaceは、PC、instruction、register write、memory effect、trapなど、commit時の情報を正確に対応付ける。

reference model自身の構成、ISA extension、未定義動作をそろえる。差分が出た最初のretire位置から原因を絞る。

### 7.8 integration simulation

core、uncore、memory、peripheralを接続し、address decode、bridge、interrupt、bootを試す。周辺回路追加では、ID read、read/write register、wait state、illegal access、reset、interruptを段階化する。RasterIXではAPB wrapper単体、FIFO、display swap、共有DDR、実gameの順に広げた。

一度にLinux bootだけを試すと、失敗原因が広過ぎる。小さなbare-metal testでregister accessを確認してからOSへ進む。

### 7.9 合成後・配置配線後の確認

RTL simulationと合成結果が異なる原因には、Xの扱い、初期値、範囲外index、複数driver、unsupported constructがある。必要な境界では合成後functional simulationを行う。timing simulationは遅延を含むが、実行時間が長く、全system回帰の代わりにはしにくい。

本研究のFloatToInt監査では、未変更RTLの4値simulationとArtix-7合成後functional netlistで結果が異なった。これは、どちらか一方だけで全入力の正しさを主張してはいけない例である。

### 7.10 FPGA実機とILA

実機はclock、reset、DDR calibration、board pin、外部device、softwareを含む統合証拠を与える。内部signalを観測するILAは有効だが、probe追加でplacement/timingが変わる可能性がある。trigger条件、capture depth、clock domainを記録する。

LEDやUARTは低costの観測点である。意味をsourceと対応付け、点灯だけから未観測の内部全体を正常と断定しない。

### 7.11 coverage

code coverageはline、branch、toggle、FSM stateなど、simulationが通った場所を示す。functional coverageは仕様上の組合せを定義する。100% code coverageでもassertionが不十分ならbugは残る。未到達codeがdeadなのかtest不足かを判断する。

parameter構成ごとに存在するhardwareが違うため、一構成のcoverageを全構成へ一般化しない。

### 7.12 bug reportを再現可能にする

最低限、commit、submodule、tool版、parameter、test名、seed、command、期待値、実測値、最初の失敗cycle、logを残す。実機ならboard、bitstream hash、SD image、接続、電源投入順も含める。

「たまに止まる」から、例えば「reset解除後の第127回commandで`valid=1, ready=0`中に`data`が変化する」まで狭めると、修正と回帰testを作れる。

## 第8章 Wally開発者の設計・実装規律

### 8.1 先にinterface契約を書く

moduleを実装する前に、port表、clock/reset、transaction成立条件、latency、backpressure、error、reset中の出力を決める。契約が曖昧なまま両側を同時に書くと、片側がvalidをpulseと考え、片側がlevel保持と考えるような不一致が起きる。

既存interfaceへ接続する場合は、独自に意味を作らず、仕様と既存sourceを読む。信号名が似ていても、AHBの`HREADY`とAXI4-Streamの`TREADY`はprotocol上の役割が異なる。

### 8.2 小さい変更単位を作る

board対応、peripheral接続、software driver、performance最適化を一つの巨大diffへ混ぜない。各段階でbuild・test可能な境界を作る。後で`git bisect`でき、reviewerが変更理由を一つずつ確認できる。

一時的な測定codeやSDWire3操作scriptは研究資料側へ置き、公開repositoryの製品sourceと分ける。repositoryへ残すものは、利用者がbuild・利用するために必要な変更へ絞る。

### 8.3 Wallyのcoding styleを使う

RVSOCが説明するWally styleでは、明確な同期式設計、`always_ff`と`always_comb`、parameter化、短く責務の明確なmodule、揃えたport宣言、名前によるstage表示などを重視する。[Harris26]

styleは外見だけではない。latch、multiple clock、暗黙幅変換、巨大moduleを減らし、reviewしやすいhardwareを作る。既存fileへ変更するときは、その周囲のindent、命名、comment、license headerへ合わせる。

### 8.4 commentには理由と契約を書く

codeを英語へ読み替えるだけのcommentより、なぜそのlatency、priority、exceptionが必要かを書く。例えば「registerを追加」の代わりに「DDR responseを一cycle遅らせ、AHB data phaseのselectとそろえる」と書く。

一方、事実と違う古いcommentは危険である。RTL変更時にcomment、diagram、test、parameter説明を同じcommitで更新する。

### 8.5 parameter化し過ぎない

複数構成で実際に使う幅や機能はparameter化に向く。将来使うか不明な全信号をparameter化すると、組合せ爆発と未試験構成が増える。合法値、依存条件、default、test matrixを定める。

`P`のfield追加では、型定義、parameter生成、全構成の値、利用module、無効構成の代替接続を更新する。default 0でcompileが通るだけでは、全派生構成の意図を保証しない。

### 8.6 warningを設計情報として扱う

unused signal、truncation、latch、undriven、CDC warningはbugの手掛かりである。既知で安全なwarningは局所的に抑制し、理由を残す。directory全体のwarningを無効化すると、新しいbugを隠す。

tool更新でwarning種類が変わるため、baselineとの差分を見る。warning数ゼロだけでなく、抑制一覧もreviewする。

### 8.7 generated fileとsource of truth

Vivado IPの`.xci`、生成Tcl、出力RTL、bitstreamのどれをsource of truthとするか決める。人が編集するTclから再生成する設計で、生成済みfileだけを手修正すると次回buildで消える。

本構成ではboard用MIG/MMCM/FIFOの生成条件をTclに置き、`wally.tcl`がIPをimportする。tool版差で生成物が変わり得るため、再生成環境を記録する。

### 8.8 変更前に影響範囲を描く

![図8.1 一つの構成値を変えたときに追う影響](figs/wdev-change-impact.png)

CPU clockを変える例では、MMCM、timing constraint、UART divisor、SD clock、AHB/AXI converter、device tree、performance測定が関係する。addressを変える例ではdecoder、PMA、device tree、driver、testが関係する。値の検索結果を並べるだけでなく、各表現がhardwareを作るのか、softwareへ知らせるのかを分類する。

### 8.9 optimizationは測定可能な仮説にする

「MUXが遅そう」ではなく、「Execute stageのworst pathでoperand MUXがlogic delayの何%を占める。選択段数を一段減らせばWNSが改善する」という仮説にする。変更後に同じpath groupと機能testで比較する。

期待どおり改善しなかった結果も保存する。placement変動か、別pathがcriticalになったか、logic削減がrouting増加へ変わったかを調べる。

### 8.10 review可能なcommit

一commitには一つの目的を持たせ、messageは命令形の短い要約とする。生成物、測定資料、機能変更を区別する。公開前に`git diff --check`、対象test、build、report差分、license、submodule pointerを確認する。

AIが作ったcodeでも責任は同じである。設計者本人がinterface、state、timing、testを説明でき、reviewで指摘された場合に修正できる状態へする。

### 8.11 upstreamへ出せる変更の条件

upstreamの一般利用者に必要で、既存boardや構成を壊さず、repositoryのstyleに合い、再現可能なtestがあり、外部機器固有の一時scriptを含まないことが基本である。研究環境だけの測定codeは別資料に置く。

公式RasterIXをsubmoduleで使う場合、局所forkの変更を隠して「公式」と呼ばない。必要な修正があれば、upstream版、patch理由、互換性、testを明示する。

### 8.12 開発者が残す設計記録

設計判断記録には、問題、制約、候補、採用案、棄却理由、根拠source、test、残るriskを書く。結果だけでなく理由を残すと、後から別のclockやboardへ移す際に再評価できる。

## 第9章 Wallyの階層と構成を読む

### 9.1 core、SoC、board topを区別する

`wallypipelinedcore`は命令を実行するcoreである。`wallypipelinedsoc`はcoreとuncoreを組み合わせ、memoryやperipheralへ接続する。FPGA最上位はboardのpin、clock生成、DDR controller、reset、Wally SoCを結ぶ。これらをすべてCPUと呼ぶと、変更場所を誤る。[Wally][Console26]

![図9.1 固定コミットで読むWallyの階層](figs/wdev-wally-hierarchy.png)

RasterIX追加では、RISC-V命令実行器の内部へ描画pipelineを入れたのではない。uncoreの外部APB interfaceとboard topに描画回路を接続した。ゲームsoftwareは通常のstoreで命令語を送り、RasterIXはCPUと並列に動く。

### 9.2 `wallypipelinedcore`の主要unit

| unit | 主な責務 | 入口となるsource |
|---|---|---|
| IFU | PC、命令取得、予測、I-cache | `src/ifu/ifu.sv` |
| IEU | decode、register file、ALU、control | `src/ieu/ieu.sv` |
| LSU | load/store、D-cache、MMUとの接続 | `src/lsu/lsu.sv` |
| privileged | CSR、trap、interrupt、権限 | `src/privileged/privileged.sv` |
| HZU | stallとflush | `src/hazard/hazard.sv` |
| FPU | 浮動小数点演算 | `src/fpu/fpu.sv` |
| MDU | 乗算・除算 | `src/mdu/mdu.sv` |
| EBU | IFU/LSU要求を外部busへ | `src/ebu/ebu.sv` |

moduleを読むときは、全signalを一度に暗記しない。責務ごとにportを分け、要求data、応答data、valid/ready、stall/flush、exception、configurationに色分けする。

### 9.3 `cvw_t`は構成契約である

`src/cvw.sv`の`cvw_t`にはXLEN、ISA extension、cache形状、TLB、address map、peripheralの有無などがまとまる。各moduleは`#(parameter cvw_t P)`を受け、`P.XLEN`などを参照する。構成をpackageへ集めることで、global macroの名前衝突と、階層ごとのばらばらな値を減らす。[Wally][Harris26]

ただし値を一か所へ集めただけで整合が自動保証されるとは限らない。boardのDDR容量、device tree、boot software、C++定数など、SystemVerilog外にも同じ事実の表現がある。変更影響を列挙し、生成物を更新する。

### 9.4 configurationから回路が生成されるまで

`config/derivlist.txt`などの派生構成から`config.vh`とparameter定義が作られ、testbenchやFPGA buildが`P`を組み立てる。`P.F_SUPPORTED`や`P.BUS_SUPPORTED`はgenerate条件として使われ、不要unitを物理回路から除ける。

実行時にfeature bitを0へ書けば回路が消えるわけではない。compile/elaboration時parameterと、softwareから書き換えるcontrol registerを区別する。前者はbitstreamを作り直す必要がある。

### 9.5 interfaceから階層を理解する

大きなmoduleを読む順番は次である。

1. parameterとclock/resetを読む。
2. 入出力を機能別に分ける。
3. 内部signalのstage suffixと幅を確認する。
4. submodule instanceをブロック図へ置く。
5. 各submodule間の要求・応答を一経路ずつ追う。
6. generateの有効・無効両方で未駆動がないか確認する。

`wallypipelinedcore.sv`を先頭から逐語的に読むより、IFU→IEU→LSU→EBU、privileged→hazardという経路を選んだ方が理解しやすい。

### 9.6 IFUを読む観点

IFUは次に取得するPCを選び、instruction memoryまたはI-cacheへ要求し、得た命令をDecodeへ渡す。branch predictionが有効なら、予測PCと後で判明した正しいPCを比較する。compressed instruction対応では、16 bit単位の境界と命令の組立ても関係する。

確認する状態は、PC register、fetch buffer、cache/TLB state、予測器stateである。stall時にPCを保持する条件、flush時に次PCを切り替える条件、instruction access faultがどのstageへ届くかを追う。

### 9.7 IEUを読む観点

IEUは命令fieldをdecodeし、register fileからoperandを読み、immediateを生成し、ALU・branch・CSR・load/store制御を作る。Decodeで決めるcontrolと、Execute/Memoryへpipeline registerで運ぶcontrolを分ける。

data path変更では、値だけでなく、結果を選ぶMUX、write enable、destination register番号、exception条件、forwarding sourceを追う。新しい演算をALUへ加えても、decodeとwriteback selectionがなければarchitectural resultへ届かない。

### 9.8 LSU、cache、MMUを読む観点

LSUはeffective address、byte/half/wordのalignment、loadの符号拡張、store byte mask、atomic、D-cache、address translation、PMP/PMA、bus requestを結ぶ。単にmemoryを読むmoduleではない。

virtual addressからphysical addressへの変換、cacheableか、alignment違反か、access権があるかを順に区別する。Linux構成でpage faultとbus errorを同じ原因として扱わない。cache missではpipeline stallとline refillが起こり、uncached MMIOでは周辺回路のreadyを待つ。

### 9.9 privileged unitを読む観点

privileged unitはCSR、現在のprivilege mode、interrupt、exception、trap vector、returnを扱う。RISC-V privileged specificationはsoftwareから見える動作を定め、Wally RTLはそれをpipelineへ統合する。[RISCVPriv26]

precise exceptionでは、trapより前の命令は完了し、後の命令はarchitectural stateを変更してはならない。exceptionを検出したstage、CSRへ記録するPCと原因、pipeline flush、進行中memory operationを対応付ける。

### 9.10 新しい機能をどこへ置くか

| 要求 | 通常の配置候補 | 避けるべき混同 |
|---|---|---|
| 新しいRISC-V命令 | decode、data path、CSR、test | 周辺register追加と同一視する |
| memory-mapped peripheral | uncore、APB、address map | ALUへ直接置く |
| 高bandwidth accelerator | bus/stream、DMA、memory契約 | APB registerだけでdata全量を送る |
| board pin追加 | FPGA top、XDC、I/O回路 | core RTLへboard名を埋め込む |
| software-only機能 | driver/application | 不要なhardware stateを増やす |

責務の近い階層へ置けば、coreの再利用性と検証範囲を保ちやすい。RasterIXのようなacceleratorでも、control path、command path、bulk memory path、display pathを別々に設計する。

## 第10章 命令pipelineとarchitectural state

### 10.1 一命令の流れを最後まで追う

一つの`add x5, x6, x7`を例にする。Fetchで命令を読み、Decodeでopcodeとregister番号を読み、register fileからx6とx7を得る。Executeで加算し、Memoryではload/storeでないため結果を通し、Writebackでx5へ書く。各stage間のregisterはdataとcontrolを同じ命令として運ぶ。

追跡時はPC、命令word、source値、ALU control、結果、destination番号、write enableを表にする。波形で一つだけstageがずれていれば、別命令のcontrolで値を書き込む重大な誤りになる。

### 10.2 architectural stateと一時状態

general-purpose register、PC、CSR、memoryのsoftware-visible内容はarchitectural stateである。pipeline register、予測器counter、cache tag、FIFO pointerはmicroarchitectural stateである。microarchitectural stateは実装により違ってよいが、最終的にISAで許されるarchitectural結果を作る必要がある。[RISCVUnpriv26][RISCVPriv26]

debug時にpipeline内部の一時値が違うだけでISA違反とは限らない。retireした命令列とarchitectural stateを比較する。逆に、最終画面が同じでも例外順序やmemory side effectが違えば、CPUとして正しいとは限らない。

### 10.3 control hazardと分岐予測

branchの行先はFetch時には未確定である。予測器は先にPCを選び、後段で条件とtargetが確定したとき、誤りなら若い命令をflushする。予測は性能機能であり、誤予測してもarchitectural結果は正しくなければならない。

予測器変更ではaccuracyだけでなく、誤予測回復、RAS、BTB、instruction class予測、flush stageを確認する。予測情報の更新がsquashされた命令で行われないかも検討する。

### 10.4 data hazardとforwarding priority

複数の後段stageが同じsource registerの新しい値を持つ場合、最も新しい命令の結果を選ぶ。Memory stageとWriteback stageの両方が一致したときのpriorityを明示する。x0は常に0であり、x0へのwrite予定をforward sourceとして扱わない。

load-useではdataが得られる時刻を確認する。cache hit、uncached bus、miss refillでlatencyが違う場合、固定一cycleの想定だけでは不十分になる。valid/readyまたはstallで完了まで保持する。

### 10.5 structural hazard

二つの処理が同じhardwareを同cycleに必要とするとstructural hazardになる。単一port memoryをinstructionとdataが同時に使う、一つのdividerへ別命令を投入する、共有busへIFUとLSUが要求する場合が例である。

対策は資源複製、port追加、仲裁、stall、schedule変更である。面積と性能のtrade-offを測る。WallyのEBUはIFUとLSU要求を外部AHBへ仲裁するため、bus側の完了とpipeline stallが結び付く。

### 10.6 precise trapとcommit

trap発生時に、どこまでを完了した命令と見なすかがcommit境界である。storeが外部へ出た後で命令をflushしても、周辺回路のside effectは取り消せない。このためbus transaction開始条件と、interruptを受けられる安全な時点を設計する。

`BusCommitted`のようなsignalは、進行中memory operationがありinterruptで中断すべきでない期間を示す。名前だけで意味を推測せず、assert条件、解除条件、trap logicでの利用先を追う。

### 10.7 CSR、interrupt、exception

CSR instructionは通常のregister fileとは別のarchitectural stateを読み書きする。interruptは外部またはtimerなどの非同期的な出来事を、instruction境界でtrapとして扱う。exceptionは実行中命令に起因するillegal instruction、page fault、misalignmentなどである。

同じtrap経路を使っても原因と再開PCは異なる。`mepc`、`mcause`、`mtval`などへ何を記録するかを仕様とtestで照合する。device interrupt追加では、peripheralのpending、PLIC source、CSR enable、global enable、handlerまで全経路を確認する。[RISCVPriv26]

### 10.8 performance counterを解釈する

cycle、retired instruction、cache miss、branch mispredictionなどのcounterは、性能原因を分解する材料になる。CPIはcycle/instructionである。clock frequencyとCPIを組み合わせて実行時間を考える。

counterの定義、増えるevent、reset、overflow、privilege accessを確認する。softwareの区間計測では、計測前後のfence、compiler最適化、warm-up、OS割込みを考える。counter一個だけで「GPUが遅い」「CPUが遅い」と断定しない。

### 10.9 pipeline変更のreview表

| 観点 | 確認質問 |
|---|---|
| data | 新しい値はどのstageで生成されるか |
| control | その値のvalidと選択信号は同じstageか |
| hazard | forwarding、stall、flushへ何を足すか |
| exception | fault時にside effectを止められるか |
| timing | どのregister間pathが長くなるか |
| verification | 依存命令、branch、trap、stallを試したか |

pipeline registerを一個足す変更でも、この全項目を確認する。

## 第11章 Memory systemとon-chip bus

### 11.1 addressは相手を選ぶ契約である

CPUが出すaddressは、DRAMのbyte位置だけを表すとは限らない。physical address spaceの範囲ごとに、RAM、ROM、CLINT、PLIC、UART、SD、外部I/Oなどが割り当てられる。memory-mapped I/Oでは、通常のload/store命令が周辺registerのread/writeになる。[Harris26][Wally]

address mapにはbaseとrange、alignment、access size、read/write可否、cacheability、side effectが必要である。RTL decoder、PMA/PMP、device tree、software定数の値を一致させる。baseだけ一致しrangeが違う場合、隣のdeviceと重なるか、未選択領域が生じる。

### 11.2 cache line、tag、index、offset

cacheはmemoryの一部をline単位で保持する。addressをtag、set index、line内offsetへ分ける。hitはvalidでtagが一致することを意味する。set associative cacheでは複数wayを並列比較し、replacement stateでmiss時のwayを選ぶ。[Harris26]

cache容量だけで性能は決まらない。line size、way数、miss penalty、access pattern、BRAM port、clock frequencyが関係する。way数を増やすとconflict missを減らせる可能性があるが、tag比較とMUXが増え、timingと資源へ影響する。

### 11.3 write policyとdirty data

write-throughはstoreを下位memoryへも送る。write-backはcache lineをdirtyにし、追出し時に書き戻す。Wallyの固定構成で採用したpolicyはsourceとparameterで確認する。一般論だけで「cacheの値は直ちにDDRへ書かれる」と決めない。

memory-mapped I/Oをcacheすると、read side effectやcontrol writeが遅延・統合される危険がある。PMAでuncacheable領域として扱い、ordering要求を守る。RasterIXのcontrol registerと共有framebufferでは、register access、CPU cache、DMA相当の外部master、reserved memoryを分ける。

### 11.4 IFU・LSUからEBUへ

IFUはinstruction fetch、LSUはdata accessを要求する。両方が同時に外部busを必要とする場合、EBUが仲裁する。仲裁はどちらを先に進めるかを決め、選ばれなかった側へstallを返す。long-latency accessでは、要求を出した側と応答を受ける側の対応を保持する。

![図11.1 IFUまたはLSUからAPB周辺回路までの経路](figs/wdev-memory-bus-path.png)

`src/ebu/ebu.sv`、`busfsm.sv`、`controllerinput.sv`を組にして読む。FSMだけでは、address/data MUXとpipelineへのstallが見えない。

### 11.5 AHBのaddress phaseとdata phase

AHBはaddress/control phaseとdata phaseを重ねられる。現在のaddressが選んだperipheralと、次cycleのdata/readyが対応するため、selectをregisterで遅らせる必要がある。Wallyの`uncore.sv`は`HSELRegions`を`HREADY`でenableされたregisterへ保持し、read dataとreadyのMUXに使う。[Wally][Harris26]

peripheralが`HREADY`を下げる間、controllerはtransactionを保持する。addressが次へ進んでも、完了していないdata phaseの相手を失ってはならない。波形では、単一cycleの縦断面だけでなく、連続する二つ以上のtransactionを追う。

### 11.6 address decoderの正しさ

decoderは`address`と各領域のbase/rangeからone-hot selectを作る。確認すべき性質は、正しい範囲で選ばれる、異なる領域が同時選択されない、未定義addressでbusが永久停止しない、access属性が一致することである。

範囲をthermometer maskとして表す設計では、任意のサイズを指定できるとは限らない。base alignmentとrange形式を構成生成時に検査する。新しいperipheralを追加するときはdecoder bit、select vector幅、read/ready MUX、interrupt sourceを一組で増やす。

### 11.7 AHBからAPBへのbridge

APBはsetup phaseとaccess phaseを持つ。setupでは`PSEL`、address、write control、write dataを準備し、accessでは`PENABLE`を上げる。peripheralは完了まで`PREADY`を0にできる。bridgeはAHB側の要求をAPBの二phaseへ変換し、完了をAHBへ返す。[Harris26]

APBは単純だが、`PSEL & PENABLE`のlevelを毎cycle新しい書込みとして数えると、wait中にside effectを複数回発生させる。実際の受渡しは`PSEL & PENABLE & PREADY`が成立した完了cycleとして設計する。

### 11.8 APB peripheralのregister map

周辺回路を設計する前に、offset、幅、read/write、reset値、side effectを表にする。

| offset | 名前 | access | 意味 | side effect |
|---:|---|---|---|---|
| 0x00 | ID | R | 固定識別値 | なし |
| 0x04 | CONTROL | R/W | enable、mode | write時に更新 |
| 0x08 | STATUS | R | busy、error | なし |
| 0x0C | DATA | W | command data | 完了時にFIFOへ投入 |

reserved bitのread値、部分writeの`PSTRB`、illegal offset、連続accessを決める。read-clearやwrite-one-to-clearは便利だが、softwareが読むだけで状態が変わるため明記する。

### 11.9 valid/readyとbackpressure

valid/ready interfaceでは、transferは両方が1のcycleだけ成立する。送り手はvalidを上げた後、readyになるまでdataを保持する。受け手は受け取れるときreadyを上げる。readyが0だからdataが無効になるわけではない。

APBからAXI4-Streamへbridgeする場合、APBの`PREADY`をstream側`TREADY`と関係付ける。FIFOが満杯ならCPU accessを待たせるか、明示的なerrorを返す。silent dropはcommand列を壊す。

### 11.10 FIFOの必要性を速度だけで説明しない

FIFOは、到着と処理の一時的なずれを、空き容量の範囲で吸収する。平均して到着が処理より速い状態が続けば、有限のFIFOはいずれ満杯になり、処理能力の不足そのものは解消しない。受け取り停止への対応はAPBの待ちでも実現でき、クロック間の受け渡しにもFIFO以外の方法がある。E6では1語ずつ渡す4相方式、16語FIFO、512語FIFOを実装して比べ、512語FIFOでCPUのAPB待ちが短くなることを確認した。全候補中の最適性や512語すべての必要性を示した実験ではない。詳しい回路と計測は技術付録第29章にある。[E6]

FIFO採用理由は「受け手が永久に遅い」ではなく、readyが一時的に下がってもprotocolを守り、二つのclock domain間でdataと順序を保つことである。容量理由は別に、最大burst、停止時間、通知遅延から評価する。付録Iでこの設計を詳しく扱う。

### 11.11 memory ordering、`volatile`、fence

`volatile`はcompilerへaccessを省略・統合しないよう伝えるが、CPU、cache、bus、deviceの完了を単独で保証しない。RISC-Vのmemory ordering、I/O属性、fence、device-specific statusを組み合わせる。[RISCVUnpriv26]

commandを書き終えたこと、RasterIXがcommandを受理したこと、描画を完了したこと、displayが新frameを読み始めたことは別の時点である。software APIは必要な完了段階を明示する。単なる固定`usleep`は、完了を観察せず時間を推測している。

### 11.12 cache coherenceと共有DDR

CPU cacheと、CPU cacheを経由しないhardware masterが同じDDR領域を共有すると、古いcache lineを読む問題が生じる。解決はhardware coherence、uncached mapping、cache clean/invalidate、所有権移譲protocolなどである。採用方式をsourceとOS設定で確認する。

本研究のreserved-memoryはLinuxの通常allocatorから領域を除外するが、それだけでcache coherenceやhardware protectionを作らない。誰がいつ書き、誰がいつ読むかという所有権と、可視化の操作を別に設計する。

### 11.13 bandwidth、latency、outstanding数

bandwidthは単位時間に運べるdata量、latencyは一要求の応答時間である。wide busでも、一要求ずつ完了を待てばlatencyに支配される。split transactionや複数outstanding requestはlatencyを隠せるが、IDと順序管理を増やす。

測定では、payload byteだけでなくprotocol overhead、burst長、wait、clock crossing、DDR効率を含める。理論最大値は上限であり、applicationの達成値ではない。

## 第12章 Wallyを変更する実践課題

### 12.1 課題の進め方

各課題は、仕様、ブロック図、RTL、simulation、合成、report、実機の順に進める。いきなり完成sourceを写さず、自分のinterface表と期待波形を先に作る。元repositoryは別worktreeまたは別cloneで保持する。

### 12.2 読出し専用APB識別register

最初の課題は、固定値を返すread-only registerである。base addressを選び、offset 0で32 bit IDを返し、それ以外は0または定義したerror値にする。zero-waitならaccess phaseで`PREADY=1`とする。

成功条件は、未選択時にbusへ影響しない、readでIDが一致する、writeで状態が変わらない、部分access方針が明確、reset前後で同じ値、既存peripheral testが通ることである。

### 12.3 read/write control register

次にenable bitを持つregisterを加える。`PSEL & PENABLE & PWRITE & PREADY`の完了時だけ更新し、`PSTRB`に従う。readbackを実装する。reset値を仕様化する。

wait stateを挿入したtestを作り、access phaseが複数cycle続いても一回だけ更新されることを確認する。back-to-back read/writeも試す。

### 12.4 counter peripheralとinterrupt

clockごとに増えるcounter、compare register、pending bitを作る。pendingのsetとclearが同cycleに起きたpriorityを決める。interruptをPLICへ追加するならsource ID、enable、priority、claim/complete、device tree、handlerまで追う。

softwareがinterruptを受けた回数だけでなく、pendingが保持され、clear後に再発できることを波形で確認する。

### 12.5 pipelineへ一つの演算を加える思考実験

独自命令を実装する前に、既存ALU operationを一つ選び、decodeからwritebackまで追跡する。opcode、control、operand、ALU、result MUX、destination、forwarding、illegal instruction、test vectorを表にする。

新命令追加ではRISC-V custom encodingの扱い、assembler、compiler、ISA test、privilege、exceptionを含む。授業演習であっても、既存標準encodingと衝突させない。

### 12.6 cache parameter変更

way sizeやline lengthを変更し、index/tag幅、memory wrapper、refill burst、LRU、address alignment、utilization、timing、benchmarkを比較する。parameterがcompileするだけで完了とせず、境界addressとconflict patternを試す。

性能向上を主張するなら、同じworkload、warm-up、clock、software、measurement区間でmiss率と実行時間を示す。

### 12.7 critical pathを一つ改善する

固定runのworst pathを選び、startpointからendpointまでをschematicとsourceへ対応付ける。logic delay、route delay、fanoutを記録し、候補を一つ選ぶ。RTL変更前後で機能test、WNS/TNS、resourceを比較する。

pipeline registerを足す場合は、latency、valid、stall、flushまで変更する。constraintだけを変えた場合は、回路改善とは別結果として扱う。

### 12.8 CDC interfaceを設計する

一bit level、pulse、複数bit設定、連続streamの四種類について、適切な方式を選び、誤った方式では何が失われるかを説明する。非同期位相と異なる周波数を変えたsimulation、reset途中、backpressureを試す。

FIFOなら、full/empty、overflow/underflow、順序、TLAST、reset後のpointer、片側停止をpropertyにする。容量の採用理由を最大burstと停止時間から計算する。

### 12.9 WallyとRasterIXの接続を再説明する

次の一文を、最低でも十個の具体的な段階へ分解する。

> CPUがRasterIXへ命令を送り、RasterIXが画像を表示する。

address decode、APB transfer、command FIFO、CommandParser、Rasterizer、fragment pipeline、内部framebuffer、DDR transfer、display swap、pixel出力を順に説明する。各段階でclock、data、完了条件、確認方法を一つ書く。付録G〜Zを答え合わせに使う。

### 12.10 開発者レベルの自己確認

次の質問へsourceとreportを示して答えられれば、概要説明から設計判断へ進んでいる。

1. `always_comb`の代入漏れがなぜlatchになるのか。
2. 同じ`for`でも、software loopと回路複製をどう区別するか。
3. BRAM推論を失うRTL変更の例は何か。
4. WNSが正でもtimingを信用できない場合は何か。
5. stallとflushが同時に起きるとき何を守るか。
6. `PREADY=0`中にAPB masterとperipheralは何を保持するか。
7. 二段synchronizerで複数bit busを安全に渡せない理由は何か。
8. `cvw_t P`の値を変えたとき、SystemVerilog外の何を確認するか。
9. ISA test、module test、実機testがそれぞれ証明しないものは何か。
10. 最適化前後で機能同一性とPPAをどう比較するか。

答えに迷った場合は、該当章を読み直し、固定版sourceの一例へ結び付ける。用語の定義だけでなく、変更、予想される回路、確認report、失敗条件まで説明する。
