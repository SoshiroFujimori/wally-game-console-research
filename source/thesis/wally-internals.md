## 第13章 Wallyの構成値が回路になるまで

### 13.1 構成値は単なる一覧ではない

Wallyは、同じRTLからRV32またはRV64、cacheの有無、仮想memoryの方式、周辺回路、分岐予測器などが異なるprocessorを作れる。これを可能にするのが構成値である。しかし、構成値をsoftwareの設定fileと同じだと思うと不十分である。値によってbit幅が変わり、`generate`でmoduleそのものが存在しなくなり、address decoderの論理も変わる。すなわち、構成値はelaboration時に作る回路を決める設計入力である。[Harris26][Console26]

固定版では、Nexys Video単体の派生構成が`fpganexysvideo`、RasterIXを加える派生構成が`fpganexysvideo_rasterix`である。後者は前者を継承し、`EXT_IO_SUPPORTED`だけを追加で有効化する。この分離により、基板対応と、特定の外部周辺回路の接続を同じ変更として扱わずに済む。

![図13.1 構成値がmoduleの生成とsoftwareの契約へ伝わる経路](figs/deep-config-contract.png)

### 13.2 `derivlist.txt`から`config.vh`が生まれる

構成のsource of truthは`config/derivlist.txt`である。`deriv fpganexysvideo fpga`は、`fpga`の値を受け継いでNexys Video固有の変更を加える関係を表す。`deriv fpganexysvideo_rasterix fpganexysvideo`は、その上へRasterIX接続に必要な値を加える。

`bin/derivgen.pl`はこの継承関係を読み、`config/deriv/<名前>/config.vh`を生成する。生成物を直接直すと、次にderivgenを実行したとき変更が消える。したがって、値を永続的に変える入口は`derivlist.txt`または基底構成であり、生成済み`config.vh`は答え合わせの対象である。

```bash
cd "$WALLY"
perl bin/derivgen.pl
grep -n 'EXT_IO_SUPPORTED\|EXT_MEM_RANGE' \
  config/deriv/fpganexysvideo_rasterix/config.vh
```

成功条件は、選んだ派生構成の生成fileに意図した値が一度だけ現れ、親から受け継ぐ値も保持されることである。生成時刻だけを見ず、`git diff -- config/deriv`で意図しない派生構成まで変わっていないか確認する。

### 13.3 `cvw_t`は型付きの構成契約である

`src/cvw.sv`は`cvw_t`というpacked structを定義する。そこには`XLEN`、`PA_BITS`、cacheのway数とline長、各ISA extension、各memory領域のBASEとRANGE、周辺回路の有効値などが入る。`config/shared/parameter-defs.vh`は、`config.vh`のlocalparamを同じfieldへ詰め、`localparam cvw_t P = '{ ... };`を作る。

各moduleは`import cvw::*; #(parameter cvw_t P)`として同じ契約を受け取る。例えば`P.XLEN`はdata pathの幅、`P.PA_BITS`は物理addressの幅、`P.EXT_IO_SUPPORTED`は外部APB portを生成するかを決める。structへまとめる利点は、数十個のparameterをmoduleごとに別順序で渡さず、field名で意味を固定できることである。

一方、`P`の値がすべてruntimeに保存されたregisterになるわけではない。多くはelaboration時の定数であり、使われない分岐を合成前に消す。値を読み出すsoftware用registerが必要なら、別途RTLで実装しなければならない。

### 13.4 BASEとRANGEの読み方

Wallyのaddress領域は`BASE`と`RANGE`で表す。`src/cvw.sv`のcommentが示すように、RANGEは下位bitが連続して1になるthermometer codeを想定する。例えば32 MiBならサイズは`0x02000000`、RANGEはその一つ下の`0x01ffffff`である。decoderは、addressの可変部分をmaskし、BASEと一致するかを調べる。

`BASE + RANGE`は含まれる最後のaddressであり、領域のbyte数は`RANGE + 1`である。`0x10080000`をBASE、`0x000000ff`をRANGEにすると、`0x10080000`から`0x100800ff`までの256 byteを選ぶ。softwareの`mmap`長4096 byteと、hardware register領域256 byteは別の値である。

address範囲を変えるときは、次の四者を比較する。

| 層 | 具体的な場所 | 一致させる内容 |
|---|---|---|
| Wally構成 | `config/derivlist.txt` | BASE、RANGE、有効値 |
| RTL接続 | `uncore.sv`とboard top | decoderで選ばれる相手 |
| OSの説明 | `.dts`の`reg` | 物理addressと長さ |
| application | `mmap`のoffset、register index | accessするaddressと幅 |

