<!-- appendix-content:start -->
<a id="ch_12"></a>
# 第12章 Wallyを変更する実践課題
<!-- appendix-content:end -->

[付録の総目次](../../技術付録.md) ｜ [論文本文](../../本文.md) ｜ [参考文献](../references.md)

[第II部 Wally CPUとSoCアーキテクチャ](README.md)

ファイルパスの表記は、[資料フォルダー](../../README.md)を基準とする。

## このページの目次

- [12.1 課題の進め方](#s_12_1)
- [12.2 読出し専用APB識別register](#s_12_2)
- [12.3 read/write control register](#s_12_3)
- [12.4 counter peripheralとinterrupt](#s_12_4)
- [12.5 pipelineへ一つの演算を加える思考実験](#s_12_5)
- [12.6 cache parameter変更](#s_12_6)
- [12.7 critical pathを一つ改善する](#s_12_7)
- [12.8 CDC interfaceを設計する](#s_12_8)
- [12.9 WallyとRasterIXの接続を再説明する](#s_12_9)
- [12.10 開発者レベルの自己確認](#s_12_10)

<!-- appendix-content:start -->
<a id="s_12_1"></a>
## 12.1 課題の進め方

各課題は、仕様、ブロック図、RTL、simulation、合成、report、実機の順に進める。いきなり完成sourceを写さず、自分のinterface表と期待波形を先に作る。元repositoryは別worktreeまたは別cloneで保持する。

<a id="s_12_2"></a>
## 12.2 読出し専用APB識別register

最初の課題は、固定値を返すread-only registerである。base addressを選び、offset 0で32 bit IDを返し、それ以外は0または定義したerror値にする。zero-waitならaccess phaseで`PREADY=1`とする。

成功条件は、未選択時にbusへ影響しない、readでIDが一致する、writeで状態が変わらない、部分access方針が明確、reset前後で同じ値、既存peripheral testが通ることである。

<a id="s_12_3"></a>
## 12.3 read/write control register

次にenable bitを持つregisterを加える。`PSEL & PENABLE & PWRITE & PREADY`の完了時だけ更新し、`PSTRB`に従う。readbackを実装する。reset値を仕様化する。

wait stateを挿入したtestを作り、access phaseが複数cycle続いても一回だけ更新されることを確認する。back-to-back read/writeも試す。

<a id="s_12_4"></a>
## 12.4 counter peripheralとinterrupt

clockごとに増えるcounter、compare register、pending bitを作る。pendingのsetとclearが同cycleに起きたpriorityを決める。interruptをPLICへ追加するならsource ID、enable、priority、claim/complete、device tree、handlerまで追う。

softwareがinterruptを受けた回数だけでなく、pendingが保持され、clear後に再発できることを波形で確認する。

<a id="s_12_5"></a>
## 12.5 pipelineへ一つの演算を加える思考実験

独自命令を実装する前に、既存ALU operationを一つ選び、decodeからwritebackまで追跡する。opcode、control、operand、ALU、result MUX、destination、forwarding、illegal instruction、test vectorを表にする。

新命令追加ではRISC-V custom encodingの扱い、assembler、compiler、ISA test、privilege、exceptionを含む。授業演習であっても、既存標準encodingと衝突させない。

<a id="s_12_6"></a>
## 12.6 cache parameter変更

way sizeやline lengthを変更し、index/tag幅、memory wrapper、refill burst、LRU、address alignment、utilization、timing、benchmarkを比較する。parameterがcompileするだけで完了とせず、境界addressとconflict patternを試す。

性能向上を主張するなら、同じworkload、warm-up、clock、software、measurement区間でmiss率と実行時間を示す。

<a id="s_12_7"></a>
## 12.7 critical pathを一つ改善する

固定runのworst pathを選び、startpointからendpointまでをschematicとsourceへ対応付ける。logic delay、route delay、fanoutを記録し、候補を一つ選ぶ。RTL変更前後で機能test、WNS/TNS、resourceを比較する。

pipeline registerを足す場合は、latency、valid、stall、flushまで変更する。constraintだけを変えた場合は、回路改善とは別結果として扱う。

<a id="s_12_8"></a>
## 12.8 CDC interfaceを設計する

一bit level、pulse、複数bit設定、連続streamの四種類について、適切な方式を選び、誤った方式では何が失われるかを説明する。非同期位相と異なる周波数を変えたsimulation、reset途中、backpressureを試す。

FIFOなら、full/empty、overflow/underflow、順序、TLAST、reset後のpointer、片側停止をpropertyにする。容量の採用理由を最大burstと停止時間から計算する。

<a id="s_12_9"></a>
## 12.9 WallyとRasterIXの接続を再説明する

次の一文を、最低でも十個の具体的な段階へ分解する。

> CPUがRasterIXへ命令を送り、RasterIXが画像を表示する。

address decode、APB transfer、command FIFO、CommandParser、Rasterizer、fragment pipeline、内部framebuffer、DDR transfer、display swap、pixel出力を順に説明する。各段階でclock、data、完了条件、確認方法を一つ書く。[付録G](../04-rasterix/appendix-g.md#ch_g)〜Zを答え合わせに使う。

<a id="s_12_10"></a>
## 12.10 開発者レベルの自己確認

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
<!-- appendix-content:end -->

---

[前：第11章 Memory systemとon-chip bus](chapter-11.md) ｜ [次：第13章 Wallyの構成値が回路になるまで](chapter-13.md)
