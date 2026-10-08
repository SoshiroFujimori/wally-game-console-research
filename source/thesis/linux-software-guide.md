## 第19章 開発用PCからFPGA上のprocessまでを分ける

### 19.1 softwareは一つの場所で動いていない

本研究には、開発用PCのUbuntuで動くprogram、FPGAの起動ROMで動くZSBL、M-modeで動くOpenSBI、S-modeで動くLinux kernel、U-modeで動くBusyBoxとgameがある。すべてC/C++またはassemblyで書かれていても、実行するCPU、利用できるservice、address、compiler、file formatが違う。

hostはx86-64 Windows/WSL環境、targetはNexys Video上のRISC-V Wallyである。hostで生成したRISC-V executableはhostでは直接実行できない。逆にhost用`cmake`やVivadoをSDカードへコピーしてもWallyで動かない。

![図19.1 hostの開発toolとtarget上のfirmware kernel process](figs/deep-software-layers.png)

### 19.2 五つの実行環境

| 実行環境 | 代表例 | 使える機能 | 主な出力 |
|---|---|---|---|
| host user space | Git、CMake、compiler、dtc、Vivado | host OS、file system、network | bitstream、ELF、DTB |
| ZSBL | `fpga/zsbl` | UART、SPI/SD、DDRへの直接access | imageをDDRへcopy |
| OpenSBI M-mode | `fw_jump.bin` | machine CSR、PMP、SBI service | Linuxへ制御を渡す |
| Linux S-mode | `Image` | process、virtual memory、driver、system call | U-mode環境 |
| target U-mode | BusyBox、`rasterix-breakout` | libc、file、`/dev/mem` mapping | game処理とMMIO |

同じ「load」でも、ZSBLではpagingなしで物理addressを読むことが多く、U-mode processでは仮想addressをpage tableで変換する。同じUART出力でも、ZSBLのregister access、OpenSBI console、Linux driver、user processの`printf`では経路が違う。

### 19.3 source、build directory、生成物、配置先

source treeへ生成物を混ぜると、どのfileが人間の入力か分からなくなる。CMakeは`-S`でsource、`-B`でbuild directoryを分ける。Buildrootは`output/build`へ展開source、`output/host`へhost toolchain、`output/images`へtarget imageを置く。[Buildroot]

生成物はさらに、hostに存在する場所と、SDカードまたはtarget root filesystem上の場所を区別する。hostの`rasterix-build/rasterix-breakout`を更新しても、SDカード側のcopyを更新しなければ実機は古いbinaryを実行する。

### 19.4 buildと実行を証拠で結ぶ

次の値を保存すると取り違えを減らせる。

```bash
git rev-parse HEAD
git submodule status
sha256sum fpga/generator/*.bit
sha256sum rasterix-build/rasterix-breakout
file rasterix-build/rasterix-breakout
```

targetでも可能なら`sha256sum`を実行し、hostのbinaryと比較する。実行logにはcommit、build type、compiler version、DTB名、bitstream hash、command lineを残す。「sourceを変更した」と「その変更を含むbinaryを実機で実行した」を分ける。

### 19.5 hardwareとsoftwareの境界を契約として読む

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

### 19.6 「Linuxが動く」の中身

Linux promptが表示された場合、CPUが多くの命令を実行し、DDR、UART、timer、interrupt、privilege、virtual memory、kernelとroot filesystemの少なくとも一部が動いたことを示す。しかしRasterIX register、shared DDR、display経路までは証明しない。

逆にgameが失敗してもLinux全体が壊れたとは限らない。ID read、command send、frame counter、framebuffer、videoの順に境界を確認する。softwareの層を分ける目的は用語を増やすことではなく、失敗範囲を小さくすることである。

## 第20章 cross compile、ELF、ABIを深く理解する

### 20.1 compilerはsourceを別CPUの命令へ変える

cross compilerはhost上で動き、target ISAのmachine codeを生成する。`riscv64-buildroot-linux-gnu-g++`はRISC-V 64 bit Linux向けC++ compilerである。`riscv64-unknown-elf-gcc`は主にbare-metal用で、Linux user program用libcやdynamic loaderを前提としない。名前が似ていても出力環境が違う。[Buildroot]

![図20.1 C++ sourceからRISC-V ELFと実機processになるまで](figs/deep-cross-compile-elf.png)

### 20.2 前処理、compile、assembly、link

C/C++ buildは概念上、前処理、compile、assembly、linkへ分かれる。headerとmacroを展開し、言語を中間表現とassemblyへ変換し、object fileを作り、最後にlibraryと結合してELF executableを作る。

```bash
riscv64-buildroot-linux-gnu-g++ -E breakout.cpp -o breakout.ii
riscv64-buildroot-linux-gnu-g++ -S -O2 breakout.cpp -o breakout.s
riscv64-buildroot-linux-gnu-g++ -c -O2 breakout.cpp -o breakout.o
```

実際のprojectではCMakeがinclude path、define、library順、link optionを組み立てる。問題調査では`cmake --build ... --verbose`で最終commandを確認する。

### 20.3 ELFに入るもの

ELFはmachine codeだけでなく、entry point、program header、section、symbol、relocation、ABI情報を持つ。`.text`は実行code、`.rodata`はread-only data、`.data`は初期値付きwritable data、`.bss`はzero初期化領域である。program headerはloaderがmemoryへどうmappingするかを示す。

```bash
file rasterix-build/rasterix-breakout
riscv64-buildroot-linux-gnu-readelf -h -l -S rasterix-build/rasterix-breakout
riscv64-buildroot-linux-gnu-objdump -drC rasterix-build/rasterix-breakout | less
```