### 13.5 構成値と生成条件を混同しない

`EXT_IO_SUPPORTED=1`は、Wally SoCの外へAPB信号を出す回路を有効にする。これだけでRasterIXは生成されない。board buildでは`RASTERIX=1`も使い、RasterIXのsourceとIPを読み、board topで外部APB portへ接続する。つまり、Wally側interfaceの存在と、接続相手の存在は別条件である。

固定版の`fpga/generator/Makefile`にある`nexysvideo-rasterix` targetは、`CONFIG=fpganexysvideo_rasterix`と`RASTERIX=1`を組み合わせる。`wally.tcl`は選択した`config.vh`を調べ、RasterIX buildなのに外部APBが無効ならerrorにする。この検査は、片方だけ有効にした不完全なbitstreamを早い段階で止める。

### 13.6 同じ値をhardwareとsoftwareへ二重に書く危険

CPU clock 20 MHzは、Clocking Wizardが作る物理clock、UART divisorの計算、device treeの`clock-frequency`と`timebase-frequency`に関係する。DDR3 512 MiBは、MIGの実物設定、Wallyの外部memory範囲、device treeのmemory node、boot imageの配置に関係する。一つの値でも、hardwareを作る記述と、softwareへhardwareを説明する記述がある。

device treeを20 MHzと書いても、実際のclockは変わらない。Clocking Wizardだけを25 MHzへ変え、device treeを20 MHzのままにすると、LinuxのtimekeepingやUARTの想定が現実とずれる。二重記述を完全に消せない場合は、build時のassertion、生成script、表による照合で不一致を検出する。

### 13.7 parameter変更の影響範囲を調べる

値を変える前に、定義、参照、生成物、software契約を検索する。例えば`EXT_IO_BASE`なら次を実行する。

```bash
rg -n 'EXT_IO_BASE' config src fpga linux examples
```

検索結果を、定義、structへの格納、address decode、software記述、documentへ分類する。文字列が現れない経路にも注意する。C++側では数値`0x10080000`が直接書かれており、field名では検索できない。数値表記も検索する。

変更後は、elaboration成功だけで完了にしない。addressの境界値、無効構成、重複領域、softwareからのID read、既存周辺回路への非干渉を確認する。構成値の意味が広いほど、試験も複数層にまたがる。

### 13.8 この章を使った自己確認

次の問いにsource pathを添えて答える。

1. `fpganexysvideo_rasterix`は何を継承し、何だけを追加するか。
2. `EXT_IO_SUPPORTED=1`だけではRasterIXが存在しないのはなぜか。
3. `RANGE=0xff`が256 byteになる理由は何か。
4. `P.XLEN`を変えたとき、port幅だけでなくsoftware ABIも調べる必要があるのはなぜか。
5. generated `config.vh`を直接編集しない理由は何か。

答えは値の定義だけで終えず、その値が生成する回路、softwareから見える約束、検証方法まで含める。

## 第14章 IFUと命令取得を深く読む

### 14.1 IFUの責務

Instruction Fetch Unitは、次に実行するPCを選び、そのaddressから命令bitを得て、decode stageへ渡す。単にmemoryを一回読むだけではない。分岐予測、圧縮命令、命令cache、仮想address変換、access権、bus待ち、例外、stallとflushを一つの流れへ統合する。[Harris26][RISCVUnpriv26][RISCVPriv26]

固定版の入口は`src/ifu/ifu.sv`である。外側からは`StallF`、`FlushD`、privilegeとSATP、PMP設定を受け、EBUへ`IFUHADDR`、`IFUHTRANS`などを出す。decode側へは`InstrD`、`InstrValidD`、PC関連値、fault情報を渡す。

![図14.1 PC選択からdecode stageまでの命令取得経路](figs/deep-ifu-instruction.png)

### 14.2 PCはどこから選ばれるか

通常の次PCは、現在の命令長を足した値である。RISC-V C extensionがあると命令は16 bitまたは32 bitなので、常にPC+4ではない。分岐予測が有効なら予測先、execute stageで予測誤りが分かれば正しいbranch先、trapならtrap vector、returnならEPCを選ぶ。

PC selectionはpriorityが重要である。trapを処理すべきcycleに予測器の値を選べば、architectural control flowを失う。sourceを読むときはMUXの入力名だけでなく、select条件の優先順位と、それぞれが確定するpipeline stageを見る。

