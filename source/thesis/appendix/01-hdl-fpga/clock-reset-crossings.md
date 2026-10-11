## 第9章 異なるクロック間の転送とリセット

異なるクロックを使う回路どうしでは、相手が値を書き換える時刻と、自分が値を保存する時刻を同じ一周期として扱えない。扱いたいものが一ビットの状態か、短い通知か、複数ビットの一語かによって、守る条件が変わる。この章では信号の種類から接続方法を選び、起動やリセットでも同じ約束が成り立つかを考える。

### 9.1 clock domainを先に色分けする

一つのクロック エッジで更新されるレジスタ群をクロック domainとして考える。Wally CPU クロック、RasterIX クロック、画素 クロック、DDR user クロックなどをブロック図で色分けする。各interfaceにソース domain、destination domain、data性質、更新頻度、リセットを記録する。

クロック周波数が同じでも、位相関係が保証されなければasynchronous crossingである。逆に同じMMCMから生成され、関係をtoolへ伝えられるクロックはsynchronousに解析できる場合がある。

### 9.2 metastabilityはsimulationだけでは見えない

非同期信号がFFのsetup/hold window付近で変化すると、FF出力が一定時間0/1の中間状態になり得る。digital RTL simulationは通常このanalog現象を再現しない。synchronizerはmetastabilityの発生を0にするのではなく、次段へ伝わる確率を下げる。

MTBFはクロック、data toggle rate、device特性、解決時間に依存する。二段FFという形だけで、任意の安全要求を自動達成するとは限らない。

### 9.3 一bit levelの二段synchronizer

一定時間保持されるenableやstatus levelは、destination クロックで二段以上のFFを通す典型方式がある。最初のFFがmetastableになっても、二段目で使うまでに解決時間を与える。ソース側の短いpulseは、destinationが一度もsampleせず消える可能性があるため、この方式だけでは不十分である。

### 9.4 pulse、toggle、handshake

短いeventはソース側でtoggle bitを反転し、destination側で同期後の変化を検出できる。eventが次々に来る場合、前の変化をdestinationが観測する前に再反転すると失う。request/acknowledge handshakeなら一件ずつ確実に渡せるが、往復遅延がある。

event lossを許すか、複数件を数えるか、ソースを待たせられるかで方式を選ぶ。

### 9.5 複数bitを個別同期しない

複数bit busを各bitの二段FFへ入れると、各bitの解決時刻が異なり、存在しなかった組合せを受ける可能性がある。ゆっくり変わる設定値なら、ソースで値を保持し、同期したrequestを渡し、destinationでまとめてcaptureし、ackを返す。

連続streamには非同期FIFOを用い、data メモリとポインタ同期で順序を守る。Gray codeはポインタ更新時に変化するbit数を一つへ抑えるが、CDC constraintと同期FFが不要になるわけではない。

![図9.1 渡す信号の性質に応じたCDC方式](figs/wdev-cdc-patterns.png)

### 9.6 reset assertionとdeassertion

外部リセットを非同期assertし、クロックが安定した後に各domainで同期deassertする方式がよく使われる。assertを早く効かせつつ、解除エッジをdomain クロックへそろえるためである。複数domainが通信する場合、片側だけ先に動いて要求を出さないようstartup protocolを設ける。

`ClockLocked`やDDR calibration完了をCPU リセット解除へ使う場合、それらのdomainと同期、glitch、再lock時の挙動を確認する。LED表示は観測補助であり、リセット sequenceの形式的保証ではない。

### 9.7 resetで初期化すべき状態

control FSM、valid bit、FIFO ポインタ、protocol stateは既知状態が必要である。data array全体はvalidが0なら読まれない設計にできる場合がある。大きなメモリを一周期で全clearする記述は物理的に実現できず、FFへ展開されるか、複数周期 clear FSMが必要になる。

起動時のframebuffer初期化では、リセットで全画素を同時clearするのではなく、commandまたはCPUが領域を書き、完了を待つ。制御stateのリセットと画像dataの初期化を分ける。

### 9.8 clock enableと新しいclock domain

低速動作が必要なだけなら、元クロックでcounter enableを作り、レジスタを一部周期だけ更新する方が、新しいlogic-generated クロックを作るより安全なことが多い。新しいクロック domainを作ると、クロック buffer、constraint、CDC、リセットが増える。

外部protocolが特定エッジを要求する場合や、画素 serializerのように専用クロックが必要な場合は、MMCM/PLLとclocking resourceを使う。

### 9.9 本構成の主な境界

| 境界 | 運ぶもの | 採用する仕組み |
|---|---|---|
| CPU→RasterIX | 32 bit commandと終端 | AXI4-Stream非同期FIFO |
| RasterIX→CPU | status/response | response経路と同期 |
| GPU→画素 | frame切替要求・番地 | handshake型制御 |
| DDR user クロック間 | メモリ transaction | vendor AXI クロック converter/IP |
| 外部button/UART | 一bit非同期入力 | synchronizerとprotocol sampling |

名称だけで安全とせず、source/destination クロック、リセット、full/empty、request/ackの各信号を固定版ソースで確認する。

### 9.10 CDC review checklist

1. すべてのレジスタをクロック domainへ分類したか。
2. crossing 信号のbit数と意味を分類したか。
3. pulseを失う可能性を評価したか。
4. busの同時性を守る仕組みがあるか。
5. backpressure時にdataを保持するか。
6. リセット中と片側だけ起動した状態を扱うか。
7. `report_cdc`のwarningを一件ずつ説明したか。
8. 非同期位相を変えたsimulationまたはformal propertyがあるか。

「二段FFを入れた」だけを完了条件にしない。
