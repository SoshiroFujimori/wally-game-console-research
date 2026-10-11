<!-- appendix-content:start -->
<a id="ch_24"></a>
# 第24章 MMIO、`mmap`、`volatile`、fenceを深く理解する
<!-- appendix-content:end -->

[付録の総目次](../../技術付録.md) ｜ [論文本文](../../本文.md) ｜ [参考文献](../references.md)

[第III部 Linuxとシステムソフトウェア](README.md)

ファイルパスの表記は、[資料フォルダー](../../README.md)を基準とする。

## このページの目次

- [24.1 MMIOとは何か](#s_24_1)
- [24.2 固定版のmapping](#s_24_2)
- [24.3 register indexとbyte offset](#s_24_3)
- [24.4 `volatile`が保証すること](#s_24_4)
- [24.5 RISC-V fence](#s_24_5)
- [24.6 pollingとtimeout](#s_24_6)
- [24.7 `/dev/mem`を使う理由と限界](#s_24_7)
- [24.8 専用driverへ移すなら](#s_24_8)

<!-- appendix-content:start -->
<a id="s_24_1"></a>
## 24.1 MMIOとは何か

Memory-mapped I/Oは、load/storeのphysical address範囲をRAMではなくdevice registerへ割り当てる方式である。CPU命令の形はmemory accessだが、readでstatusを得たり、writeでFIFOへcommandを投入したりする。

普通のmemoryと違い、read/writeにside effectがあり、同じaccessの繰返しが同じ結果になるとは限らない。cache、speculation、reordering、access幅をdevice契約へ合わせる。

<a id="s_24_2"></a>
## 24.2 固定版のmapping

`WallyBusConnector`は`/dev/mem`を`O_RDWR | O_SYNC`で開き、physical `0x10080000`から4096 byteを`PROT_READ | PROT_WRITE`、`MAP_SHARED`でmappingする。戻り値を`volatile uint32_t*`へ変換する。

4096 byteはpage mappingの単位であり、hardware registerが4096 byteある意味ではない。DTSのregister regionは256 byteである。C++側は定義したindexだけをaccessする。

<a id="s_24_3"></a>
## 24.3 register indexとbyte offset

`regs`は`uint32_t*`なので、`regs[n]`のbyte offsetは`4n`である。`regs[3]`はoffset 0x0cのID、`regs[4]`は0x10のframe countである。

```text
virtual_base + 4 × index
   ↓ page table mapping
0x10080000 + 4 × index
   ↓ Wally address decode
APB peripheral register
```

pointer arithmeticをbyte単位と誤解すると四倍違うregisterへaccessする。RTLのPADDR sliceとC++ indexを表で照合する。

<a id="s_24_4"></a>
## 24.4 `volatile`が保証すること

`volatile` accessは、そのC++ abstract machine上でcompilerがread/writeを不要と判断して消したり、一つにまとめたりするのを制限する。status polling loopで毎回loadを生成させるために必要である。

しかし`volatile`は次を単独では保証しない。

- CPU hardwareによるmemory orderingすべて。
- cacheabilityまたはdevice属性。
- bus transferの完了後にdevice内部処理が完了したこと。
- 複数thread間のC++ data race防止。
- DMAとのcache coherence。

<a id="s_24_5"></a>
## 24.5 RISC-V fence

`fence iorw, iorw`は先行するI/Oとmemory accessが、後続accessよりordering上先になるよう制約する。固定版はMMIO command wordを書き終えた後に実行する。compiler barrierの`"memory"` clobberも、compilerが周辺memory operationを跨いで動かすのを抑える。

fence完了はRasterIXが全triangleをrasterizeし、framebufferをDDRへcommitし、displayがswapしたことを意味しない。それぞれ別のqueueと状態を持つ。必要な完了段階に対応するstatusまたはcounterを待つ。

<a id="s_24_6"></a>
## 24.6 pollingとtimeout

status pollingは、条件が成立するまでregisterを繰り返し読む。sleepを入れないbusy waitは反応が速いがCPUを占有する。低速single-coreでは他processのscheduleにも影響する。timeoutがなければhardware停止時に永久loopになる。

固定版は30秒deadlineを使い、responseとdisplay swapを待つ。timeout値は正常性能の保証値ではなく、異常を有限時間で報告する保護である。性能測定区間ではtimeout判定用clock readのcostも分けて考える。

<a id="s_24_7"></a>
## 24.7 `/dev/mem`を使う理由と限界

研究用prototypeでは、小さなC++ connectorでregisterを直接操作でき、kernel driver実装を省ける。ID、status、commandを早く検証するには有効である。

一方、root権限が必要で、process間の排他、buffer管理、interrupt、security、power management、DMA mappingをkernelが管理しない。公開する一般systemなら、platform driverとcharacter deviceまたはDRMなどのsubsystemを検討する。固定版の選択はprototypeの範囲に対するもので、最終的なproduction APIの最適解を意味しない。

<a id="s_24_8"></a>
## 24.8 専用driverへ移すなら

driverはDTのresourceを取得し、`ioremap`でregisterをmappingし、accessorでread/writeする。user APIは`ioctl`、`write`、`mmap`、poll、interrupt completionなどから選ぶ。shared bufferはDMA APIまたはreserved memoryの管理を使う。

driver化してもhardware protocolは同じである。利点は権限、lifetime、排他、error、cache属性を一箇所へ集められることだ。overheadと複雑さも増えるため、研究の目的と利用者を明確にする。
<!-- appendix-content:end -->

---

[前：第23章 device treeをhardwareとLinuxの契約として読む](chapter-23.md) ｜ [次：第25章 RasterIXのsoftware stackを深く追う](chapter-25.md)