### 14.3 圧縮命令と境界をまたぐ命令

16 bit命令を許すと、32 bit命令がfetch wordの境界をまたぐ場合がある。`src/ifu/spill.sv`は、前回fetchした一部と次の一部を組み合わせる。`src/ifu/decompress.sv`は16 bit compressed instructionを、後段が扱う32 bit形式へ展開する。

ここで「memoryから32 bit読めば一命令」とは限らない。fetch単位、cache line、bus beat、ISA上の命令長は異なる。PCの下位bit、前半の保持、access faultがどの半分で起きたかを追う必要がある。

### 14.4 branch predictorの予測と学習

`src/ifu/bpred`には方向予測、Branch Target Buffer、Return Address Stack、命令class予測などがある。予測器はarchitectural stateではない。予測が外れても、誤った命令をretireさせず、正しいPCからやり直せばISA上の結果は同じである。

方向予測はbranchを取るか、BTBは予測先address、RASは関数return先を予測する。executeまたはmemory stageで実際の結果と比較し、`BPWrongE`などを作る。`hazard.sv`はその信号を使って後続命令をflushする。

性能評価では予測精度だけでなく、誤予測一回のpenalty、predictorのaccess timing、storage量を見る。精度が高くてもcritical pathを延ばしclockを下げれば、全体性能が悪化し得る。

### 14.5 命令cacheとuncached access

命令cache hitなら、必要なwordを短い経路で返す。missならcache lineを外部memoryから補充し、その間`IFUStallF`でpipelineを止める。PMAでcacheableではない領域なら、cacheを迂回してbus accessする。

cache lineは複数命令を含む。tagはどのmemory blockか、indexはどのsetか、offsetはline内の位置かを示す。hit判定、valid bit、replacement、refillのFSMを分けて読む。cacheを大きくする変更はhit率だけでなくBRAM数、tag比較、配線、refill時間へ影響する。

### 14.6 instruction-side MMU

Linuxのuser processが使うPCは仮想addressである。instruction TLBに変換があれば物理addressへ直す。TLB missならHardware Page Table Walkerがpage tableをmemoryから読み、PTEを調べる。permissionやPTE不正ならinstruction page faultを発生させる。

仮想address変換とPMP/PMAは目的が違う。page tableはOSが作る仮想から物理への対応とpermission、PMPはmachine modeが物理領域への権限を制限する仕組み、PMAはその物理領域がmemoryかI/Oか、cache可能かなどの属性である。順序を混ぜず、最終的な物理addressとfault原因を追う。

### 14.7 stall中とflush時の命令

stallはstage registerを保持する。flushはそのstageの命令を無効にする。IFUがbus待ちでも、同じcycleに古い命令がtrapを起こす可能性がある。固定版の`hazard.sv`は、IFU stallをflush原因でgateする条件を持ち、trapやbranch correctionを優先できるようにする。

波形ではPCの数値だけを見ず、`InstrValidD`、`StallF/D`、`FlushD/E`、fault signalを一緒に見る。同じPCが数cycle続くことはstallなら正常であり、同じ命令が複数回retireすることとは異なる。

### 14.8 一命令をsourceで追う手順

1. 逆assemblyで対象命令のPCとbit列を得る。
2. IFUでPC selectionとcache/TLB pathを確認する。
3. `InstrD`と`InstrValidD`へ入るcycleを波形で探す。
4. branchなら予測値と実際値、loadなら後続LSU pathへつなぐ。
5. RVVIまたはretirement logでarchitectural resultを確認する。

`InstrD`が見えたことは、その命令が実行完了した証拠ではない。flushされた可能性がある。最後にretireまたはarchitectural stateの更新へ到達したかを確認する。

## 第15章 IEUとpipeline hazardを深く読む

### 15.1 IEUの役割を四つへ分ける

Integer Execution Unitは、命令decode、register fileのread/write、immediate生成、ALUとbranch判定、pipeline registerとforwardingを扱う。固定版の入口は`src/ieu/ieu.sv`、controlは`controller.sv`、data pathは`datapath.sv`、演算は`alu.sv`や`shifter.sv`などに分かれる。

「命令を解読する」と「値を計算する」を分ける。controllerはopcodeやfunct fieldからcontrol signalを作る。datapathはregister値とimmediateを選び、ALUへ渡し、結果を後段へ運ぶ。control signalも同じpipeline stageへ遅延させないと、別の命令のdataへ作用する。

