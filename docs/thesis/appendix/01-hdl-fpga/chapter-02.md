<!-- appendix-content:start -->
<a id="ch_2"></a>
# 第2章 SystemVerilogから回路を読み取る
<!-- appendix-content:end -->

[付録の総目次](../../技術付録.md) ｜ [論文本文](../../本文.md) ｜ [参考文献](../references.md)

[第I部 HDLとFPGAによるデジタル回路設計](README.md)

ファイルパスの表記は、[資料フォルダー](../../README.md)を基準とする。

## このページの目次

- [2.1 moduleは回路の境界である](#s_2_1)
- [2.2 `logic`、net、変数、driver](#s_2_2)
- [2.3 `assign`と`always_comb`](#s_2_3)
- [2.4 `always_ff`とclock edge](#s_2_4)
- [2.5 blocking代入とnonblocking代入](#s_2_5)
- [2.6 resetの種類と優先順位](#s_2_6)
- [2.7 FSMを状態registerと次状態論理へ分ける](#s_2_7)
- [2.8 構造記述と暗黙port接続](#s_2_8)
- [2.9 parameter、package、`cvw_t P`](#s_2_9)
- [2.10 `generate`とprocedural `for`を区別する](#s_2_10)
- [2.11 幅、符号、式の途中のbit数](#s_2_11)
- [2.12 XとZを異常の手掛かりにする](#s_2_12)
- [2.13 合成可能な記述とtestbench専用記述](#s_2_13)

<!-- appendix-content:start -->
<a id="s_2_1"></a>
## 2.1 moduleは回路の境界である

SystemVerilogの`module`は、softwareの関数呼出しとは異なる。実体化したmoduleは回路として常に存在し、入力が変わると組み合わせ論理が反応し、clock edgeで内部状態が更新される。portは、その回路境界を越えるsignalの方向と幅を定める。[Harris26](../references.md#ref_harris26)

Wallyでは`wallypipelinedcore.sv`がIFU、IEU、LSU、privileged unit、hazard unitなどを実体化する。ここで`ieu(...)`の記述が先にあり、`lsu(...)`が後にあることは、IEUを実行し終えてからLSUを呼ぶ意味ではない。両者は同時に存在し、signalで接続される。

module境界を設計するときは、責務、clock/reset、要求と応答、data幅、backpressure、error、所有する状態を表にする。port名を増やし続ける前に、二つのmoduleを分ける境界が安定しているかを考える。

<a id="s_2_2"></a>
## 2.2 `logic`、net、変数、driver

`logic`は4値の変数型で、0、1、X、Zを表せる。SystemVerilogでは連続代入や一つのprocedural blockから駆動する多くのsignalに`logic`を使える。しかし`logic`と書いたからregisterになるわけではない。何が駆動するかで回路が決まる。

複数の回路が同じsignalを同時に駆動すると、意図しないmultiple driverになる。chip内部で複数の出力を直接短絡して選択する設計は避け、MUXで一つを選ぶ。Wallyの`uncore.sv`が複数の読出しdataをselect signalでまとめる式は、この考え方を明示している。

<a id="s_2_3"></a>
## 2.3 `assign`と`always_comb`

現在の入力だけで出力が決まり、過去を覚えない回路が組み合わせ論理である。単純な式は`assign`で表す。複数の条件、`case`、一時値を順に計算したい場合は`always_comb`を使う。`always_comb`内では、通常、blocking代入`=`を用いる。[Harris26](../references.md#ref_harris26)

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

<a id="s_2_4"></a>
## 2.4 `always_ff`とclock edge

`always_ff @(posedge clk)`は、正のclock edgeで値を保存するflip-flopを表す。Wallyの`flopenr.sv`はenable付き同期reset registerを次の形で記述する。[Wally](../references.md#ref_wally)

```systemverilog
always_ff @(posedge clk)
  if (reset)   q <= '0;
  else if (en) q <= d;
```

`en`が0のとき代入がないのは、`q`を保持するという順序回路の仕様である。これは`always_comb`で値を代入し忘れる場合と違う。`reset`はclock edgeで評価される同期resetであり、`reset`が変化した瞬間に非同期で`q`を変える記述ではない。

<a id="s_2_5"></a>
## 2.5 blocking代入とnonblocking代入

組み合わせ計算にはblocking代入`=`、clocked register更新にはnonblocking代入`<=`を用いる。nonblocking代入では、右辺はedge時点の古い値で評価され、左辺の更新はまとめて反映される。この規則により、pipeline registerを同じblockへ並べても、一つのedgeでdataが複数stageを飛び越えない。

```systemverilog
always_ff @(posedge clk) begin
  InstrD <= InstrF;
  InstrE <= InstrD;
end
```

この記述で`InstrE`へ入るのはedge直前の`InstrD`であり、同じedgeで`InstrF`から更新された新しい`InstrD`ではない。blocking代入を使うとsimulation上の意味が変わり、合成意図が読みにくくなる。

<a id="s_2_6"></a>
## 2.6 resetの種類と優先順位

resetには同期・非同期、High active・Low activeがある。どれを使うかは、device、clock起動、IP、system要求に依存する。重要なのは、assertとdeassertの条件、各domainでの解除時刻、data path enableとの優先順位を一貫させることである。

resetをすべてのdata registerへ無条件に配ると、高fanout routingを増やし、SRLやBRAMの推論を妨げる場合がある。一方、control state、valid bit、外部へ見える状態を未初期化のままにすると、起動が不定になる。data本体をresetせずvalid bitで無効化できるか、仕様から判断する。資源節で、memory初期化との関係を扱う。[AMD901](../references.md#ref_amd901)[AMD949](../references.md#ref_amd949)

<a id="s_2_7"></a>
## 2.7 FSMを状態registerと次状態論理へ分ける

FSMは少なくとも、現在状態を保存するregister、次状態を決める論理、出力論理からなる。Wallyの`busfsm.sv`では列挙型`CurrState`と`NextState`を使い、`always_ff`で状態を更新し、`always_comb`の`case`でAHB transactionの進行を決める。[Wally](../references.md#ref_wally)

列挙型は、bit patternより状態名で考えられる利点がある。状態追加時は、全遷移、reset state、illegal stateからの回復、各状態の出力、待ち条件を確認する。`default`で初期状態へ戻すだけでは、なぜillegal stateに入ったかを検証しなくてよい意味にはならない。

<a id="s_2_8"></a>
## 2.8 構造記述と暗黙port接続

Wallyでは`.clk`のような短縮表記を多く使う。これはport名`clk`へ同名のsignalを接続する記法である。簡潔だが、同名のsignalが期待する幅・domain・極性かをmodule宣言で確認する必要がある。異名接続は`.ReadDataW(ReadDataW[P.XLEN-1:0])`のように明示される。

構造記述を読む順番は、module種類、instance名、parameter、clock/reset、要求方向、応答方向である。大量のportを上から眺めるより、interfaceの契約ごとにまとまりを付ける。

<a id="s_2_9"></a>
## 2.9 parameter、package、`cvw_t P`

Wallyは、global macroの衝突を避け、構成を一つの型として階層へ渡すため、`src/cvw.sv`にpacked structure `cvw_t`を定義する。`P.XLEN`、`P.BUS_SUPPORTED`、cache容量、peripheral addressなどをmodule parameterとして使う。[Harris26](../references.md#ref_harris26)[Wally](../references.md#ref_wally)

parameterは実行中に変わるregisterではない。elaboration時に値が決まり、幅、generate分岐、配列数、回路の有無を変える。`if (P.BUS_SUPPORTED) begin : ebu`は、条件が真ならEBU回路を生成し、偽なら代替の定数接続を生成する。softwareの実行時ifとは異なる。

<a id="s_2_10"></a>
## 2.10 `generate`とprocedural `for`を区別する

generateは、elaboration時にmoduleや接続を複数作る。procedural `for`は`always_comb`や`always_ff`の内部で、静的な反復範囲なら通常、複数の論理へ展開される。どちらもCPUが一回ずつloopを実行する意味ではない。

例えば64 bitの各bitへ同じ論理を適用するloopは、64個分の回路を生み得る。反復回数を倍にするとsimulation行数はほぼ変わらなくても、面積が倍に近づくことがある。順番に一個の演算器を再利用したいなら、FSM、counter、register、完了signalを設計する。

<a id="s_2_11"></a>
## 2.11 幅、符号、式の途中のbit数

HDLの算術では、入力幅、signed/unsigned、定数の幅、式の自己決定幅が結果へ影響する。`logic [7:0] a, b; logic [7:0] y; assign y = a + b;`では9 bit目のcarryは`y`に保存されない。carryが必要なら出力を広げ、operandも意図した幅へ拡張する。

比較でもsignednessを確認する。二の補数の負値をunsignedとして比較すると、上位bitが1の大きな正値として扱われる。castは警告を消すためではなく、仕様上の解釈を明示するために使う。幅警告を一括で無効化せず、切捨て、符号拡張、zero拡張が意図どおりか一件ずつ判断する。

<a id="s_2_12"></a>
## 2.12 XとZを異常の手掛かりにする

4値simulationのXは、未初期化、競合、範囲外index、case未定義などを表し得る。Xを0として見なす2値simulationだけでは、設計上の穴を見逃す場合がある。前章で監査したRasterIXの`number[shiftSize-1]`は、`shiftSize=0`で範囲外を読み、4値simulationがXを露出させた例である。

Zは高impedanceを表し、主に外部tri-state I/Oで使う。FPGA内部の共有busは通常MUXへ変換される。Xを消すために無条件の初期値や`casex`を足す前に、原因が実回路でも危険か、simulationだけのmodelかを分ける。

<a id="s_2_13"></a>
## 2.13 合成可能な記述とtestbench専用記述

`#10`のdelay、任意のfile I/O、simulationを停止する`$finish`、時刻を進めるtestbench clock generatorなどは、通常のhardwareとして合成しない。`initial`も用途とtargetで扱いが異なり、FPGA memory初期値として使える場合と、ASICで回路にならない場合を分ける。Wallyのtestbenchにある`$value$plusargs`やELF file読込みはsimulation環境であり、CPU内部に文字列処理回路を作っているわけではない。
<!-- appendix-content:end -->

---

[前：第1章 Wally開発者が使う抽象化階層](chapter-01.md) ｜ [次：第3章 資源効率を決めるRTL設計](chapter-03.md)