`file`でRISC-V 64 bitか、staticまたはdynamicかを確認する。`readelf -l`でinterpreterが必要か、segmentのR/W/X、entryを確認する。`objdump -d`はC++ symbolを`-C`でdemangleすると関数名を追いやすい。

### 20.4 ISA optionとABI

`-march`は使ってよい命令extension、`-mabi`は関数call、register、data型、浮動小数点argumentなどの約束を決める。例えばRV64GCとLP64Dの組合せでは64 bit integer registerとdouble-precision FP calling conventionを使う。

CPUが対応しないextensionをcompilerが使うとillegal instructionになる。CPUがF/Dを持っていても、libraryとapplicationのABIが一致しなければlinkまたは実行時に問題が起こる。kernel、OpenSBI、rootfs、applicationを別toolchainで作る場合は、ISA/ABIの共通部分を確認する。[RISCVABI]

### 20.5 static linkとdynamic link

固定版の`examples/rasterix/CMakeLists.txt`は既定で`-static`を付ける。static executableは必要なlibrary codeを一つのfileへ含めるため、target rootfsに同じC++ runtimeやshared libraryがなくても動かしやすい。その代わりfileが大きくなり、library更新は再linkが必要である。

dynamic executableは小さく、複数programでlibrary pageを共有できるが、targetにdynamic loaderと互換shared libraryが必要である。`readelf -d`、`readelf -l`、targetの`ldd`で依存を確認する。staticならhardwareに近いという意味ではなく、deployment方法の選択である。

### 20.6 C++ object lifetimeとresource

`WallyBusConnector`はconstructorで`/dev/mem`を開いて`mmap`し、IDを確認する。destructorは`munmap`する。copyを削除しているため、同じmappingを二objectが所有して二重解放するのを防ぐ。

`breakout.cpp`はRasterIX contextをdeviceやtransportより先に破棄する必要があるため、local `Context` structのdestructorで`RIXGL::destroy()`と`device.deinit()`を呼ぶ。C++ではlocal objectは逆順に破棄される。正常終了だけでなくexception経路でもresourceを解放するRAIIの例である。

### 20.7 optimization optionを正しく比較する

`Release` buildは通常最適化を有効にし、debug symbolやassertionの扱いが変わる場合がある。`-O0`と`-O2`では命令数、inlining、memory access、timingが変わる。source上の一行とassemblyの一対一対応も崩れる。

性能比較ではcompiler version、flags、link方式を固定する。原因調査では`-g`を付けても最適化は可能だが、変数が消えることがある。正しさを比較するとき、未定義動作が最適化で表面化する可能性も考える。

### 20.8 Buildroot toolchainとapplication toolchain

WallyのBuildroot configはkernel、OpenSBI、BusyBox、rootfs、host toolchainを同じ構成から生成する。applicationをその`output/host/bin`のcompilerで作ると、target rootfsとのABI整合を取りやすい。

ただし固定版の`wally_defconfig`ではC++ toolchain生成が無効になっている版もある。C++ exampleをbuildするには、C++を有効にした互換Buildroot toolchainを使うか、同じISA/ABIとlibcを持つtoolchainを用意する。compiler commandが存在することだけで互換性を断定せず、`file`、`readelf`、実機実行で確認する。

### 20.9 reproducible buildの最低条件

source commit、submodule commit、compilerとBuildroot版、CMake cache、build type、command、生成物hashを残す。build directoryを使い回した場合は古いcacheが影響し得るため、再現確認では空のbuild directoryから作る。

```bash
cmake -S "$WALLY/examples/rasterix" -B rasterix-build-clean \
  -DCMAKE_SYSTEM_NAME=Linux -DCMAKE_SYSTEM_PROCESSOR=riscv64 \
  -DCMAKE_C_COMPILER=riscv64-buildroot-linux-gnu-gcc \
  -DCMAKE_CXX_COMPILER=riscv64-buildroot-linux-gnu-g++ \
  -DCMAKE_BUILD_TYPE=Release
cmake --build rasterix-build-clean --parallel --verbose
```

binary hashが毎回一致しない場合でも直ちに機能不一致ではない。timestamp、build ID、path埋込みなどを調べる。再現性の主張はbit-identicalか、機能同一かを明示する。

## 第21章 SDカードからLinuxが起動するまで

### 21.1 bitstreamを書いただけではLinuxは始まらない

bitstreamはFPGA内部の回路と一部memory初期値を設定する。Wallyがreset vectorから実行を始めた後、SDカードにあるdevice tree、OpenSBI、Linux kernelをDDR3へ移し、段階的に権限と実行環境を整える必要がある。

![図21.1 reset vectorからBusyBox shellまでのboot chain](figs/deep-boot-chain.png)

### 21.2 ZSBLの役割

Zero Stage Boot Loaderは小さく、`fpga/zsbl`にある。`bios.S`はstackやregisterを準備しC codeへ入り、`boot.c`はUARTとSDを初期化する。`gpt.c`はGUID Partition Tableを読み、最初の三partition entryをdevice tree、OpenSBI、Linux kernelとして扱う。

固定版ではdevice treeを`FDT_ADDRESS`、OpenSBIを`EXT_MEM_BASE`、kernelを`0x80200000`へcopyする。copy後、assemblyがOpenSBIへjumpする。ZSBLはfile system名でfileを探すのではなく、GPT partitionのLBA範囲をraw blockとして読む。

### 21.3 SD SPI初期化

SDカードはpower-on後に特定command sequenceでSPI modeへ入り、低いclockから開始する。`sd.c`はcommand、response、CRC、token、multi-block readを実装する。chip select、dummy clock、timeoutを守る必要がある。