![図15.1 五段pipelineでdataとcontrolが同じ命令として進む関係](figs/deep-pipeline-hazard.png)

### 15.2 decodeはbit列から意味を取り出す

32 bit命令にはopcode、rd、funct3、rs1、rs2、funct7などのfieldがある。命令形式により同じbit位置の用途が変わる。controllerはcase表でALU source、register write、memory read/write、branch、CSRなどを決める。未対応encodingはillegal instructionとして扱う。

decodeを変更するときは、似たopcodeとの重なり、extensionの有効条件、RV32/RV64差、compressed命令の展開後形式を確認する。`casex`やwildcardで広く一致させると、将来extensionまたはreserved encodingを誤って受け入れる危険がある。

### 15.3 register fileとx0

RISC-V integer registerは32本で、x0はreadすると常に0、writeは無視される。decode stageでrs1とrs2を読み、writeback stageでrdへ書く。readとwriteが同じcycleに同じregisterを指す場合の値は、register file実装とbypassで定義する。

architectural register fileと、pipeline registerを区別する。x5の値はarchitectural stateだが、`RdE`や`RdM`は「現在そのstageにいる命令のdestination番号」という一時的な制御状態である。flushされた命令は、その一時状態がbitとして残っていてもwrite enableを無効化し、architectural stateを変えてはならない。

### 15.4 ALU sourceとimmediate

ALUの入力Aはrs1、PC、0など、入力Bはrs2、immediateなどから選ぶ。immediateはI/S/B/U/J形式ごとに命令bitを並べ直し、XLENへsign extensionする。branch offsetの下位0やJALのbit順は連続していないため、図とcodeを照合する。

bit幅とsignednessは回路の意味を変える。signed less-thanとunsigned less-than、算術右shiftと論理右shiftは同じbit列でも結果が違う。SystemVerilogの暗黙castに任せず、operandの型と必要なextensionを確認する。

### 15.5 forwardingの必要性

次の二命令を考える。

```text
add x5, x1, x2
sub x6, x5, x3
```

二命令目がdecodeでx5を読む時点では、一命令目がまだwritebackしていない可能性がある。しかし結果はexecuteまたはmemory stageに既にある。forwarding MUXは、その新しい結果をregister file read値の代わりにALU入力へ渡す。

priorityは最も新しいproducerを選ぶ必要がある。同じrdへ連続writeする場合、W stageよりM stageの結果が新しい。x0、write enable、命令valid、結果が利用可能になるstageを条件へ含める。

### 15.6 load-use hazardだけは待つ場合がある

loadのdataはmemory stageの後半まで得られない。直後の命令がexecute stageでその値を必要とすると、通常のforwardingだけでは間に合わない。そのため一cycle stallし、後続命令を待たせる。これはdata依存があるすべての組合せを止めるのではなく、結果の利用可能時点とconsumerの必要時点が合わない場合である。

stall時にはF/Dを保持し、Eへbubbleを入れる必要がある。すべてを単に保持するとload命令自体も進まず、deadlockになり得る。`hazard.sv`の「次stageがstallなら前もstall」「最初にstallしていないstageをflush」という規則は、このbubble生成を一般化する。

### 15.7 long-latency unitとstructural hazard

divisionや一部FPU操作は一cycleで終わらない。execute stageのunitがbusyなら、そこへ新しい命令を入れず、前段をstallする。二つの命令が同じhardware resourceを同時に必要とする場合はstructural hazardである。

resourceを複製すればthroughputを上げられる場合があるが、LUT/DSP/配線が増える。共有すれば資源は減るが、arbitrationとstallが増える。正しい選択はworkloadとtarget clockを測って決める。

### 15.8 branch、trap、stallの優先順位

branch mispredictionはexecute stageで分かり、若い命令をflushする。trapはmemory stageで確定し、より広い範囲をflushする。division中、WFI、IFU/LSU stallが同時に起こる場合もある。priorityを局所moduleごとにばらばらに決めると、あるFSMだけがstallを見続けるなどの不整合が起きる。

固定版`hazard.sv`はflush causeとstall causeを分け、各stageの最終信号を作る。reviewでは真理値表またはpropertyを用意し、trap時に誤ったstoreがcommitしない、branch修正時にdivideを不正に捨てない、stall解除後に一回だけ進むことを確認する。

### 15.9 CPIを原因別に考える

理想的な五段pipelineは、充填後に一cycle一命令をretireできる。しかしcache miss、load-use、branch misprediction、division、I/O waitがbubbleを作る。実行時間は概ね次の関係で考えられる。

