<!-- appendix-content:start -->
<a id="ch_23"></a>
# 第23章 device treeをhardwareとLinuxの契約として読む
<!-- appendix-content:end -->

[付録の総目次](../../技術付録.md) ｜ [論文本文](../../本文.md) ｜ [参考文献](../references.md)

[第III部 Linuxとシステムソフトウェア](README.md)

ファイルパスの表記は、[資料フォルダー](../../README.md)を基準とする。

## このページの目次

- [23.1 device treeは回路を作らない](#s_23_1)
- [23.2 rootのcell数](#s_23_2)
- [23.3 memory node](#s_23_3)
- [23.4 reserved-memoryと`no-map`](#s_23_4)
- [23.5 `compatible`とdriver binding](#s_23_5)
- [23.6 clockとtimebase](#s_23_6)
- [23.7 interrupt記述](#s_23_7)
- [23.8 DTSからDTBを作り、戻して比較する](#s_23_8)
- [23.9 DTの検証表](#s_23_9)

<!-- appendix-content:start -->
<a id="s_23_1"></a>
## 23.1 device treeは回路を作らない

Device Tree Sourceは、存在するhardwareをOSへ説明するdataである。node名、`compatible`、`reg`、clock、interrupt、memoryなどを記述し、`dtc`がbinary DTBへ変換する。DTBを書き換えてもFPGAのdecoderやpin接続は変わらない。[LinuxDT](../references.md#ref_linuxdt)

![図23.1 RTLの実回路とdevice treeとdriverの三者契約](../../figs/deep-device-tree-contract.png)

<a id="s_23_2"></a>
## 23.2 rootのcell数

`#address-cells = <2>`と`#size-cells = <2>`なら、childの`reg`はaddress二cellとsize二cellで一組を表す。一cellは32 bitである。

```dts
reg = <0 0x9e000000 0 0x02000000>;
```

これはaddress `0x000000009e000000`、size `0x0000000002000000`、すなわち32 MiBである。四つの独立値や開始・終了の組ではない。parent nodeごとにcell数が異なり得るため、対象nodeのparentを確認する。

<a id="s_23_3"></a>
## 23.3 memory node

Nexys Videoの`memory@80000000`は開始`0x80000000`、size`0x20000000`、すなわち512 MiBをLinuxへ伝える。kernelのphysical page allocatorはこの範囲を基礎にする。

MIGが実際に512 MiBへ接続されていないのにDTだけ512 MiBにすると、kernelは存在しないmemoryを使いfaultする。逆に実物より小さく書けば未使用領域ができる。hardware、Wally構成、DTを一致させる。

<a id="s_23_4"></a>
## 23.4 reserved-memoryと`no-map`

RasterIX用DTSは最後の32 MiB、`0x9e000000`から`0x9fffffff`をreserved-memoryにする。Linuxの通常allocatorがkernel pageやprocess pageへ使わないためである。`no-map`はOSに標準のvirtual mappingを作らないよう指示する。

この予約はIOMMUやhardware firewallではない。RasterIXが範囲外へ書くのを止めず、applicationのoffset計算も検査しない。shared buffer allocatorとRTL address幅を別に検証する。

<a id="s_23_5"></a>
## 23.5 `compatible`とdriver binding

`compatible`はdriverが対応deviceを選ぶ文字列である。一般に具体的な文字列から互換fallbackへ並べる。RasterIX nodeは`openhwgroup,wally-rasterix`を持つが、固定版applicationは専用kernel driverではなく`/dev/mem`を使うため、この文字列から自動でgame APIが生成されるわけではない。

将来platform driverを作る場合、`of_match_table`でcompatibleを照合し、`reg` resource、reserved memory、interruptを取得する。DT nodeだけを追加してdriverがない状態も合法であり、kernelが操作するとは限らない。

<a id="s_23_6"></a>
## 23.6 clockとtimebase

CPU nodeの`clock-frequency`はCPU clock、`timebase-frequency`はRISC-V timer counterの周波数を伝える。本構成ではともに20 MHzだが、概念上は別である。UART nodeにも入力clockがあり、baud divisor計算に使う。

値が一致していることを、Clocking Wizardの出力、CLINT/TIMECLK接続、UART RTL、DTSで確認する。softwareが表示するMHzだけでhardware clockを測定したことにはならない。

<a id="s_23_7"></a>
## 23.7 interrupt記述

`interrupt-parent`はどのinterrupt controllerへ接続するか、`interrupts`はcontroller固有のsource番号やflagsを表す。PLIC node自身はCPU interrupt controllerへの`interrupts-extended`を持つ。

RTLでsource IDを変えたらDTSも変える。DTSだけ変えてもwireは付け替わらない。driverがclaimしたID、PLIC設定、device pending、CPU trap causeを一続きで確認する。

<a id="s_23_8"></a>
## 23.8 DTSからDTBを作り、戻して比較する

```bash
dtc -I dts -O dtb -i "$WALLY/linux/devicetree" \
  -o wally-nexysvideo-rasterix.dtb \
  "$WALLY/linux/devicetree/wally-nexysvideo-rasterix.dts"
dtc -I dtb -O dts wally-nexysvideo-rasterix.dtb \
  -o decoded.dts
```

include後の最終内容はdecoded側で確認できる。実機Linuxでは`/sys/firmware/fdt`や`/proc/device-tree`からboot時DTを確認できる環境もある。hostで作ったDTBと実機が受け取ったDTBをhashまたは内容で照合する。

<a id="s_23_9"></a>
## 23.9 DTの検証表

| property | RTLまたは基板側の根拠 | softwareでの確認 |
|---|---|---|
| memory `reg` | MIG容量、decoder | boot logのmemory |
| CPU clock | MMCM出力 | timekeeping、DTS dump |
| UART clock/address | UART RTL、decoder | console、driver resource |
| RasterIX `reg` | EXT_IO BASE/RANGE | ID read |
| reserved-memory | framebuffer配置 | `/proc/iomem`、DT dump |
| interrupt | PLIC wiring/ID | `/proc/interrupts`、handler |
<!-- appendix-content:end -->

---

[前：第22章 Linuxのprocess、仮想memory、system call](chapter-22.md) ｜ [次：第24章 MMIO、`mmap`、`volatile`、fenceを深く理解する](chapter-24.md)