SDに一度読めた経験があっても、最大clockを上げればsignal integrityまたはcard差で失敗し得る。boot logの「initializing」「partition」「loading」のどこまで出たかで、UART、SD initialization、GPT parse、DDR copyを分ける。

### 21.4 GPT partitionとload address

GPT headerはLBA1、partition entryは後続LBAにある。`gpt_load_partitions`はentryのfirst LBAとlast LBAからsector数を計算し、512 byte単位でDDRへcopyする。partition順を変えると別imageを別addressへloadするため、flash scriptとbootloaderの期待を揃える。

load先領域が重なると、後からcopyしたimageが前のimageを壊す。kernel size、device tree address、OpenSBI領域、stack、reserved RasterIX領域をmemory map上で確認する。512 MiBの上端32 MiBをRasterIXに予約している構成では、通常のLinux配置がそこへ入らないことを確かめる。

### 21.5 OpenSBIの役割

OpenSBIはM-mode firmwareで、machine-level初期化、hart、timer、IPI、consoleなどのstandard SBI serviceをS-modeへ提供する。`fw_jump.bin`は指定addressの次段へjumpする形式で、device tree addressをLinuxへ渡す。[OpenSBI]

OpenSBI bannerが出ればZSBLからのjump、DDR上のfirmware fetch、UART出力が進んだと分かる。Linux bannerが出ない場合は、kernel load address、DTB pointer、ISA extension、PMP、delegation、kernel entry付近を調べる。

### 21.6 Linux kernelの初期化

kernelはS-modeへ入り、初期page tableを作り、`satp`を書いてvirtual memoryを有効にする。物理addressとlink時のvirtual addressが異なるため、切替直後のPCとmappingを理解する。trap vector、timer、memory allocator、driver、scheduler、VFSを初期化する。

kernelはDTBを読み、memory容量、CPU clock、UART、PLIC、CLINT、SPI/SDなどを発見する。device treeが間違っていてもhardware回路は変わらないが、kernelが誤ったaddressまたはclockでdriverを動かす。

### 21.7 initramfsとBusyBox

Buildrootは`rootfs.cpio`を作り、kernelがinitramfsとして展開する。root filesystemにはdevice node、library、BusyBox、設定file、shellが入る。最初のU-mode processである`init`が`/etc/inittab`を読み、consoleやserviceを開始する。

BusyBoxは多くのcommandを一つのbinaryで提供する。`ls`、`mount`、`dmesg`などが同じbinaryへのlinkになっていても正常である。promptが出るまでには、kernelがU-modeへ遷移し、rootfsとconsoleが使える必要がある。

### 21.8 Buildrootの入力と出力

固定版`linux/Makefile`はBuildroot 2026.02.xを取得し、`linux/br2-external-tree/configs/wally_defconfig`を適用する。custom Linux config、BusyBox config、rootfs overlay、post-image scriptを使い、`Image`、`fw_jump.bin`、`fw_jump.elf`、`rootfs.cpio`、`vmlinux`、`busybox`を生成する。

| file | 性質 | 主な用途 |
|---|---|---|
| `Image` | raw kernel image | bootloaderがDDRへcopy |
| `vmlinux` | symbol付きELF kernel | debug、objdump |
| `fw_jump.bin` | raw OpenSBI | boot |
| `fw_jump.elf` | ELF OpenSBI | symbol、debug |
| `rootfs.cpio` | archive | initramfs |
| `.dtb` | flattened device tree | hardware description |

### 21.9 boot failureを段階で判断する

| 最後に見えた表示 | 到達した範囲 | 次に調べる入口 |
|---|---|---|
| 何もない | reset、clock、UART以前を含む | LED、bitstream、UART wiring |
| ZSBL banner | CPU、ROM、UART | SD初期化log |
| SD initialized | SPI/SD基本動作 | GPTとpartition image |
| OpenSBI banner | DDRとfirmware jump | DTB pointer、kernel entry |
| Linux banner | kernel entry | DT、memory、driver、rootfs |
| shell prompt | U-modeとrootfs | applicationとdevice mapping |

各段階はそれ以前すべてを完全証明するわけではないが、原因候補を大幅に減らす。

## 第22章 Linuxのprocess、仮想memory、system call

### 22.1 processが見るaddressと物理address

U-mode processのpointerは仮想addressである。MMUはpage tableとTLBを使い、物理pageへ変換する。同じ仮想addressを別processが使っても、別物理pageへ対応できる。kernelはprocessごとにaddress space、register、file descriptorなどを管理する。

![図22.1 user pointerからpage tableとMMIO物理pageへの対応](figs/deep-virtual-mmio.png)

### 22.2 virtual memoryの目的

virtual memoryは、process間の隔離、連続したaddress空間、共有、copy-on-write、file mapping、permissionを提供する。page単位でread/write/execute/userなどを設定する。CPUのTLBは最近の変換をcacheし、miss時にpage tableをたどる。

address変換があるからprogramはhardwareから完全に独立するわけではない。device MMIOをmappingすれば、そのvirtual pageへのload/storeが物理deviceへ届く。mappingのcache属性とpermissionを正しく選ぶ必要がある。

### 22.3 kernel modeへ入る三つの経路

U-modeからS-modeへは主にsystem call、exception、interruptで入る。system callはECALL、exceptionはpage faultやillegal instruction、interruptはtimerやexternal deviceである。kernelはtrap frameへregisterを保存し、原因を判定する。