```text
実行時間 = 命令数 × CPI × clock周期
CPI = 1 + 各stall・flushが加えるcycle / retired命令数
```

clockを高くする変更がCPIを悪化させる場合も、命令数を減らすsoftware変更がcache miss率を変える場合もある。一つのcounterだけで原因を断定せず、命令数、cycle、各event、wall timeを同じ区間で測る。

## 第16章 LSUとmemory hierarchyを深く読む

### 16.1 loadとstoreの入口

Load Store Unitは、IEUが計算したeffective addressを受け、alignment、仮想address変換、permission、PMA/PMP、cacheまたはbus access、subword処理、atomic操作を行う。固定版の入口は`src/lsu/lsu.sv`である。

load/store命令のaddressは通常`rs1 + sign-extended immediate`で作る。softwareがC++で`regs[3]`を読む場合も、compilerはbase addressへoffsetを足すload命令を生成する。その物理addressが最終的にRasterIX registerを選ぶまで、LSUとuncoreを通る。

![図16.1 仮想addressからcacheまたはI/OまでのLSU経路](figs/deep-lsu-vm-cache.png)

### 16.2 access size、alignment、byte lane

load/storeはbyte、halfword、word、doublewordなどのsizeを持つ。address下位bitはbusのどのbyte laneを使うかを決め、store strobeは有効なbyteを示す。loadは読んだbus wordから対象byteを選び、符号付きならsign extensionする。

misaligned accessをhardwareで分割して扱うか、exceptionにするかは構成とISA条件による。MMIO registerは32 bit aligned accessだけを許す設計が多い。RasterIX側はaligned 32 bit wordを契約としているため、8 bit storeを勝手に一commandとして扱わない。

### 16.3 TLB hitとpage table walk

LinuxのU-mode processは仮想addressを使う。DTLBはVPNからPPNへの最近の変換を保持する。hitならpermissionを確認して物理addressを作る。missならHPTWが`SATP`からpage table rootを得て、PTEを段階的に読む。

Sv48では仮想addressを複数のVPN segmentへ分ける。各levelのPTE addressは、前levelが示すPPNと次のVPN indexから計算する。leaf PTEでR/W/XやU、A、Dなどを確認する。invalid、permission違反、misaligned superpageなどはpage faultになる。[RISCVPriv26]

HPTW自身もmemoryを読むため、通常のload/store pathとbusを共有する。`SelHPTW`のような選択信号を追い、CPU命令の要求とwalk要求を混同しない。

### 16.4 PMAとPMP

Physical Memory Attributeは、物理領域がmain memory、I/O、cacheable、idempotent、atomic対応など、platformとして持つ性質を表す。Physical Memory Protectionは、M-modeが物理address範囲とR/W/X権限を設定する機構である。

RasterIX register領域は通常memoryのように投機的に何度も読んだりcacheしたりしてはいけない。readにside effectがなくてもwrite commandはnon-idempotentである。同じstoreを二度出せば二語送信される。このためaddress decodeだけでなく、PMA上のI/O属性とsoftware mappingを一致させる。

### 16.5 cache hit、miss、eviction

data cache accessでは、indexでsetを選び、各wayのtagと比較する。hitしたwayのdataを読む。store hitではwrite policyに従ってlineとdirty bitを更新する。miss時に置換対象がdirtyならwritebackし、その後新しいlineをrefillする。

cache FSMは複数cycleにわたりbus transferを行う。`LSUStallM`はpipelineへ未完了を伝える。HREADYが一度0になっただけでerrorではない。要求のaddress/controlをprotocolどおり保持し、responseが完了してから命令を進める。

### 16.6 MMIOとcacheを分ける

MMIOはload/store命令を使うが、通常RAMとは性質が異なる。cacheへ入れると、command writeがdeviceへ届かなかったり、status readが古い値になったりする。PMAとaddress regionでuncached pathへ送る。

software側の`volatile`はcompilerによる省略や統合を制限する。hardware cacheability、CPUのI/O ordering、device完了は別問題である。固定版`WallyBusConnector.hpp`は`volatile uint32_t*`でregisterへaccessし、送信後にRISC-V `fence iorw, iorw`を置く。ただしfenceは描画完了を待つ命令ではなく、必要なorderingを作る。display swapの完了はframe counterを観察する。

### 16.7 atomic命令とLR/SC

A extensionではAMOとLR/SCを扱う。LRはaddressへのreservationを作り、SCはreservationが有効ならstoreする。interrupt、別access、cache eventなどでreservationが失われ得る。AMOはread-modify-writeを不可分に実行する。

