## 第2章 プログラムとRTLとゲート回路の関係

### 2.1 この技術付録の到達目標

この技術付録の目標は、SystemVerilogの文法を暗記することではない。Wallyへ変更を加える際に、要求を回路へ落とし、生成された回路が意図と一致するかを検証し、資源・速度・正しさの結果から設計を修正できる状態を目指す。対象は固定コミット`d3e181ac434a01a1f174549b5fbc7ee03a8875b4`であり、一般論と固定版の事実を区別する。[Console26][Wally]

開発者レベルの理解には、次の問いへ別々に答えられる必要がある。

| 問い | 主に使う資料 | 答えとして必要なもの |
|---|---|---|
| 何を実現するのか | ISA、周辺回路仕様、要求表 | 入出力、状態、例外、完了条件 |
| どの構造で実現するのか | ブロック図、モジュール階層 | 所有者、interface、クロック domain |
| 各周期で何が起きるのか | RTL、波形 | レジスタ更新条件と組み合わせ論理 |
| 何の資源になったか | 合成netlist、utilization report | LUT、FF、BRAM、DSP、クロック資源 |
| 指定周期で動くか | timing report、XDC | startpoint、endpoint、slack、制約 |
| 仕様どおりか | test、assertion、実機記録 | 前提、刺激、観測値、期待値 |

最後の列を説明できない場合、「コードを読んだ」ことと「設計を理解した」ことを分ける。例えば`+`を見て加算だと分かっても、幅、符号、overflow、前後のレジスタ、合成先、critical pathへの影響を確認していなければ、その加算器を安全に変更できる理解には達していない。

### 2.2 仕様から実機までの六層

![図2.1 Wally開発者が行き来する抽象化階層](figs/wdev-abstraction-stack.png)

上から下へ進むほど実物に近づく。要求・仕様は、外から観察できる約束を定める。マイクロアーキテクチャは、その約束をパイプライン、キャッシュ、bus、FSMなどの構造で実現する方法である。RTLは、その構造をクロック エッジ間の転送として記述する。合成後netlistは、RTLをFPGAのLUT、flip-flop、BRAM、DSPなどへ写した論理構造である。配置配線後designには、素子の場所と配線遅延が入る。bitstreamは、その配置配線結果をFPGAへ設定するデータである。[Harris26][AMD901][AMD949]

一つの層で得た結果を、別の層の証明として使い過ぎてはならない。RTL simulationの成功は、与えた入力に対するRTLの動作を示す。配置配線後の正のslackは、指定したクロックと例外条件の下でtimingを満たしたことを示す。bitstreamを書き込んでUARTが動くことは、少なくともクロック、リセット、CPU、UART、ソフトウェア起動経路の一部が実機で働いたことを示す。どれも、別の層すべてを単独で証明しない。

### 2.3 ISAとマイクロアーキテクチャを分ける

RISC-V ISAは、命令の意味、レジスタ、例外など、ソフトウェアから見えるarchitectural stateの約束を定める。同じ命令列を正しく実行するCPUでも、単周期、5段パイプライン、out-of-orderなど内部構造は異なり得る。WallyのIFU、IEU、LSU、キャッシュ、分岐予測器はマイクロアーキテクチャであり、ISAそのものではない。[RISCVUnpriv26][RISCVPriv26][Harris26]

この区別は周辺回路追加でも重要である。RasterIXをmemory-mapped I/Oとして接続しても、RISC-V命令の意味を変えたわけではない。既存のload/store命令が特定の物理番地へ到達したとき、uncoreがRasterIXを選ぶようにSoCの番地 mapを拡張した。したがって変更箇所は主にSoC integrationであり、命令decodeへ独自命令を追加した変更とは異なる。

### 2.4 動作記述、RTL、構造記述の関係

「動作記述」と「構造記述」は、必ずしも別言語や排他的な二分類ではない。`assign y = a + b;`は、望む動作を演算子で書いた動作寄りの記述であり、合成可能で、レジスタ間に置けばRTL設計の一部になる。別のモジュールを実体化して端子を結ぶ記述は構造寄りである。一つの設計は通常、両方を含む。[Harris26]

![図2.2 動作記述、cycleを持つRTL、構造記述の関係](figs/wdev-rtl-three-forms.png)

RTLは「使用した構文名」よりも、レジスタとレジスタの間で、どの値が、どのクロック エッジに、どの条件で移るかを明確にする設計の抽象度である。ゲート一個ずつを手で接続する必要はない。一方、任意のソフトウェア algorithmを書けば望む回路になるわけでもない。設計者は、書いた式が加算器、MUX、priority encoder、メモリ、FSMのどれを推論させるかを予測する。

### 2.5 RTL、論理合成、ゲートレベルという語

論理合成は、合成可能なRTLを論理networkへ変換し、等価変形と最適化を行い、対象technologyの部品へ写す。ASICならNAND、NOR、flip-flopなどを含むstandard cell libraryへmappingする。FPGAではLUT、carry chain、FF、BRAM、DSP、I/O bufferなどのprimitiveへmappingする。このためFPGAの「gate-level netlist」は、文字どおり二入力AND gateだけが並ぶとは限らない。[Harris26][AMD901]

Vivadoの`write_verilog -mode funcsim`で得る合成後netlistは、元のモジュール名や式が最適化され、primitiveと接続へ変換された姿を確認する資料である。`write_verilog -mode timesim`とSDFは配置配線後の遅延simulationに使える。ただし、netlistを人が最初から最後まで読むことが通常の設計方法ではない。元RTL、schematic、階層別utilization、timing pathを対応付け、疑わしい箇所へ絞る。

### 2.6 一つの信号を六層で追う

例として`StallW`を追う。仕様上は、writeback 段を進められない原因があるとき、パイプラインを止める必要がある。マイクロアーキテクチャ上は、後段の停止を前段へ伝える。RTLでは`hazard.sv`が`StallW`を求め、`StallM`、`StallE`、`StallD`、`StallF`へ連鎖させる。合成後は論理式を実現するLUTと配線になる。配置配線後には、そのfanoutと配線距離が遅延へ加わる。実機ではキャッシュ missや外部stallなどの条件でパイプラインの進行が止まる。

この追跡は「信号名の意味」だけでなく、発生源、利用先、クロック domain、assertされる期間、解除条件、timing pathを含む。新しいstall原因を足すなら、論理式へORするだけでなく、flushとの優先順位、進行中bus transaction、例外のprecise性、coverageを再検討する。

### 2.7 説明の確度を三段階に分ける

設計文書では、次の三種類を明示する。

1. **仕様またはソースから直接読めること**: モジュール port、式、状態遷移、パラメータ値など。
2. **toolで確認したこと**: 合成資源、timing、CDC、simulation結果など。tool版と入力版を固定する。
3. **設計案または予想**: パイプライン追加で速くなる、BRAMへ移せる、という未検証の案。

「一般にこうなる」と「この固定版でそうなった」を混ぜない。特に資源推論とtimingは、RTL、対象 device、tool版、constraint、最適化optionで変わる。好ましいidiomはあるが、最終判断はreportで行う。