system callはfunction callと違いprivilege boundaryを越える。argument検査、pointerのuser access、schedulerによるcontext switchが起こり得る。`open`や`mmap`はsystem callだが、mapping後の各MMIO storeは通常kernel functionを毎回呼ばない。

### 22.4 file descriptorとdevice

Linuxではregular file、terminal、deviceなどをfile descriptorで表す。`open("/dev/mem", O_RDWR | O_SYNC)`はphysical memory accessを提供するcharacter deviceを開く。成功には通常root権限とkernel設定が必要である。

file descriptor自体はaddressではない。`mmap`が指定physical offsetのpageをprocess virtual addressへ対応付け、その戻りpointerを使ってload/storeする。`close(fd)`後もmappingは`munmap`するまで残るため、固定版constructorはmmap後にfdを閉じられる。

### 22.5 page faultは常にbugではない

processがまだmappingされていない合法virtual pageへ初めてaccessすると、demand pagingのためpage faultが起き、kernelがpageを用意して再実行することがある。permission違反や存在しないaddressならSIGSEGVになる。

MMIO mappingでSIGBUSまたはmachine checkになる場合は、physical region、access width、hardware responseを調べる。virtual pointer値だけを見てdevice physical addressだと思わない。`/proc/<pid>/maps`とpage offsetを確認する。

### 22.6 schedulingとgameの時間

Linuxは複数processをtime sliceで実行する。20 MHzのsingle-core Wallyでは、kernel workやinterruptがgameを中断する。`steady_clock`で測るwall timeには、そのprocessが実行されていない時間も含まれる。

CPU time、wall time、frame completion intervalを区別する。game simulationは固定60 Hz tickをaccumulateし、render回数が減ってもsimulation stepを飛ばさない設計になっている。これは描画throughputとgame speedを分離する。

### 22.7 signalと終了処理

Ctrl-Cはterminal driverからSIGINTをprocessへ送る。固定版handlerは`sig_atomic_t` flagだけを更新し、main loopが安全な場所で終了する。signal handler内で複雑なC++処理や非async-signal-safe functionを呼ばない。

正常終了とsignal終了の両方でRasterIX context、device、mappingを正しい順序で破棄する。強制電源断ではdestructorが走らないため、hardware側も次回起動時に初期化できる設計が必要である。

## 第23章 device treeをhardwareとLinuxの契約として読む

### 23.1 device treeは回路を作らない

Device Tree Sourceは、存在するhardwareをOSへ説明するdataである。node名、`compatible`、`reg`、clock、interrupt、memoryなどを記述し、`dtc`がbinary DTBへ変換する。DTBを書き換えてもFPGAのdecoderやpin接続は変わらない。[LinuxDT]

![図23.1 RTLの実回路とdevice treeとdriverの三者契約](figs/deep-device-tree-contract.png)

### 23.2 rootのcell数

`#address-cells = <2>`と`#size-cells = <2>`なら、childの`reg`はaddress二cellとsize二cellで一組を表す。一cellは32 bitである。

```dts
reg = <0 0x9e000000 0 0x02000000>;
```

これはaddress `0x000000009e000000`、size `0x0000000002000000`、すなわち32 MiBである。四つの独立値や開始・終了の組ではない。parent nodeごとにcell数が異なり得るため、対象nodeのparentを確認する。

### 23.3 memory node

Nexys Videoの`memory@80000000`は開始`0x80000000`、size`0x20000000`、すなわち512 MiBをLinuxへ伝える。kernelのphysical page allocatorはこの範囲を基礎にする。

MIGが実際に512 MiBへ接続されていないのにDTだけ512 MiBにすると、kernelは存在しないmemoryを使いfaultする。逆に実物より小さく書けば未使用領域ができる。hardware、Wally構成、DTを一致させる。

### 23.4 reserved-memoryと`no-map`

RasterIX用DTSは最後の32 MiB、`0x9e000000`から`0x9fffffff`をreserved-memoryにする。Linuxの通常allocatorがkernel pageやprocess pageへ使わないためである。`no-map`はOSに標準のvirtual mappingを作らないよう指示する。

この予約はIOMMUやhardware firewallではない。RasterIXが範囲外へ書くのを止めず、applicationのoffset計算も検査しない。shared buffer allocatorとRTL address幅を別に検証する。

### 23.5 `compatible`とdriver binding

`compatible`はdriverが対応deviceを選ぶ文字列である。一般に具体的な文字列から互換fallbackへ並べる。RasterIX nodeは`openhwgroup,wally-rasterix`を持つが、固定版applicationは専用kernel driverではなく`/dev/mem`を使うため、この文字列から自動でgame APIが生成されるわけではない。

将来platform driverを作る場合、`of_match_table`でcompatibleを照合し、`reg` resource、reserved memory、interruptを取得する。DT nodeだけを追加してdriverがない状態も合法であり、kernelが操作するとは限らない。

### 23.6 clockとtimebase

CPU nodeの`clock-frequency`はCPU clock、`timebase-frequency`はRISC-V timer counterの周波数を伝える。本構成ではともに20 MHzだが、概念上は別である。UART nodeにも入力clockがあり、baud divisor計算に使う。

値が一致していることを、Clocking Wizardの出力、CLINT/TIMECLK接続、UART RTL、DTSで確認する。softwareが表示するMHzだけでhardware clockを測定したことにはならない。

### 23.7 interrupt記述

`interrupt-parent`はどのinterrupt controllerへ接続するか、`interrupts`はcontroller固有のsource番号やflagsを表す。PLIC node自身はCPU interrupt controllerへの`interrupts-extended`を持つ。