MMIO peripheralがatomicを意味ある形で支えるとは限らない。PMAで許可されない領域へAMOを行えばaccess faultとすべきである。software lockにatomic命令を使う話と、device registerにatomic commandを書く話を分ける。

### 16.8 共有DDR3と二つのmaster

本構成ではWallyとRasterIXがDDR3を共有する。CPUはLinux、program、dataに使い、RasterIXはtextureとdisplay bufferを使う。AXI interconnectが要求を仲裁するが、address領域を予約しただけでcache coherenceが自動的に生まれるわけではない。

device treeの`reserved-memory`と`no-map`は、Linuxの通常allocatorと標準mappingから領域を外す。RasterIXへ渡すbuffer addressを他のprocessが使わないために重要である。一方、hardwareが誤addressへ書くことを防ぐ境界検査ではない。address計算、buffer size、owner切替を別に検証する。

### 16.9 memory問題を切り分ける観察点

| 観察点 | 分かること | まだ分からないこと |
|---|---|---|
| load/storeの仮想address | applicationが何を要求したか | 物理address、device到達 |
| TLB/HPTW結果 | 変換とpermission | cache/bus完了 |
| cache hit/miss | local memory path | DDR dataの正しさ全体 |
| AHB request/response | core外へ出たtransfer | APB peripheral内部 |
| APB handshake | register access成立 | RasterIX描画完了 |
| framebuffer readback | memory上の画素 | 外部映像の受理 |

一つの段階で期待値と比較し、最初に異なる境界を探す。画面が出ないという最終症状だけでcache、DDR、displayのどれかを選ばない。

## 第17章 特権機構、trap、interruptを深く読む

### 17.1 三つのprivilege mode

RISC-VのM-modeは最も高い権限を持ち、OpenSBIが動く。S-modeはLinux kernel、U-modeはgameなどのprocessが動く。固定版の`src/privileged/privileged.sv`はCSR、trap、privilege mode、interrupt、PMPなどをまとめる。[RISCVPriv26]

modeはsoftwareの肩書きではなく、実行できる命令、access可能なCSR、page table permission、trapの委譲先へ影響するarchitectural stateである。Linux processが直接`mstatus`を書けないのは、compilerの制限ではなくCPUが権限を検査するためである。

![図17.1 U modeの例外がS modeまたはM modeへ入る経路](figs/deep-privilege-trap.png)

### 17.2 CSR read-modify-write

CSR命令は、指定CSRを読み、registerまたはimmediateと組み合わせて書き戻す。readだけに見える命令でもrdやsourceがx0かでside effect条件が変わる。`src/privileged/csr.sv`と`privdec.sv`でaddress、権限、read/write、illegal条件を追う。

CSRは単一の大きなregister fileとは限らない。machine、supervisor、counter、interruptなどのsubmoduleに分かれ、read dataをMUXする。write enableは命令valid、trap、privilege、read-only属性を含めて決める。

### 17.3 exceptionとinterrupt

exceptionは実行中の命令に同期して起こる。illegal instruction、page fault、access fault、ECALLなどが例である。interruptはtimerや外部deviceなど、命令列の外から到着する。どちらもtrapを起こすが、原因の記録と再開PCの意味が異なる。

trap時にはcause、faultに関係する値、戻りPCをCSRへ保存し、statusのinterrupt enableとprevious privilegeを更新し、trap vectorへPCを移す。正確な例外では、faulting instructionより古い命令は完了し、若い命令はarchitectural effectを残さない。

### 17.4 delegationとOpenSBI

M-modeは一部のexceptionやinterruptをS-modeへ委譲できる。Linuxが直接扱うべきpage faultやsupervisor timer interruptなどはdelegation CSRでS-modeへ送る。platform固有のM-mode serviceはSBI callとしてOpenSBIへ依頼する。

OpenSBIはLinuxより前に起動し、hardwareを初期化し、delegationやPMPを設定し、S-modeへ移る。LinuxがM-modeを「置き換える」のではない。実行中もSBI callやM-mode trapでOpenSBIへ入る場合がある。

### 17.5 timerとCLINT

`uncore.sv`のCLINTは`MTIME`、timer compare、software interruptを提供する。`MTIME`はCPU pipeline clockと別のTIMECLKを使い得るため、CSR側へ値を渡す同期も重要になる。device treeの`timebase-frequency`は、このcounterが一秒に何回進むかをLinuxへ伝える。

