## 第28章 SDカードからLinuxが起動するまで

電源投入直後には、Linuxもゲームもまだ実行されていない。起動用の小さなプログラムから始め、次に実行するプログラムをメモリへ用意して制御を渡す。この章では、その引継ぎごとに、既に使えるものと、まだ準備されていないものを確認する。

### 28.1 bitstreamを書いただけではLinuxは始まらない

bitstreamはFPGA内部の回路と一部メモリ初期値を設定する。Wallyがリセット vectorから実行を始めた後、SDカードにあるdevice tree、OpenSBI、Linux kernelをDDR3へ移し、段階的に権限と実行環境を整える必要がある。

![図28.1 reset vectorからBusyBox shellまでのboot chain](figs/deep-boot-chain.png)

### 28.2 ZSBLの役割

Zero Stage Boot Loaderは小さく、`fpga/zsbl`にある。`bios.S`はstackやレジスタを準備しC codeへ入り、`boot.c`はUARTとSDを初期化する。`gpt.c`はGUID Partition Tableを読み、最初の三partition entryをdevice tree、OpenSBI、Linux kernelとして扱う。

固定版ではdevice treeを`FDT_ADDRESS`、OpenSBIを`EXT_MEM_BASE`、kernelを`0x80200000`へcopyする。copy後、assemblyがOpenSBIへjumpする。ZSBLはファイル system名でファイルを探すのではなく、GPT partitionのLBA範囲をraw blockとして読む。

### 28.3 SD SPI初期化

SDカードはpower-on後に特定command sequenceでSPI modeへ入り、低いクロックから開始する。`sd.c`はcommand、response、CRC、token、multi-block readを実装する。chip select、dummy クロック、timeoutを守る必要がある。

SDに一度読めた経験があっても、最大クロックを上げれば信号 integrityまたはcard差で失敗し得る。boot logの「initializing」「partition」「loading」のどこまで出たかで、UART、SD initialization、GPT parse、DDR copyを分ける。

### 28.4 GPT partitionとload address

GPT headerはLBA1、partition entryは後続LBAにある。`gpt_load_partitions`はentryのfirst LBAとlast LBAからsector数を計算し、512 byte単位でDDRへcopyする。partition順を変えると別imageを別番地へloadするため、flash scriptとbootloaderの期待を揃える。

load先領域が重なると、後からcopyしたimageが前のimageを壊す。kernel size、device tree 番地、OpenSBI領域、stack、reserved RasterIX領域をメモリ map上で確認する。512 MiBの上端32 MiBをRasterIXに予約している構成では、通常のLinux配置がそこへ入らないことを確かめる。

### 28.5 OpenSBIの役割

OpenSBIはM-mode firmwareで、machine-level初期化、hart、timer、IPI、consoleなどのstandard SBI serviceをS-modeへ提供する。`fw_jump.bin`は指定番地の次段へjumpする形式で、device tree 番地をLinuxへ渡す。[OpenSBI]

OpenSBI bannerが出ればZSBLからのjump、DDR上のfirmware fetch、UART出力が進んだと分かる。Linux bannerが出ない場合は、kernel load 番地、DTB ポインタ、ISA extension、PMP、delegation、kernel entry付近を調べる。

### 28.6 Linux kernelの初期化

kernelはS-modeへ入り、初期page tableを作り、`satp`を書いてvirtual メモリを有効にする。物理番地とlink時のvirtual 番地が異なるため、切替直後のPCとmappingを理解する。trap vector、timer、メモリ allocator、driver、scheduler、VFSを初期化する。

kernelはDTBを読み、メモリ容量、CPU クロック、UART、PLIC、CLINT、SPI/SDなどを発見する。device treeが間違っていてもハードウェア回路は変わらないが、kernelが誤った番地またはクロックでdriverを動かす。

### 28.7 initramfsとBusyBox

Buildrootは`rootfs.cpio`を作り、kernelがinitramfsとして展開する。root filesystemにはdevice node、library、BusyBox、設定ファイル、shellが入る。最初のU-mode プロセスである`init`が`/etc/inittab`を読み、consoleやserviceを開始する。

BusyBoxは多くのcommandを一つのbinaryで提供する。`ls`、`mount`、`dmesg`などが同じbinaryへのlinkになっていても正常である。promptが出るまでには、kernelがU-modeへ遷移し、rootfsとconsoleが使える必要がある。

### 28.8 Buildrootの入力と出力

固定版`linux/Makefile`はBuildroot 2026.02.xを取得し、`linux/br2-external-tree/configs/wally_defconfig`を適用する。custom Linux config、BusyBox config、rootfs overlay、post-image scriptを使い、`Image`、`fw_jump.bin`、`fw_jump.elf`、`rootfs.cpio`、`vmlinux`、`busybox`を生成する。

| ファイル | 性質 | 主な用途 |
|---|---|---|
| `Image` | raw kernel image | bootloaderがDDRへcopy |
| `vmlinux` | symbol付きELF kernel | debug、objdump |
| `fw_jump.bin` | raw OpenSBI | boot |
| `fw_jump.elf` | ELF OpenSBI | symbol、debug |
| `rootfs.cpio` | archive | initramfs |
| `.dtb` | flattened device tree | ハードウェア description |

### 28.9 boot failureを段階で判断する

| 最後に見えた表示 | 到達した範囲 | 次に調べる入口 |
|---|---|---|
| 何もない | リセット、クロック、UART以前を含む | LED、bitstream、UART wiring |
| ZSBL banner | CPU、ROM、UART | SD初期化log |
| SD initialized | SPI/SD基本動作 | GPTとpartition image |
| OpenSBI banner | DDRとfirmware jump | DTB ポインタ、kernel entry |
| Linux banner | kernel entry | DT、メモリ、driver、rootfs |
| shell prompt | U-modeとrootfs | applicationとdevice mapping |

各段階はそれ以前すべてを完全証明するわけではないが、原因候補を大幅に減らす。
