## 第10章 検証を層に分ける

「正しく動いた」を確かめるには、まず何を正しいとするかを決める。例えば入力した語がA、B、Cなら、出口にもA、B、Cが一回ずつ同じ順で出ることが条件になる。この章では、その条件をコードの検査、波形の比較、合成結果、実機の観察へ分けて確認する。

### 10.1 test caseより先にpropertyを書く

propertyは常に守るべき条件、test caseは特定の入力例である。例えばvalid/ready interfaceでは「validが1でreadyが0の間、dataとlastを保持する」がpropertyである。readyを3cycle下げる試験はその一例である。

要求をpropertyへ変換すると、正常例だけでなく境界と停止条件が見える。入力範囲、リセット、同時event、overflow、illegal accessを列挙する。

![図10.1 Wally開発で積み重ねる検証層](figs/wdev-verification-layers.png)

### 10.2 lintとelaboration

lintは未使用信号、幅変換、multiple driver、latch、unreachable code、coding styleなどを早期に見つける。elaborationはパラメータとgenerateを確定し、存在しないportや幅不一致を検出する。warningを数で無視せず、新規warningがない状態を保つ。

lint cleanは機能正しさを証明しないが、後段debugのnoiseを減らす。意図的な例外は狭い範囲で理由をコメントし、全体disableを避ける。[AMD901][AMD949]

### 10.3 module simulation

小さなモジュールへ直接入力し、全分岐と境界を試す。combinational モジュールなら全入力を総当たりできる場合がある。FSMなら各状態・遷移・wait・リセットを試す。random testは広い探索に有効だが、seedと失敗入力を保存する。

clocked interfaceでは、値だけでなく周期とhandshakeを検査する。dataが正しくても一周期早い、wait中に変化する、二回side effectを起こす場合は失敗である。

### 10.4 assertion

assertionはsimulation中またはformal toolでproperty違反を検出する。例として、streamの停止中にdataを保持するpropertyは次の考え方になる。

```systemverilog
assert property (@(posedge clk) disable iff (reset)
  valid && !ready |=> valid && $stable({data, last}));
```

実際に導入するときは、protocolがvalid取消しを許すか、リセット極性、unknown値、連続stallを仕様と照合する。assertionをtestbenchだけに置くかinterface近くへbindするかもproject方針で決める。

### 10.5 formal verification

formalは、定めた前提の下で全状態・全入力についてpropertyの反例を探索できる。小さなdecoder、arbiter、FIFO control、算術等価性に有効である。state explosionがあるため、SoC全体を無条件に証明するより、境界を分ける。

「solverがunsat」とは、model化した論理式と前提の範囲で反例がない意味である。RTL全体、synthesis、analog、ソフトウェアまで自動で証明した意味に広げない。技術付録第58章はこの範囲分けを実例で示す。

### 10.6 core-levelとISA test

ISA testは命令のarchitectural動作を調べる。Wally testbenchはELFを読み、構成に応じたtest群を選び、結果を照合する。新しいmicroarchitecture最適化では、対応する命令testと回帰testを実行する。[Wally]

ISA testが通っても、未試験のinterrupt timing、キャッシュ競合、peripheral integration、Linux workloadは残る。coverageとsystem testを追加する。

### 10.7 differential verificationとRVVI

reference modelとretired instruction traceを比較すると、同じ命令列でarchitectural stateが一致するかを確認できる。内部パイプライン timingは異なってよい。比較interfaceは、PC、instruction、レジスタ write、メモリ effect、trapなど、commit時の情報を正確に対応付ける。

reference model自身の構成、ISA extension、未定義動作をそろえる。差分が出た最初のretire位置から原因を絞る。

### 10.8 integration simulation

core、uncore、メモリ、peripheralを接続し、番地 decode、bridge、interrupt、bootを試す。周辺回路追加では、ID read、read/write レジスタ、wait state、illegal access、リセット、interruptを段階化する。RasterIXではAPB wrapper単体、FIFO、display swap、共有DDR、実gameの順に広げた。

一度にLinux bootだけを試すと、失敗原因が広過ぎる。小さなbare-metal testでレジスタ accessを確認してからOSへ進む。

### 10.9 合成後・配置配線後の確認

RTL simulationと合成結果が異なる原因には、Xの扱い、初期値、範囲外index、複数driver、unsupported constructがある。必要な境界では合成後functional simulationを行う。timing simulationは遅延を含むが、実行時間が長く、全system回帰の代わりにはしにくい。

本研究のFloatToInt監査では、未変更RTLの4値simulationとArtix-7合成後functional netlistで結果が異なった。これは、どちらか一方だけで全入力の正しさを主張してはいけない例である。

### 10.10 FPGA実機とILA

実機はクロック、リセット、DDR calibration、board pin、外部device、ソフトウェアを含む統合証拠を与える。内部信号を観測するILAは有効だが、probe追加でplacement/timingが変わる可能性がある。trigger条件、capture depth、クロック domainを記録する。

LEDやUARTは低costの観測点である。意味をソースと対応付け、点灯だけから未観測の内部全体を正常と断定しない。

### 10.11 coverage

code coverageはline、branch、toggle、FSM stateなど、simulationが通った場所を示す。functional coverageは仕様上の組合せを定義する。100% code coverageでもassertionが不十分ならbugは残る。未到達codeがdeadなのかtest不足かを判断する。

パラメータ構成ごとに存在するハードウェアが違うため、一構成のcoverageを全構成へ一般化しない。

### 10.12 bug reportを再現可能にする

最低限、commit、submodule、tool版、パラメータ、test名、seed、command、期待値、実測値、最初の失敗周期、logを残す。実機ならboard、bitstream hash、SD image、接続、電源投入順も含める。

「たまに止まる」から、例えば「リセット解除後の第127回commandで`valid=1, ready=0`中に`data`が変化する」まで狭めると、修正と回帰testを作れる。