clockを20 MHzから変えたのにtimebase-frequencyを変えないと、timer tickや時刻換算がずれる。UARTと同様に、「hardwareの実周波数」と「softwareへ伝えた周波数」を照合する。

### 17.6 PLICと外部interrupt

PLICは複数の外部interrupt sourceを受け、priority、pending、enable、thresholdを用いてhartへ通知する。softwareはclaim registerでsource IDを取得し、device側の原因を処理し、completeを書き戻す。

interrupt lineがlevelでassertされ続けるdeviceでは、PLICをcompleteしてもdevice原因をclearしなければ再度pendingになる。逆に先にdeviceをclearする必要がある場合もある。新しいcontroller回路をinterrupt化するなら、RTL line、PLIC source ID、device tree、kernel driver、handlerのclear順を一つの契約にする。

### 17.7 trapとpipeline flush

trapはmemory stageで確定する信号を含む。既にW stageにある古い命令はcommitできるが、若い命令は捨てる。faulting storeのwrite enableが外部busへ出た後にtrapを決める設計ではprecise性を壊すため、side effectの成立時点とexception確定時点を揃える。

波形では`TrapM`、`EPCM`、`TrapVectorM`、`FlushD/E/M/W`、register write、memory writeを同時に見る。trap vectorへPCが移っただけでは、若いside effectが抑止された証明にならない。

### 17.8 Linux system callをCPU側から見る

U-mode programが`write`などを呼ぶと、C libraryがargumentをABIでregisterへ置き、ECALL命令を実行する。CPUはenvironment call exceptionを起こし、LinuxのS-mode trap handlerへ入る。kernelはsystem call番号とargumentを読み、検査して処理し、`sret`でU-modeへ戻る。

`/dev/mem`の`open`と`mmap`もsystem callを通る。mapping後の`regs[0]=word`は通常のsystem callを毎回呼ぶのではなく、processのpage tableへdevice physical pageを対応付けた後、CPUのstore命令として実行される。この違いはMMIO性能と権限を理解するうえで重要である。

### 17.9 trap問題の切り分け

CSR値、faulting PC、instruction bit、virtual/physical address、privilege mode、delegation、page table entryを保存する。Linux logだけで不明なら、逆assemblyとRVVI traceを対応させる。hardware faultかsoftware bugかを「Linuxが止まった」という症状だけで決めない。

## 第18章 EBU、uncore、周辺回路拡張を深く読む

### 18.1 coreとuncoreの境界

`wallypipelinedcore.sv`の外側には一組のAHB-Lite master interfaceがある。IFUとLSUはそれぞれ要求を持つが、EBUが仲裁し、core外へ一つのbusとして出す。`wallypipelinedsoc.sv`はcoreとuncoreを実体化し、board topはその外でDDR controllerやRasterIXへつなぐ。

uncoreは「重要でない外側」という意味ではない。boot ROM、RAM、CLINT、PLIC、UART、GPIO、SPI、SD controller、PWM、外部memory、外部APB interfaceを持ち、CPUがsystemとして動くためのhardwareを提供する。

![図18.1 IFUとLSUからAHBとAPBを経て周辺registerへ届く一transfer](figs/deep-bus-transaction.png)

### 18.2 EBUの仲裁

IFUは命令fetch、LSUはload/storeまたはpage table walkのmemory requestを出す。同じ外部busを同時に使えない場合、EBUはpriorityとownershipを決める。選ばれなかった側はreadyが戻るまでstallする。

仲裁では要求を途中で切り替えない。AHBのaddress phaseとdata phaseが重なるため、現在のresponseがどのmasterの要求かを保持する。HREADYが0の間にowner、address、controlを変えると別要求のresponseとして解釈する危険がある。

### 18.3 AHB-Liteの一transfer

masterはaddress、HTRANS、HWRITE、HSIZEなどをaddress phaseへ出す。次cycleのdata phaseでwrite dataまたはread dataとresponseを扱う。slaveはHREADYを0にしてwait stateを追加できる。address phaseとdata phaseがpipelineされるため、現在busに見えるaddressと、返っているread dataが同じtransferとは限らない。

`uncore.sv`はaddress decoderのselectをregisterへ保存する。commentにあるように、response MUXのselectはdata phaseの要求に対応しなければならず、wait中は古いselectを保持する。これは単なる一cycle遅延ではなく、protocolのphase対応を守る状態である。

### 18.4 address decodeと重複

