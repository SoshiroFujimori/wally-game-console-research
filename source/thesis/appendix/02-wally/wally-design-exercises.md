## 第24章 Wallyを変更する実践課題

### 24.1 課題の進め方

各課題は、仕様、ブロック図、RTL、simulation、合成、report、実機の順に進める。いきなり完成ソースを写さず、自分のinterface表と期待波形を先に作る。元repositoryは別worktreeまたは別cloneで保持する。

### 24.2 読出し専用APB識別register

最初の課題は、固定値を返すread-only レジスタである。base 番地を選び、offset 0で32 bit IDを返し、それ以外は0または定義したerror値にする。zero-waitならaccess phaseで`PREADY=1`とする。

成功条件は、未選択時にbusへ影響しない、readでIDが一致する、writeで状態が変わらない、部分access方針が明確、リセット前後で同じ値、既存peripheral testが通ることである。

### 24.3 read/write control register

次にenable bitを持つレジスタを加える。`PSEL & PENABLE & PWRITE & PREADY`の完了時だけ更新し、`PSTRB`に従う。readbackを実装する。リセット値を仕様化する。

wait stateを挿入したtestを作り、access phaseが複数周期続いても一回だけ更新されることを確認する。back-to-back read/writeも試す。

### 24.4 counter peripheralとinterrupt

クロックごとに増えるcounter、compare レジスタ、pending bitを作る。pendingのsetとclearが同周期に起きたpriorityを決める。interruptをPLICへ追加するならソース ID、enable、priority、claim/complete、device tree、handlerまで追う。

ソフトウェアがinterruptを受けた回数だけでなく、pendingが保持され、clear後に再発できることを波形で確認する。

### 24.5 pipelineへ一つの演算を加える思考実験

独自命令を実装する前に、既存ALU operationを一つ選び、decodeからwritebackまで追跡する。opcode、control、operand、ALU、result MUX、destination、forwarding、illegal instruction、test vectorを表にする。

新命令追加ではRISC-V custom encodingの扱い、assembler、コンパイラ、ISA test、privilege、exceptionを含む。授業演習であっても、既存標準encodingと衝突させない。

### 24.6 cache parameter変更

way sizeやline lengthを変更し、index/tag幅、メモリ wrapper、refill burst、LRU、番地 alignment、utilization、timing、benchmarkを比較する。パラメータがcompileするだけで完了とせず、境界番地とconflict patternを試す。

性能向上を主張するなら、同じworkload、warm-up、クロック、ソフトウェア、measurement区間でmiss率と実行時間を示す。

### 24.7 critical pathを一つ改善する

固定runのworst pathを選び、startpointからendpointまでをschematicとソースへ対応付ける。logic delay、route delay、fanoutを記録し、候補を一つ選ぶ。RTL変更前後で機能test、WNS/TNS、resourceを比較する。

パイプライン レジスタを足す場合は、遅延、valid、stall、flushまで変更する。constraintだけを変えた場合は、回路改善とは別結果として扱う。

### 24.8 CDC interfaceを設計する

一bit level、pulse、複数bit設定、連続streamの四種類について、適切な方式を選び、誤った方式では何が失われるかを説明する。非同期位相と異なる周波数を変えたsimulation、リセット途中、backpressureを試す。

FIFOなら、full/empty、overflow/underflow、順序、TLAST、リセット後のポインタ、片側停止をpropertyにする。容量の採用理由を最大burstと停止時間から計算する。

### 24.9 WallyとRasterIXの接続を再説明する

次の一文を、最低でも十個の具体的な段階へ分解する。

> CPUがRasterIXへ命令を送り、RasterIXが画像を表示する。

番地 decode、APB transfer、command FIFO、CommandParser、Rasterizer、画素候補 パイプライン、内部framebuffer、DDR transfer、display swap、画素出力を順に説明する。各段階でクロック、data、完了条件、確認方法を一つ書く。技術付録第42章〜第58章を答え合わせに使う。

### 24.10 開発者レベルの自己確認

次の質問へソースとreportを示して答えられれば、概要説明から設計判断へ進んでいる。

1. `always_comb`の代入漏れがなぜlatchになるのか。
2. 同じ`for`でも、ソフトウェア loopと回路複製をどう区別するか。
3. BRAM推論を失うRTL変更の例は何か。
4. WNSが正でもtimingを信用できない場合は何か。
5. stallとflushが同時に起きるとき何を守るか。
6. `PREADY=0`中にAPB masterとperipheralは何を保持するか。
7. 二段synchronizerで複数bit busを安全に渡せない理由は何か。
8. `cvw_t P`の値を変えたとき、SystemVerilog外の何を確認するか。
9. ISA test、モジュール test、実機testがそれぞれ証明しないものは何か。
10. 最適化前後で機能同一性とPPAをどう比較するか。

答えに迷った場合は、該当章を読み直し、固定版ソースの一例へ結び付ける。用語の定義だけでなく、変更、予想される回路、確認report、失敗条件まで説明する。