RTLでsource IDを変えたらDTSも変える。DTSだけ変えてもwireは付け替わらない。driverがclaimしたID、PLIC設定、device pending、CPU trap causeを一続きで確認する。

### 23.8 DTSからDTBを作り、戻して比較する

```bash
dtc -I dts -O dtb -i "$WALLY/linux/devicetree" \
  -o wally-nexysvideo-rasterix.dtb \
  "$WALLY/linux/devicetree/wally-nexysvideo-rasterix.dts"
dtc -I dtb -O dts wally-nexysvideo-rasterix.dtb \
  -o decoded.dts
```

include後の最終内容はdecoded側で確認できる。実機Linuxでは`/sys/firmware/fdt`や`/proc/device-tree`からboot時DTを確認できる環境もある。hostで作ったDTBと実機が受け取ったDTBをhashまたは内容で照合する。

### 23.9 DTの検証表

| property | RTLまたは基板側の根拠 | softwareでの確認 |
|---|---|---|
| memory `reg` | MIG容量、decoder | boot logのmemory |
| CPU clock | MMCM出力 | timekeeping、DTS dump |
| UART clock/address | UART RTL、decoder | console、driver resource |
| RasterIX `reg` | EXT_IO BASE/RANGE | ID read |
| reserved-memory | framebuffer配置 | `/proc/iomem`、DT dump |
| interrupt | PLIC wiring/ID | `/proc/interrupts`、handler |

## 第24章 MMIO、`mmap`、`volatile`、fenceを深く理解する

### 24.1 MMIOとは何か

Memory-mapped I/Oは、load/storeのphysical address範囲をRAMではなくdevice registerへ割り当てる方式である。CPU命令の形はmemory accessだが、readでstatusを得たり、writeでFIFOへcommandを投入したりする。

普通のmemoryと違い、read/writeにside effectがあり、同じaccessの繰返しが同じ結果になるとは限らない。cache、speculation、reordering、access幅をdevice契約へ合わせる。

### 24.2 固定版のmapping

`WallyBusConnector`は`/dev/mem`を`O_RDWR | O_SYNC`で開き、physical `0x10080000`から4096 byteを`PROT_READ | PROT_WRITE`、`MAP_SHARED`でmappingする。戻り値を`volatile uint32_t*`へ変換する。

4096 byteはpage mappingの単位であり、hardware registerが4096 byteある意味ではない。DTSのregister regionは256 byteである。C++側は定義したindexだけをaccessする。

### 24.3 register indexとbyte offset

`regs`は`uint32_t*`なので、`regs[n]`のbyte offsetは`4n`である。`regs[3]`はoffset 0x0cのID、`regs[4]`は0x10のframe countである。

```text
virtual_base + 4 × index
   ↓ page table mapping
0x10080000 + 4 × index
   ↓ Wally address decode
APB peripheral register
```

pointer arithmeticをbyte単位と誤解すると四倍違うregisterへaccessする。RTLのPADDR sliceとC++ indexを表で照合する。

### 24.4 `volatile`が保証すること

`volatile` accessは、そのC++ abstract machine上でcompilerがread/writeを不要と判断して消したり、一つにまとめたりするのを制限する。status polling loopで毎回loadを生成させるために必要である。

しかし`volatile`は次を単独では保証しない。

- CPU hardwareによるmemory orderingすべて。
- cacheabilityまたはdevice属性。
- bus transferの完了後にdevice内部処理が完了したこと。
- 複数thread間のC++ data race防止。
- DMAとのcache coherence。

### 24.5 RISC-V fence

`fence iorw, iorw`は先行するI/Oとmemory accessが、後続accessよりordering上先になるよう制約する。固定版はMMIO command wordを書き終えた後に実行する。compiler barrierの`"memory"` clobberも、compilerが周辺memory operationを跨いで動かすのを抑える。

fence完了はRasterIXが全triangleをrasterizeし、framebufferをDDRへcommitし、displayがswapしたことを意味しない。それぞれ別のqueueと状態を持つ。必要な完了段階に対応するstatusまたはcounterを待つ。

### 24.6 pollingとtimeout

status pollingは、条件が成立するまでregisterを繰り返し読む。sleepを入れないbusy waitは反応が速いがCPUを占有する。低速single-coreでは他processのscheduleにも影響する。timeoutがなければhardware停止時に永久loopになる。

固定版は30秒deadlineを使い、responseとdisplay swapを待つ。timeout値は正常性能の保証値ではなく、異常を有限時間で報告する保護である。性能測定区間ではtimeout判定用clock readのcostも分けて考える。

### 24.7 `/dev/mem`を使う理由と限界

研究用prototypeでは、小さなC++ connectorでregisterを直接操作でき、kernel driver実装を省ける。ID、status、commandを早く検証するには有効である。

一方、root権限が必要で、process間の排他、buffer管理、interrupt、security、power management、DMA mappingをkernelが管理しない。公開する一般systemなら、platform driverとcharacter deviceまたはDRMなどのsubsystemを検討する。固定版の選択はprototypeの範囲に対するもので、最終的なproduction APIの最適解を意味しない。

### 24.8 専用driverへ移すなら

driverはDTのresourceを取得し、`ioremap`でregisterをmappingし、accessorでread/writeする。user APIは`ioctl`、`write`、`mmap`、poll、interrupt completionなどから選ぶ。shared bufferはDMA APIまたはreserved memoryの管理を使う。

driver化してもhardware protocolは同じである。利点は権限、lifetime、排他、error、cache属性を一箇所へ集められることだ。overheadと複雑さも増えるため、研究の目的と利用者を明確にする。

## 第25章 RasterIXのsoftware stackを深く追う

