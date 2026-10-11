<!-- appendix-content:start -->
<a id="ch_24"></a>
# 第31章 MMIOの番地対応とアクセス順序
<!-- appendix-content:end -->

[付録の総目次](../../技術付録.md) ｜ [論文本文](../../本文.md) ｜ [参考文献](../references.md)

[第III部 Linuxとシステムソフトウェア](README.md)

ファイルパスの表記は、[資料フォルダー](../../README.md)を基準とする。

## このページの目次

- [31.1 MMIOとは何か](#s_24_1)
- [31.2 固定版のmapping](#s_24_2)
- [31.3 register indexとbyte offset](#s_24_3)
- [31.4 `volatile`が保証すること](#s_24_4)
- [31.5 RISC-V fence](#s_24_5)
- [31.6 pollingとtimeout](#s_24_6)
- [31.7 `/dev/mem`を使う理由と限界](#s_24_7)
- [31.8 専用driverへ移すなら](#s_24_8)

<!-- appendix-content:start -->
回路を操作するC++の代入には、アクセス先を対応付ける準備と、その値を相手が使う順序を守る準備が要る。この章では、番地の対応付け、コンパイラによる省略や並替え、CPUやバスの順序、キャッシュの内容を別の問題として扱う。

<a id="s_24_1"></a>
## 31.1 MMIOとは何か

Memory-mapped I/Oは、load/storeの物理 番地範囲をRAMではなくdevice レジスタへ割り当てる方式である。CPU命令の形はメモリ accessだが、readでstatusを得たり、writeでFIFOへcommandを投入したりする。

普通のメモリと違い、read/writeにside effectがあり、同じaccessの繰返しが同じ結果になるとは限らない。キャッシュ、speculation、reordering、access幅をdevice契約へ合わせる。

<a id="s_24_2"></a>
## 31.2 固定版のmapping

`WallyBusConnector`は`/dev/mem`を`O_RDWR | O_SYNC`で開き、物理 `0x10080000`から4096 byteを`PROT_READ | PROT_WRITE`、`MAP_SHARED`でmappingする。戻り値を`volatile uint32_t*`へ変換する。

4096 byteはpage mappingの単位であり、ハードウェア レジスタが4096 byteある意味ではない。DTSのレジスタ regionは256 byteである。C++側は定義したindexだけをaccessする。

<a id="s_24_3"></a>
## 31.3 register indexとbyte offset

`regs`は`uint32_t*`なので、`regs[n]`のbyte offsetは`4n`である。`regs[3]`はoffset 0x0cのID、`regs[4]`は0x10のframe countである。

```text
virtual_base + 4 × index
   ↓ page table mapping
0x10080000 + 4 × index
   ↓ Wally address decode
APB peripheral register
```

ポインタ arithmeticをbyte単位と誤解すると四倍違うレジスタへaccessする。RTLのPADDR sliceとC++ indexを表で照合する。

<a id="s_24_4"></a>
## 31.4 `volatile`が保証すること

`volatile` accessは、そのC++ abstract machine上でコンパイラがread/writeを不要と判断して消したり、一つにまとめたりするのを制限する。status polling loopで毎回loadを生成させるために必要である。

しかし`volatile`は次を単独では保証しない。

- CPU ハードウェアによるメモリ orderingすべて。
- cacheabilityまたはdevice属性。
- bus transferの完了後にdevice内部処理が完了したこと。
- 複数thread間のC++ data race防止。
- DMAとのキャッシュ coherence。

<a id="s_24_5"></a>
## 31.5 RISC-V fence

`fence iorw, iorw`は先行するI/Oとメモリ accessが、後続accessよりordering上先になるよう制約する。固定版はMMIO command wordを書き終えた後に実行する。コンパイラ barrierの`"memory"` clobberも、コンパイラが周辺メモリ operationを跨いで動かすのを抑える。

fence完了はRasterIXが全triangleをrasterizeし、framebufferをDDRへcommitし、displayがswapしたことを意味しない。それぞれ別のqueueと状態を持つ。必要な完了段階に対応するstatusまたはcounterを待つ。

<a id="s_24_6"></a>
## 31.6 pollingとtimeout

status pollingは、条件が成立するまでレジスタを繰り返し読む。sleepを入れないbusy waitは反応が速いがCPUを占有する。低速single-coreでは他プロセスのscheduleにも影響する。timeoutがなければハードウェア停止時に永久loopになる。

固定版は30秒deadlineを使い、responseとdisplay swapを待つ。timeout値は正常性能の保証値ではなく、異常を有限時間で報告する保護である。性能測定区間ではtimeout判定用クロック readのcostも分けて考える。

<a id="s_24_7"></a>
## 31.7 `/dev/mem`を使う理由と限界

研究用prototypeでは、小さなC++ connectorでレジスタを直接操作でき、kernel driver実装を省ける。ID、status、commandを早く検証するには有効である。

一方、root権限が必要で、プロセス間の排他、buffer管理、interrupt、security、power management、DMA mappingをkernelが管理しない。公開する一般systemなら、platform driverとcharacter deviceまたはDRMなどのsubsystemを検討する。固定版の選択はprototypeの範囲に対するもので、最終的なproduction APIの最適解を意味しない。

<a id="s_24_8"></a>
## 31.8 専用driverへ移すなら

driverはDTのresourceを取得し、`ioremap`でレジスタをmappingし、accessorでread/writeする。user APIは`ioctl`、`write`、`mmap`、poll、interrupt completionなどから選ぶ。shared bufferはDMA APIまたはreserved メモリの管理を使う。

driver化してもハードウェア protocolは同じである。利点は権限、lifetime、排他、error、キャッシュ属性を一箇所へ集められることだ。overheadと複雑さも増えるため、研究の目的と利用者を明確にする。
<!-- appendix-content:end -->

---

[前：第30章 デバイスツリーで回路の情報をLinuxへ伝える](device-tree.md) ｜ [次：第32章 RasterIXの描画ソフトウェアの処理経路](graphics-software-stack.md)
