## 第21章 LSUの読書きとキャッシュと番地変換

C++の配列を読む操作にも、番地の計算、アクセス権の確認、キャッシュの検索、必要に応じた外部メモリへの要求が含まれる。この章では一回の読出しを入口に、途中で値が得られる場所と、処理を待たせる場所を追う。

### 21.1 loadとstoreの入口

Load Store Unitは、IEUが計算したeffective 番地を受け、alignment、仮想番地変換、permission、PMA/PMP、キャッシュまたはbus access、subword処理、atomic操作を行う。固定版の入口は`src/lsu/lsu.sv`である。

load/store命令の番地は通常`rs1 + sign-extended immediate`で作る。ソフトウェアがC++で`regs[3]`を読む場合も、コンパイラはbase 番地へoffsetを足すload命令を生成する。その物理番地が最終的にRasterIX レジスタを選ぶまで、LSUとuncoreを通る。

![図21.1 仮想addressからcacheまたはI/OまでのLSU経路](figs/deep-lsu-vm-cache.png)

### 21.2 access size、alignment、byte lane

load/storeはbyte、halfword、word、doublewordなどのsizeを持つ。番地下位bitはbusのどのbyte laneを使うかを決め、store strobeは有効なbyteを示す。loadは読んだbus wordから対象byteを選び、符号付きならsign extensionする。

misaligned accessをハードウェアで分割して扱うか、exceptionにするかは構成とISA条件による。MMIO レジスタは32 bit aligned accessだけを許す設計が多い。RasterIX側はaligned 32 bit wordを契約としているため、8 bit storeを勝手に一commandとして扱わない。

### 21.3 TLB hitとpage table walk

LinuxのU-mode プロセスは仮想番地を使う。DTLBはVPNからPPNへの最近の変換を保持する。hitならpermissionを確認して物理番地を作る。missならHPTWが`SATP`からpage table rootを得て、PTEを段階的に読む。

Sv48では仮想番地を複数のVPN segmentへ分ける。各levelのPTE 番地は、前levelが示すPPNと次のVPN indexから計算する。leaf PTEでR/W/XやU、A、Dなどを確認する。invalid、permission違反、misaligned superpageなどはpage faultになる。[RISCVPriv26]

HPTW自身もメモリを読むため、通常のload/store pathとbusを共有する。`SelHPTW`のような選択信号を追い、CPU命令の要求とwalk要求を混同しない。

### 21.4 PMAとPMP

Physical Memory Attributeは、物理領域がmain メモリ、I/O、cacheable、idempotent、atomic対応など、platformとして持つ性質を表す。Physical Memory Protectionは、M-modeが物理番地範囲とR/W/X権限を設定する機構である。

RasterIX レジスタ領域は通常メモリのように投機的に何度も読んだりキャッシュしたりしてはいけない。readにside effectがなくてもwrite commandはnon-idempotentである。同じstoreを二度出せば二語送信される。このため番地 decodeだけでなく、PMA上のI/O属性とソフトウェア mappingを一致させる。

### 21.5 cache hit、miss、eviction

data キャッシュ accessでは、indexでsetを選び、各wayのtagと比較する。hitしたwayのdataを読む。store hitではwrite policyに従ってlineとdirty bitを更新する。miss時に置換対象がdirtyならwritebackし、その後新しいlineをrefillする。

キャッシュ FSMは複数周期にわたりbus transferを行う。`LSUStallM`はパイプラインへ未完了を伝える。HREADYが一度0になっただけでerrorではない。要求のaddress/controlをprotocolどおり保持し、responseが完了してから命令を進める。

### 21.6 MMIOとcacheを分ける

MMIOはload/store命令を使うが、通常RAMとは性質が異なる。キャッシュへ入れると、command writeがdeviceへ届かなかったり、status readが古い値になったりする。PMAと番地 regionでuncached pathへ送る。

ソフトウェア側の`volatile`はコンパイラによる省略や統合を制限する。ハードウェア cacheability、CPUのI/O ordering、device完了は別問題である。固定版`WallyBusConnector.hpp`は`volatile uint32_t*`でレジスタへaccessし、送信後にRISC-V `fence iorw, iorw`を置く。ただしfenceは描画完了を待つ命令ではなく、必要なorderingを作る。display swapの完了はframe counterを観察する。

### 21.7 atomic命令とLR/SC

A extensionではAMOとLR/SCを扱う。LRは番地へのreservationを作り、SCはreservationが有効ならstoreする。interrupt、別access、キャッシュ eventなどでreservationが失われ得る。AMOはread-modify-writeを不可分に実行する。

MMIO peripheralがatomicを意味ある形で支えるとは限らない。PMAで許可されない領域へAMOを行えばaccess faultとすべきである。ソフトウェア lockにatomic命令を使う話と、device レジスタにatomic commandを書く話を分ける。

### 21.8 共有DDR3と二つのmaster

本構成ではWallyとRasterIXがDDR3を共有する。CPUはLinux、プログラム、dataに使い、RasterIXはテクスチャとdisplay bufferを使う。AXI interconnectが要求を仲裁するが、番地領域を予約しただけでキャッシュ coherenceが自動的に生まれるわけではない。

device treeの`reserved-memory`と`no-map`は、Linuxの通常allocatorと標準mappingから領域を外す。RasterIXへ渡すbuffer 番地を他のプロセスが使わないために重要である。一方、ハードウェアが誤番地へ書くことを防ぐ境界検査ではない。番地計算、buffer size、owner切替を別に検証する。

### 21.9 memory問題を切り分ける観察点

| 観察点 | 分かること | まだ分からないこと |
|---|---|---|
| load/storeの仮想番地 | applicationが何を要求したか | 物理番地、device到達 |
| TLB/HPTW結果 | 変換とpermission | cache/bus完了 |
| キャッシュ hit/miss | local メモリ path | DDR dataの正しさ全体 |
| AHB request/response | core外へ出たtransfer | APB peripheral内部 |
| APB handshake | レジスタ access成立 | RasterIX描画完了 |
| framebuffer readback | メモリ上の画素 | 外部映像の受理 |

一つの段階で期待値と比較し、最初に異なる境界を探す。画面が出ないという最終症状だけでキャッシュ、DDR、displayのどれかを選ばない。