### 25.1 一つのOpenGL風呼出しは直接register一語ではない

gameは`glBegin`、`glVertex`、`glColor`などのAPIを使う。RasterIXのsoftware側はcurrent state、頂点配列、matrix、primitive assembly、clipping、triangle descriptor、display listを処理し、最終的に32 bit word列を`IBusConnector`へ渡す。

![図25.1 game APIからWallyBusConnectorとRasterIX RTLまでのsoftware stack](figs/deep-rasterix-software-stack.png)

### 25.2 API stateとdraw call

OpenGLのimmediate modeでは、`glColor`は以後の頂点に関連付くcurrent colorを変える。`glBegin`はprimitive種別を開始し、`glVertex`は頂点を蓄え、`glEnd`でまとまりを処理する。関数名一つがその場でpixelを塗るとは限らない。

matrix、viewport、texture enable、depth test、blendなどもstateである。draw時に現在stateと頂点を組み合わせ、hardware commandへ変換する。state changeの順序が描画結果を変える。

### 25.3 `ThreadedVertexTransformer`と本構成

upstream softwareはworkerとtransfer runnerを抽象化し、並列実行可能な構造を持つ。本構成はsingle-core Wallyで`NoThreadRunner`を使い、処理と転送を順次実行する。class名にThreadedとあっても、実際に別threadが走るかは渡したrunnerで決まる。

この選択は正しさと初期統合を単純にする。将来thread化しても20 MHz single-coreでは同時実行のhardware coreが増えるわけではなく、context switchと同期costがある。測定して判断する。

### 25.4 command用buffer

`WallyBusConnector`は複数の`std::vector<uint32_t>`を持ち、upstreamからwrite bufferを要求されたときspanを返す。softwareはまずhost-side bufferへword列を作り、`writeData`でMMIOへ順番に送る。

これは「GPUがC++ vectorを直接読む」方式ではない。vectorはWallyのprocess memoryにあり、connectorが各wordをAPB registerへstoreする。最後のwordだけoffset 0x04へ書きTLASTを示す。buffer index、size、offsetは範囲と4 byte alignmentを検査する。

### 25.5 二層のpacket

RasterIXには、device data uploadなどを扱う外側のtransfer framingと、rasterizerが解釈する内側のrender commandがある。word列を観察するときは、どのlayerのlength、type、TLASTかを区別する。

一語欠けると後続wordの境界までずれる可能性がある。色だけがおかしい場合、triangle descriptorのfieldかもしれないが、全commandが停止するならpacket length、TLAST、ready/validを先に疑う。

### 25.6 software処理とhardware処理の分担

固定版RasterIXでは、頂点変換や一部triangle setupをsoftware側が行い、RTL側はdescriptorからpixel/fragmentを生成し、texture、test、blend、framebuffer処理を行う。したがって「RasterIXはすべてのOpenGL処理をhardwareで行う」ではない。

性能を調べるとき、CPU側command preparation、MMIO transfer、GPU execution、DDR commit、display waitを分ける。本研究で測定した準備時間は、software側のdraw call数やcommand作成方法で変わる。

### 25.7 `RIXGL` instanceと初期化

`RIXGL::createInstance`はdeviceとsoftware stackを結び、OpenGL風APIのcontextを用意する。resolution変更前後には内部display listがflushされるため、固定版gameはclearを先に実行し、その後resolutionを設定する。これは起動時に古い内部pixelが残る問題と関係する。

初期化順は偶然ではない。transport、uploader、runner、device、contextの依存方向を図にし、破棄は逆順にする。constructorが途中でexceptionを投げた場合も既に獲得したresourceが解放されるか確認する。

### 25.8 errorの伝わり方

MMIO mapping失敗、ID不一致、response timeout、display timeoutはC++ exceptionとしてmainへ伝わり、stderrへ表示して非zero終了する。OpenGL state errorは`glGetError`で確認する。

hardwareが返すerror bit、transport timeout、API misuseを同じ文字列にまとめない。error code、stage、address、last command countを記録できると診断しやすい。prototypeでもsilent failureを避ける。

### 25.9 sourceを追う具体的な入口

1. `examples/rasterix/breakout.cpp`の`present` lambda。
2. `BreakoutRenderer.hpp`のdraw sequence。
3. upstream `RIXGL`とvertex pipeline。
4. `DeviceDataUploader`とdisplay list。
5. `WallyBusConnector::writeData`。
6. APB adapterのregister map。
7. async FIFOと`RasterIX_IF`。
8. CommandParser、Rasterizer、PerFragmentPipeline。

各段階でinput型、output型、所有するstate、完了条件を書く。関数名だけを矢印で結ばず、一つの四角形について実際の頂点値とword数を追う。

## 第26章 game loop、入力、時間、描画を深く理解する

### 26.1 一frameの仕事

game loopは概ね、時間取得、入力、simulation update、scene作成、描画command生成、送信、表示完了確認を繰り返す。これらを一つの「描画時間」にまとめると、どこを改善したか説明できない。

![図26.1 simulation tickとrender frameを分離したgame loop](figs/deep-game-loop.png)

### 26.2 固定timestep

固定版はelapsed nanosecondsへ60を掛けてaccumulatorへ加え、10億以上になるごとにgameを一step進める。これは一tickを1/60秒とし、整数除算による周期丸めを避ける方法である。

```text
accumulated += elapsed_ns × 60
while accumulated >= 1,000,000,000:
    game.step(input)
    accumulated -= 1,000,000,000
```

