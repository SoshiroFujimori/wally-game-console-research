## 第23章 CPUから周辺回路までの接続

CPU内部の計算結果が周辺回路へ届くまでには、要求を選ぶ仲裁、番地による行き先の選択、通信手順の変換がある。この章では一回の周辺レジスタ書込みを追い、CPU、バス変換、追加回路の境界を示す。

### 23.1 coreとuncoreの境界

`wallypipelinedcore.sv`の外側には一組のAHB-Lite master interfaceがある。IFUとLSUはそれぞれ要求を持つが、EBUが仲裁し、core外へ一つのbusとして出す。`wallypipelinedsoc.sv`はcoreとuncoreを実体化し、board topはその外でDDR controllerやRasterIXへつなぐ。

uncoreは「重要でない外側」という意味ではない。boot ROM、RAM、CLINT、PLIC、UART、GPIO、SPI、SD controller、PWM、外部メモリ、外部APB interfaceを持ち、CPUがsystemとして動くためのハードウェアを提供する。

![図23.1 IFUとLSUからAHBとAPBを経て周辺registerへ届く一transfer](figs/deep-bus-transaction.png)

### 23.2 EBUの仲裁

IFUは命令fetch、LSUはload/storeまたはpage table walkのメモリ requestを出す。同じ外部busを同時に使えない場合、EBUはpriorityとownershipを決める。選ばれなかった側はreadyが戻るまでstallする。

仲裁では要求を途中で切り替えない。AHBの番地 phaseとdata phaseが重なるため、現在のresponseがどのmasterの要求かを保持する。HREADYが0の間にowner、番地、controlを変えると別要求のresponseとして解釈する危険がある。

### 23.3 AHB-Liteの一transfer

masterは番地、HTRANS、HWRITE、HSIZEなどを番地 phaseへ出す。次周期のdata phaseでwrite dataまたはread dataとresponseを扱う。slaveはHREADYを0にしてwait stateを追加できる。番地 phaseとdata phaseがパイプラインされるため、現在busに見える番地と、返っているread dataが同じtransferとは限らない。

`uncore.sv`は番地 decoderのselectをレジスタへ保存する。commentにあるように、response MUXのselectはdata phaseの要求に対応しなければならず、wait中は古いselectを保持する。これは単なる一周期遅延ではなく、protocolのphase対応を守る状態である。

### 23.4 address decodeと重複

`src/mmu/adrdecs.sv`は物理番地を各BASE/RANGEと比較し、region selectを作る。`uncore.sv`はそのvectorをRAM、boot ROM、external メモリ、APB bridgeなどへ分解する。

二領域が重なると、複数selectが同時に1になり、read dataのOR MUXやready logicが壊れる。未割当領域ではHSELNoneDを使いbusを固めない設計になっているが、返す値やerror方針は仕様として確認する。新領域を足したら、BASE、終端、隣接境界、未選択、重複をtestする。

### 23.5 AHBからAPBへの変換

APBはsetupとaccessの二phaseで、周辺回路向けに単純化されている。`ahbapbbridge.sv`はAHB transferを受け、setup 周期でPSELとaddress/controlを出し、access 周期でPENABLEを1にする。peripheralがPREADYを返すまでaccessを保持し、完了をAHBのHREADYへ返す。

transfer成立は`PSEL && PENABLE && PREADY`である。PREADY=0の周期にもPSELとPENABLEは1のままなので、side effectを`PSEL && PENABLE`だけで起こすと同じwriteを複数回実行する。周辺レジスタ更新、FIFO push、clear-on-readは完了eventへ結び付ける。

### 23.6 外部APB portの設計意図

固定版は、RasterIX固有のportを`wallypipelinedsoc`へ直接多数追加せず、一般的な外部APB interfaceを一組出す。`uncore.sv`はPADDR、PWDATA、PSTRB、PWRITE、PENABLE、PSELを外へ出し、PRDATAとPREADYを受ける。

この境界により、Wally coreとuncoreは特定deviceの内部command形式を知らない。board topまたはadapterがAPBをRasterIX command streamへ変換する。将来別のAPB peripheralを接続できるが、同時に複数deviceを置くなら外側にdecoderまたはbusを追加する必要がある。

### 23.7 RasterIX adapterが守る三つの契約

第一はAPB契約である。aligned 32 bit access、PREADYによる待機、read data、side effectの成立周期を守る。第二はcommand stream契約である。data、valid、ready、TLASTの順序を守る。第三はクロック domain crossing契約である。20 MHz側で成立したwordを100 MHz側へ順番どおり一度だけ渡す。

非同期FIFOは三契約のうちCDCとbufferingを担当する。APB handshakeを正しく作る責任や、RasterIX command packetの意味までは自動で保証しない。層を分けてassertionとtestbenchを置く。

### 23.8 register mapはhardwareとsoftwareのABIである

RasterIX adapterはoffset 0x00をcommand word、0x04をTLAST付きcommand、0x08をstatus、0x0cをID、0x10をswap count、0x14をacknowledged framebuffer 番地としている。offset、幅、read/write、side effect、リセット値はC++とRTLの双方が共有するABIである。

ID `0x52495831`を最初に読むことで、間違ったbitstreamまたは番地を早く検出する。ID一致はcommand path全体の動作証明ではないが、少なくともCPU load、番地 decode、APB read、adapter read dataの往復を確認するcanaryになる。

### 23.9 周辺回路を追加する完全な影響範囲

新しいperipheralを追加する場合、次を確認する。

| 領域 | 必要な設計 |
|---|---|
| 番地 | BASE、RANGE、重複検査、PMA属性 |
| RTL | interface、register/FIFO、リセット、error、interrupt |
| bus | APB/AHB protocol、wait、幅、byte strobe |
| クロック | domain、CDC、generated クロック constraint |
| board | pin、I/O standard、外部device timing |
| OS | device tree、reserved メモリ、driverまたはmapping |
| application | API、ordering、timeout、error処理 |
| verification | unit、bus、CDC、SoC、timing、実機 |

「uncoreへモジュールを一個置いた」だけではsystem integrationは完了しない。この表の各行にソースと試験を一つずつ対応させる。

### 23.10 開発者としての読解課題

`WallyBusConnector::writeData`の一回の`regs[0]=data[i]`を選び、次を説明する。

1. コンパイラが生成するstore命令と番地。
2. U-mode page tableから物理番地への変換。
3. LSUのuncached accessとEBUの仲裁。
4. AHB address/data phase。
5. uncore decoderとAHB-APB bridge。
6. APB完了条件とPREADY wait。
7. async FIFOへのpush。
8. RasterIX側のvalid/ready transfer。
9. どの段階までをstore命令完了が保証するか。
10. 描画またはdisplay swap完了を別にどう観察するか。

これを説明できれば、ソフトウェアの一行とハードウェアの信号を別世界として扱わず、一つのsystem動作として追えている。
