<!-- appendix-content:start -->
<a id="ch_9"></a>
# 第9章 Wallyの階層と構成を読む
<!-- appendix-content:end -->

[付録の総目次](../../技術付録.md) ｜ [論文本文](../../本文.md) ｜ [参考文献](../references.md)

[第II部 Wally CPUとSoCアーキテクチャ](README.md)

ファイルパスの表記は、[資料フォルダー](../../README.md)を基準とする。

## このページの目次

- [9.1 core、SoC、board topを区別する](#s_9_1)
- [9.2 `wallypipelinedcore`の主要unit](#s_9_2)
- [9.3 `cvw_t`は構成契約である](#s_9_3)
- [9.4 configurationから回路が生成されるまで](#s_9_4)
- [9.5 interfaceから階層を理解する](#s_9_5)
- [9.6 IFUを読む観点](#s_9_6)
- [9.7 IEUを読む観点](#s_9_7)
- [9.8 LSU、cache、MMUを読む観点](#s_9_8)
- [9.9 privileged unitを読む観点](#s_9_9)
- [9.10 新しい機能をどこへ置くか](#s_9_10)

<!-- appendix-content:start -->
<a id="s_9_1"></a>
## 9.1 core、SoC、board topを区別する

`wallypipelinedcore`は命令を実行するcoreである。`wallypipelinedsoc`はcoreとuncoreを組み合わせ、memoryやperipheralへ接続する。FPGA最上位はboardのpin、clock生成、DDR controller、reset、Wally SoCを結ぶ。これらをすべてCPUと呼ぶと、変更場所を誤る。[Wally](../references.md#ref_wally)[Console26](../references.md#ref_console26)

![図9.1 固定コミットで読むWallyの階層](../../figs/wdev-wally-hierarchy.png)

RasterIX追加では、RISC-V命令実行器の内部へ描画pipelineを入れたのではない。uncoreの外部APB interfaceとboard topに描画回路を接続した。ゲームsoftwareは通常のstoreで命令語を送り、RasterIXはCPUと並列に動く。

<a id="s_9_2"></a>
## 9.2 `wallypipelinedcore`の主要unit

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

<a id="s_9_3"></a>
## 9.3 `cvw_t`は構成契約である

`src/cvw.sv`の`cvw_t`にはXLEN、ISA extension、cache形状、TLB、address map、peripheralの有無などがまとまる。各moduleは`#(parameter cvw_t P)`を受け、`P.XLEN`などを参照する。構成をpackageへ集めることで、global macroの名前衝突と、階層ごとのばらばらな値を減らす。[Wally](../references.md#ref_wally)[Harris26](../references.md#ref_harris26)

ただし値を一か所へ集めただけで整合が自動保証されるとは限らない。boardのDDR容量、device tree、boot software、C++定数など、SystemVerilog外にも同じ事実の表現がある。変更影響を列挙し、生成物を更新する。

<a id="s_9_4"></a>
## 9.4 configurationから回路が生成されるまで

`config/derivlist.txt`などの派生構成から`config.vh`とparameter定義が作られ、testbenchやFPGA buildが`P`を組み立てる。`P.F_SUPPORTED`や`P.BUS_SUPPORTED`はgenerate条件として使われ、不要unitを物理回路から除ける。

実行時にfeature bitを0へ書けば回路が消えるわけではない。compile/elaboration時parameterと、softwareから書き換えるcontrol registerを区別する。前者はbitstreamを作り直す必要がある。

<a id="s_9_5"></a>
## 9.5 interfaceから階層を理解する

大きなmoduleを読む順番は次である。

1. parameterとclock/resetを読む。
2. 入出力を機能別に分ける。
3. 内部signalのstage suffixと幅を確認する。
4. submodule instanceをブロック図へ置く。
5. 各submodule間の要求・応答を一経路ずつ追う。
6. generateの有効・無効両方で未駆動がないか確認する。

`wallypipelinedcore.sv`を先頭から逐語的に読むより、IFU→IEU→LSU→EBU、privileged→hazardという経路を選んだ方が理解しやすい。

<a id="s_9_6"></a>
## 9.6 IFUを読む観点

IFUは次に取得するPCを選び、instruction memoryまたはI-cacheへ要求し、得た命令をDecodeへ渡す。branch predictionが有効なら、予測PCと後で判明した正しいPCを比較する。compressed instruction対応では、16 bit単位の境界と命令の組立ても関係する。

確認する状態は、PC register、fetch buffer、cache/TLB state、予測器stateである。stall時にPCを保持する条件、flush時に次PCを切り替える条件、instruction access faultがどのstageへ届くかを追う。

<a id="s_9_7"></a>
## 9.7 IEUを読む観点

IEUは命令fieldをdecodeし、register fileからoperandを読み、immediateを生成し、ALU・branch・CSR・load/store制御を作る。Decodeで決めるcontrolと、Execute/Memoryへpipeline registerで運ぶcontrolを分ける。

data path変更では、値だけでなく、結果を選ぶMUX、write enable、destination register番号、exception条件、forwarding sourceを追う。新しい演算をALUへ加えても、decodeとwriteback selectionがなければarchitectural resultへ届かない。

<a id="s_9_8"></a>
## 9.8 LSU、cache、MMUを読む観点

LSUはeffective address、byte/half/wordのalignment、loadの符号拡張、store byte mask、atomic、D-cache、address translation、PMP/PMA、bus requestを結ぶ。単にmemoryを読むmoduleではない。

virtual addressからphysical addressへの変換、cacheableか、alignment違反か、access権があるかを順に区別する。Linux構成でpage faultとbus errorを同じ原因として扱わない。cache missではpipeline stallとline refillが起こり、uncached MMIOでは周辺回路のreadyを待つ。

<a id="s_9_9"></a>
## 9.9 privileged unitを読む観点

privileged unitはCSR、現在のprivilege mode、interrupt、exception、trap vector、returnを扱う。RISC-V privileged specificationはsoftwareから見える動作を定め、Wally RTLはそれをpipelineへ統合する。[RISCVPriv26](../references.md#ref_riscvpriv26)

precise exceptionでは、trapより前の命令は完了し、後の命令はarchitectural stateを変更してはならない。exceptionを検出したstage、CSRへ記録するPCと原因、pipeline flush、進行中memory operationを対応付ける。

<a id="s_9_10"></a>
## 9.10 新しい機能をどこへ置くか

| 要求 | 通常の配置候補 | 避けるべき混同 |
|---|---|---|
| 新しいRISC-V命令 | decode、data path、CSR、test | 周辺register追加と同一視する |
| memory-mapped peripheral | uncore、APB、address map | ALUへ直接置く |
| 高bandwidth accelerator | bus/stream、DMA、memory契約 | APB registerだけでdata全量を送る |
| board pin追加 | FPGA top、XDC、I/O回路 | core RTLへboard名を埋め込む |
| software-only機能 | driver/application | 不要なhardware stateを増やす |

責務の近い階層へ置けば、coreの再利用性と検証範囲を保ちやすい。RasterIXのようなacceleratorでも、control path、command path、bulk memory path、display pathを別々に設計する。
<!-- appendix-content:end -->

---

[前：付録K 回路とFPGAの基礎](../01-hdl-fpga/appendix-k.md) ｜ [次：第10章 命令pipelineとarchitectural state](chapter-10.md)