renderが10 FPSでも、時間に応じて複数tickを進めるためgame speedを概ね実時間へ保つ。ただし処理が長時間追いつかないと、catch-up loopが増えてさらにrenderが遅れるspiral of deathが起こり得る。最大step数やoverload方針を設計する。

### 26.3 render frameとdisplay refresh

gameが一枚分のcommandを生成した回数、RasterIXがframebufferへcommitした回数、displayがbuffer swapを認めた回数、HDMI receiverが映像を取得した回数は同じとは限らない。計測名を区別する。

固定版`present`はsceneをdrawし、swap前のframe countを読み、`swapDisplayList`を呼び、counterが変わるまで待つ。これにより同じbufferを表示側が読む前に再利用する競合を避ける。counter増加はdisplay handshakeの観察であり、cameraで測るvisual FPSとは別である。

### 26.4 inputのsampling

現行gameはterminalをnonblockingでpollし、A/D/S/Spaceなどをinput stateへ変換する。movementは停止または反対入力まで保持し、launchは一回だけ使うeventとして`takeInput`後にclearする。

controllerを追加する場合も、raw I2C byteからbutton/axis、debounce/calibration、game actionへ層を分ける。hardware read周期と60 Hz game tickが違う場合、最新stateを保持し、短いeventを失わない方法を決める。

### 26.5 game stateとrender state

ball position、paddle position、brick alive、score、livesはgame stateである。vertex list、color、dirty rectangle、二つのframebufferごとの過去sceneはrender stateである。同じものに見えても責務が違う。

game logicを一step進めず何度renderしても、同じsceneになるべきである。逆にrenderをskipしてもgame stateは時間に従って進められる。この分離はtestを容易にし、描画最適化がgame判定を変えないことを確認できる。

### 26.6 全体描画、呼出し統合、部分描画

全体描画は毎frame背景と全objectを描くため単純で、初期正解として使える。呼出し統合は、同じstateの四角形をまとめてdraw call数とcommand準備を減らす。部分描画は、前frameから変わった領域だけを消し、重なるobjectを正しい順で描き直す。

部分描画では二つのdisplay bufferそれぞれの過去状態を管理する。現在画面に見えているbufferと、次に描くbufferが交互に変わるため、一つ前のframeだけを覚えると消し残しが出る。起動時は履歴がないため両bufferを全体描画で初期化する。

### 26.7 text rendering

一般的なreal-time graphicsではglyph atlas textureを使い、各文字をtexture付きquadとして描くことが多い。固定版の文字も複数の小図形またはtextureとして表現できる。重要なのは、文字一個を一draw callにするとcommand preparation costが増える点である。

文字の見た目、font data生成、glyph placement、draw batchingを分ける。文字化けまたは欠けが性能問題とは限らない。glyph geometry、buffer lifetime、state change、clippingを検査する。

### 26.8 game loopの単体試験

hardwareなしでも、同じinput sequenceでball、collision、scoreが期待値になるかをtestできる。rendererはsceneから生成したprimitive数、dirty region、draw orderを検査できる。transportはfake connectorでword列を保存し、expected packetと比較できる。

実機testだけにすると、game bug、software rendering bug、bus bug、RTL bug、display bugが同時に候補になる。純粋なlogicから外側へtestを重ねる。

## 第27章 softwareとhardwareを層ごとに診断する

### 27.1 最初に同じ版を動かしているか確かめる

診断前に、source commit、submodule、bitstream、DTB、kernel、rootfs、applicationを固定する。古いSD copyを動かした状態では、codeを直しても症状が変わらない。実機起動logとbinary hashを試行ごとに保存する。

![図27.1 症状から最初に異なる境界を探す診断の梯子](figs/deep-diagnosis-ladder.png)

### 27.2 hostで確認するcommand

```bash
git status --short
git rev-parse HEAD
git submodule status
file rasterix-build/rasterix-breakout
riscv64-buildroot-linux-gnu-readelf -h rasterix-build/rasterix-breakout
dtc -I dtb -O dts wally-nexysvideo-rasterix.dtb -o decoded.dts
```

Vivado reportではutilization、timing、clock、CDC、DRCを保存する。build successだけでWNSやunconstrained pathを見落とさない。

### 27.3 target Linuxで確認するcommand

環境に存在する範囲で次を使う。

```bash
uname -a
cat /proc/cpuinfo
cat /proc/iomem
cat /proc/interrupts
dmesg | tail -n 100
sha256sum ./rasterix-breakout
```

BusyBox構成では一部commandやoptionがない場合がある。command不在をhardware failureと解釈せず、rootfs configを確認する。

### 27.4 UART logの読み方

UARTはboot初期から使え、画面が出ない場合にも役立つ。logへtimestampまたは段階名を入れ、ZSBL、OpenSBI、kernel、applicationを区別する。binary dataや大量traceを低速UARTへ出すとsystem timingを大きく変える。

文字化けはbaud、input clock、data bit、parity、line endingを確認する。何も出ない場合はTX pin、USB port、reset、bitstream、terminal deviceの順に分ける。

### 27.5 register canary

ID register readは小さいend-to-end testである。期待値が返れば、process mapping、MMU、LSU、bus、decoder、APB read、adapterの一部が通った。次にstatus、単一command、frame countへ段階を進める。

ID不一致でtriangle codeを直しても意味がない。最初に失敗した境界より後の処理をいったん候補から外す。

### 27.6 waveformとsoftware logを時刻で結ぶ

simulationまたはILAではAPB handshake、FIFO write/read、AXI stream、DDR request、swap handshakeを見る。software logにはcommand sequence番号やframe countを出す。共通counterまたはtrigger eventで両者を対応付ける。

