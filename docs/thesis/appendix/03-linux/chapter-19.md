<!-- appendix-content:start -->
<a id="ch_19"></a>
# 第19章 開発用PCからFPGA上のprocessまでを分ける
<!-- appendix-content:end -->

[付録の総目次](../../技術付録.md) ｜ [論文本文](../../本文.md) ｜ [参考文献](../references.md)

[第III部 Linuxとシステムソフトウェア](README.md)

ファイルパスの表記は、[資料フォルダー](../../README.md)を基準とする。

## このページの目次

- [19.1 softwareは一つの場所で動いていない](#s_19_1)
- [19.2 五つの実行環境](#s_19_2)
- [19.3 source、build directory、生成物、配置先](#s_19_3)
- [19.4 buildと実行を証拠で結ぶ](#s_19_4)
- [19.5 hardwareとsoftwareの境界を契約として読む](#s_19_5)
- [19.6 「Linuxが動く」の中身](#s_19_6)

<!-- appendix-content:start -->
<a id="s_19_1"></a>
## 19.1 softwareは一つの場所で動いていない

本研究には、開発用PCのUbuntuで動くprogram、FPGAの起動ROMで動くZSBL、M-modeで動くOpenSBI、S-modeで動くLinux kernel、U-modeで動くBusyBoxとgameがある。すべてC/C++またはassemblyで書かれていても、実行するCPU、利用できるservice、address、compiler、file formatが違う。

hostはx86-64 Windows/WSL環境、targetはNexys Video上のRISC-V Wallyである。hostで生成したRISC-V executableはhostでは直接実行できない。逆にhost用`cmake`やVivadoをSDカードへコピーしてもWallyで動かない。

![図19.1 hostの開発toolとtarget上のfirmware kernel process](../../figs/deep-software-layers.png)

<a id="s_19_2"></a>
## 19.2 五つの実行環境

| 実行環境 | 代表例 | 使える機能 | 主な出力 |
|---|---|---|---|
| host user space | Git、CMake、compiler、dtc、Vivado | host OS、file system、network | bitstream、ELF、DTB |
| ZSBL | `fpga/zsbl` | UART、SPI/SD、DDRへの直接access | imageをDDRへcopy |
| OpenSBI M-mode | `fw_jump.bin` | machine CSR、PMP、SBI service | Linuxへ制御を渡す |
| Linux S-mode | `Image` | process、virtual memory、driver、system call | U-mode環境 |
| target U-mode | BusyBox、`rasterix-breakout` | libc、file、`/dev/mem` mapping | game処理とMMIO |

同じ「load」でも、ZSBLではpagingなしで物理addressを読むことが多く、U-mode processでは仮想addressをpage tableで変換する。同じUART出力でも、ZSBLのregister access、OpenSBI console、Linux driver、user processの`printf`では経路が違う。

<a id="s_19_3"></a>
## 19.3 source、build directory、生成物、配置先

source treeへ生成物を混ぜると、どのfileが人間の入力か分からなくなる。CMakeは`-S`でsource、`-B`でbuild directoryを分ける。Buildrootは`output/build`へ展開source、`output/host`へhost toolchain、`output/images`へtarget imageを置く。[Buildroot](../references.md#ref_buildroot)

生成物はさらに、hostに存在する場所と、SDカードまたはtarget root filesystem上の場所を区別する。hostの`rasterix-build/rasterix-breakout`を更新しても、SDカード側のcopyを更新しなければ実機は古いbinaryを実行する。

<a id="s_19_4"></a>
## 19.4 buildと実行を証拠で結ぶ

次の値を保存すると取り違えを減らせる。

```bash
git rev-parse HEAD
git submodule status
sha256sum fpga/generator/*.bit
sha256sum rasterix-build/rasterix-breakout
file rasterix-build/rasterix-breakout
```

targetでも可能なら`sha256sum`を実行し、hostのbinaryと比較する。実行logにはcommit、build type、compiler version、DTB名、bitstream hash、command lineを残す。「sourceを変更した」と「その変更を含むbinaryを実機で実行した」を分ける。

<a id="s_19_5"></a>
## 19.5 hardwareとsoftwareの境界を契約として読む

softwareからhardwareへ渡る主な契約は、ISA、ABI、memory map、device tree、register map、interrupt、DMA/shared memory layoutである。hardwareが同じでもABIが違えばprogramは動かず、softwareが同じでもregister offsetが違えば別機能へ書く。

契約ごとにownerを決める。

| 契約 | hardware側 | software側 |
|---|---|---|
| ISA | decodeとexecution | compilerの`-march` |
| ABI | register、stack、exception support | compilerの`-mabi`、libc |
| memory map | decoder、PMA/PMP | linker、DT、mapping |
| register map | peripheral RTL | header/API |
| shared buffer | memory master、address幅 | allocator、reserved-memory、offset |
| completion | status/counter/interrupt | poll、timeout、handler |

<a id="s_19_6"></a>
## 19.6 「Linuxが動く」の中身

Linux promptが表示された場合、CPUが多くの命令を実行し、DDR、UART、timer、interrupt、privilege、virtual memory、kernelとroot filesystemの少なくとも一部が動いたことを示す。しかしRasterIX register、shared DDR、display経路までは証明しない。

逆にgameが失敗してもLinux全体が壊れたとは限らない。ID read、command send、frame counter、framebuffer、videoの順に境界を確認する。softwareの層を分ける目的は用語を増やすことではなく、失敗範囲を小さくすることである。
<!-- appendix-content:end -->

---

[前：第18章 EBU、uncore、周辺回路拡張を深く読む](../02-wally/chapter-18.md) ｜ [次：第20章 cross compile、ELF、ABIを深く理解する](chapter-20.md)
