## 第35章 ソフトウェアとハードウェアの不具合を切り分ける

画面が動かないとき、ゲームが止まったのか、命令の転送が止まったのか、表示回路だけが止まったのかは、外見だけでは決められない。この章では、実行ファイルや回路の版を確かめ、途中の観察点を使って止まった場所を狭める。

### 35.1 最初に同じ版を動かしているか確かめる

診断前に、ソース commit、submodule、bitstream、DTB、kernel、rootfs、applicationを固定する。古いSD copyを動かした状態では、codeを直しても症状が変わらない。実機起動logとbinary hashを試行ごとに保存する。

![図35.1 症状から最初に異なる境界を探す診断の梯子](figs/deep-diagnosis-ladder.png)

### 35.2 hostで確認するcommand

```bash
git status --short
git rev-parse HEAD
git submodule status
file rasterix-build/rasterix-breakout
riscv64-buildroot-linux-gnu-readelf -h rasterix-build/rasterix-breakout
dtc -I dtb -O dts wally-nexysvideo-rasterix.dtb -o decoded.dts
```

Vivado reportではutilization、timing、クロック、CDC、DRCを保存する。build successだけでWNSやunconstrained pathを見落とさない。

### 35.3 target Linuxで確認するcommand

環境に存在する範囲で次を使う。

```bash
uname -a
cat /proc/cpuinfo
cat /proc/iomem
cat /proc/interrupts
dmesg | tail -n 100
sha256sum ./rasterix-breakout
```

BusyBox構成では一部commandやoptionがない場合がある。command不在をハードウェア failureと解釈せず、rootfs configを確認する。

### 35.4 UART logの読み方

UARTはboot初期から使え、画面が出ない場合にも役立つ。logへtimestampまたは段階名を入れ、ZSBL、OpenSBI、kernel、applicationを区別する。binary dataや大量traceを低速UARTへ出すとsystem timingを大きく変える。

文字化けはbaud、input クロック、data bit、parity、line endingを確認する。何も出ない場合はTX pin、USB port、リセット、bitstream、terminal deviceの順に分ける。

### 35.5 register canary

ID レジスタ readは小さいend-to-end testである。期待値が返れば、プロセス mapping、MMU、LSU、bus、decoder、APB read、adapterの一部が通った。次にstatus、単一command、frame countへ段階を進める。

ID不一致でtriangle codeを直しても意味がない。最初に失敗した境界より後の処理をいったん候補から外す。

### 35.6 waveformとsoftware logを時刻で結ぶ

simulationまたはILAではAPB handshake、FIFO write/read、AXI stream、DDR request、swap handshakeを見る。ソフトウェア logにはcommand sequence番号やframe countを出す。共通counterまたはtrigger eventで両者を対応付ける。

logic analyzerを入れるとresourceとtimingが変わることがある。debug buildの結果をproduction buildの性能値として使わず、観察用構成を明記する。

### 35.7 error injection

PREADYを数周期下げる、FIFOを小さくする、TLASTを一度欠かす、DTB 番地を意図的にずらすなど、制御されたfaultを入れるとerror detectionを確認できる。元ソースと実験branchを分け、必ず戻せるようにする。

timeoutが働くか、silent dropしないか、リセット後に回復するか、error messageが原因段を示すかを見る。正常caseだけの試験ではbackpressureやrecoveryは確認できない。

### 35.8 assertionとsoftware invariant

ハードウェアでは「FIFO full時にwriteしない」「valid中readyまでdataを保持」「APB writeは一回だけpush」などをassertionにする。ソフトウェアではbuffer index、sizeの4 byte alignment、番地 range、context lifetimeをcheckする。

両側の検査は重複ではない。ハードウェアは悪いソフトウェアからも内部整合を守り、ソフトウェアはerrorを早く説明可能にする。

### 35.9 診断記録の書式

一試行ごとに、目的、固定版、変更一つ、予想、command、入力、観察、結果、artifact pathを書く。成功画像だけでなく、UART log、counter、report、hashを保存する。予想と異なった結果も削除せず、次の仮説の根拠にする。