logic analyzerを入れるとresourceとtimingが変わることがある。debug buildの結果をproduction buildの性能値として使わず、観察用構成を明記する。

### 27.7 error injection

PREADYを数cycle下げる、FIFOを小さくする、TLASTを一度欠かす、DTB addressを意図的にずらすなど、制御されたfaultを入れるとerror detectionを確認できる。元sourceと実験branchを分け、必ず戻せるようにする。

timeoutが働くか、silent dropしないか、reset後に回復するか、error messageが原因stageを示すかを見る。正常caseだけの試験ではbackpressureやrecoveryは確認できない。

### 27.8 assertionとsoftware invariant

hardwareでは「FIFO full時にwriteしない」「valid中readyまでdataを保持」「APB writeは一回だけpush」などをassertionにする。softwareではbuffer index、sizeの4 byte alignment、address range、context lifetimeをcheckする。

両側の検査は重複ではない。hardwareは悪いsoftwareからも内部整合を守り、softwareはerrorを早く説明可能にする。

### 27.9 診断記録の書式

一試行ごとに、目的、固定版、変更一つ、予想、command、入力、観察、結果、artifact pathを書く。成功画像だけでなく、UART log、counter、report、hashを保存する。予想と異なった結果も削除せず、次の仮説の根拠にする。

## 第28章 hardware software協調で性能を測る

### 28.1 end-to-end latencyを分解する

一frameの時間は、game update、CPU側描画準備、MMIO転送、RasterIX実行、DDR commit、display swap待ちに分けられる。重なって実行できる区間もあるため、単純に足し算できるかを先に確認する。

![図28.1 一frameのsoftwareとhardwareの待ち時間を分解する](figs/deep-end-to-end-latency.png)

### 28.2 timestampの置き場所

区間の境界に`steady_clock` timestampを置く。関数全体だけでなく、scene構築前後、display list生成前後、MMIO write前後、swap request前後を測る。hardware counterがあればCPU timestampと併用する。

clock readにもcostがあり、非常に短い区間では影響が大きい。同じ区間を多数回測り、空の測定、warm-up、中央値や分布を見る。nanosecond型で返ることとnanosecond精度があることは別である。

### 28.3 throughputとlatency

command一語のlatencyが長くてもpipelineで連続wordを一cycleごとに受けられればthroughputは高い。逆に最初の応答が速くても、一wordごとにsoftwareが完了待ちすればthroughputは低い。

FPSはend-to-end throughputである。command words/s、triangles/s、fragments/s、DDR bytes/sを別に測る。どのrateが飽和したかで改善対象が変わる。

### 28.4 Littleの法則とqueue

安定したqueueでは、平均滞留数L、到着率λ、平均滞留時間Wに`L = λW`の関係がある。FIFO occupancy、command rate、wait timeを同時に測れば、bufferがburstを吸収しているのか、長期的に処理が追いついていないのかを考えられる。

FIFOを深くしても、平均consumer rateがproducer rateより低ければ最終的にfullになる。深さは一時burstと停止時間を吸収する設計値であり、計算能力そのものを増やさない。

### 28.5 因果を示す比較

同じgame state、resolution、compiler、clock、bitstreamで、一要因だけを変える。全体描画、呼出し統合、部分描画を同じexecutableのoptionで選べばbuild差を減らせる。命令数、command word数、MMIO時間、frame timeを合わせて保存する。

時間が減っただけで原因を決めず、変更によって減ると予想した中間量も測る。draw call統合ならcall数とword数、部分描画なら更新面積とprimitive数、wait改善ならsleep時間とcounter待ち時間を見る。

### 28.6 正しさを性能と同時に守る

速くなっても、brickが消える、二重bufferの片方に残像が出る、game tickが遅くなるなら同じ処理の改善ではない。固定inputとstate、framebuffer hash、選択frameのpixel比較、game resultを使う。

pixel完全一致が必要な比較と、見た目同等でよい比較を区別する。blendやfixed-point順序を変える最適化では、許容誤差を先に定義する。

### 28.7 CPU最適化とhardware最適化

CPU側ではdraw call削減、data structure、allocation削減、compiler最適化、batchingがある。hardware側ではclock、parallelism、pipeline、memory width、cache、FIFO、RasterIX parameterがある。software変更でCPU準備が支配的でなくなれば、次のbottleneckがhardwareへ移る。

最適化は一度で終わらない。測定、支配区間の特定、変更、正しさ確認、再測定を繰り返す。ただし研究発表では、探索したすべてではなく、主張を支える比較と限界を示す。

### 28.8 報告する最小dataset

| 種類 | 保存する値 |
|---|---|
| 固定条件 | commit、bitstream、DTB、binary hash、clock、resolution |
| workload | game state、実行時間、input、描画方式 |
| software | command準備、call数、word数、CPU time |
| hardware | FIFO wait、busy、swap count、memory traffic |
| end-to-end | frame interval、完了frame数、visual確認 |
| correctness | state、pixel/hash、error、timeout |

### 28.9 この技術付録で到達する理解

hardware側では、RTLの記述からresourceとtimingを予想し、Wallyの命令・memory・bus・privilegeを追い、CDCと周辺回路を設計し、reportと波形で確認する。software側では、cross build、boot、kernel、virtual memory、MMIO、RasterIX API、game loopを追い、実行binaryとhardwareの契約を検証する。

最終目標は用語を暗記することではない。新しいcontroller、表示方式、resolution、clock、cache構成を提案されたとき、変更箇所、守る契約、起こり得るfailure、必要なtest、性能と資源のtrade-offを自分で列挙できる状態である。