`src/mmu/adrdecs.sv`は物理addressを各BASE/RANGEと比較し、region selectを作る。`uncore.sv`はそのvectorをRAM、boot ROM、external memory、APB bridgeなどへ分解する。

二領域が重なると、複数selectが同時に1になり、read dataのOR MUXやready logicが壊れる。未割当領域ではHSELNoneDを使いbusを固めない設計になっているが、返す値やerror方針は仕様として確認する。新領域を足したら、BASE、終端、隣接境界、未選択、重複をtestする。

### 18.5 AHBからAPBへの変換

APBはsetupとaccessの二phaseで、周辺回路向けに単純化されている。`ahbapbbridge.sv`はAHB transferを受け、setup cycleでPSELとaddress/controlを出し、access cycleでPENABLEを1にする。peripheralがPREADYを返すまでaccessを保持し、完了をAHBのHREADYへ返す。

transfer成立は`PSEL && PENABLE && PREADY`である。PREADY=0のcycleにもPSELとPENABLEは1のままなので、side effectを`PSEL && PENABLE`だけで起こすと同じwriteを複数回実行する。周辺register更新、FIFO push、clear-on-readは完了eventへ結び付ける。

### 18.6 外部APB portの設計意図

固定版は、RasterIX固有のportを`wallypipelinedsoc`へ直接多数追加せず、一般的な外部APB interfaceを一組出す。`uncore.sv`はPADDR、PWDATA、PSTRB、PWRITE、PENABLE、PSELを外へ出し、PRDATAとPREADYを受ける。

この境界により、Wally coreとuncoreは特定deviceの内部command形式を知らない。board topまたはadapterがAPBをRasterIX command streamへ変換する。将来別のAPB peripheralを接続できるが、同時に複数deviceを置くなら外側にdecoderまたはbusを追加する必要がある。

### 18.7 RasterIX adapterが守る三つの契約

第一はAPB契約である。aligned 32 bit access、PREADYによる待機、read data、side effectの成立cycleを守る。第二はcommand stream契約である。data、valid、ready、TLASTの順序を守る。第三はclock domain crossing契約である。20 MHz側で成立したwordを100 MHz側へ順番どおり一度だけ渡す。

非同期FIFOは三契約のうちCDCとbufferingを担当する。APB handshakeを正しく作る責任や、RasterIX command packetの意味までは自動で保証しない。層を分けてassertionとtestbenchを置く。

### 18.8 register mapはhardwareとsoftwareのABIである

RasterIX adapterはoffset 0x00をcommand word、0x04をTLAST付きcommand、0x08をstatus、0x0cをID、0x10をswap count、0x14をacknowledged framebuffer addressとしている。offset、幅、read/write、side effect、reset値はC++とRTLの双方が共有するABIである。

ID `0x52495831`を最初に読むことで、間違ったbitstreamまたはaddressを早く検出する。ID一致はcommand path全体の動作証明ではないが、少なくともCPU load、address decode、APB read、adapter read dataの往復を確認するcanaryになる。

### 18.9 周辺回路を追加する完全な影響範囲

新しいperipheralを追加する場合、次を確認する。

| 領域 | 必要な設計 |
|---|---|
| address | BASE、RANGE、重複検査、PMA属性 |
| RTL | interface、register/FIFO、reset、error、interrupt |
| bus | APB/AHB protocol、wait、幅、byte strobe |
| clock | domain、CDC、generated clock constraint |
| board | pin、I/O standard、外部device timing |
| OS | device tree、reserved memory、driverまたはmapping |
| application | API、ordering、timeout、error処理 |
| verification | unit、bus、CDC、SoC、timing、実機 |

「uncoreへmoduleを一個置いた」だけではsystem integrationは完了しない。この表の各行にsourceと試験を一つずつ対応させる。

### 18.10 開発者としての読解課題

`WallyBusConnector::writeData`の一回の`regs[0]=data[i]`を選び、次を説明する。

1. compilerが生成するstore命令とaddress。
2. U-mode page tableから物理addressへの変換。
3. LSUのuncached accessとEBUの仲裁。
4. AHB address/data phase。
5. uncore decoderとAHB-APB bridge。
6. APB完了条件とPREADY wait。
7. async FIFOへのpush。
8. RasterIX側のvalid/ready transfer。
9. どの段階までをstore命令完了が保証するか。
10. 描画またはdisplay swap完了を別にどう観察するか。

これを説明できれば、softwareの一行とhardwareの信号を別世界として扱わず、一つのsystem動作として追えている。
