<!-- appendix-content:start -->
<a id="ch_22"></a>
# 第29章 Linuxのプロセスと仮想メモリとシステムコール
<!-- appendix-content:end -->

[付録の総目次](../../技術付録.md) ｜ [論文本文](../../本文.md) ｜ [参考文献](../references.md)

[第III部 Linuxとシステムソフトウェア](README.md)

ファイルパスの表記は、[資料フォルダー](../../README.md)を基準とする。

## このページの目次

- [29.1 processが見るaddressと物理address](#s_22_1)
- [29.2 virtual memoryの目的](#s_22_2)
- [29.3 kernel modeへ入る三つの経路](#s_22_3)
- [29.4 file descriptorとdevice](#s_22_4)
- [29.5 page faultは常にbugではない](#s_22_5)
- [29.6 schedulingとgameの時間](#s_22_6)
- [29.7 signalと終了処理](#s_22_7)

<!-- appendix-content:start -->
Linuxは複数のプログラムをそれぞれ独立した実行単位として管理する。その単位がプロセスである。この章では、一つのプロセスが使う番地やファイルが何を指すかを説明してから、OSの処理を呼ぶシステムコールへ進む。

<a id="s_22_1"></a>
## 29.1 processが見るaddressと物理address

U-mode プロセスのポインタは仮想番地である。MMUはpage tableとTLBを使い、物理pageへ変換する。同じ仮想番地を別プロセスが使っても、別物理pageへ対応できる。kernelはプロセスごとに番地 space、レジスタ、ファイル descriptorなどを管理する。

![図29.1 user pointerからpage tableとMMIO物理pageへの対応](../../figs/deep-virtual-mmio.png)

<a id="s_22_2"></a>
## 29.2 virtual memoryの目的

virtual メモリは、プロセス間の隔離、連続した番地空間、共有、copy-on-write、ファイル mapping、permissionを提供する。page単位でread/write/execute/userなどを設定する。CPUのTLBは最近の変換をキャッシュし、miss時にpage tableをたどる。

番地変換があるからプログラムはハードウェアから完全に独立するわけではない。device MMIOをmappingすれば、そのvirtual pageへのload/storeが物理deviceへ届く。mappingのキャッシュ属性とpermissionを正しく選ぶ必要がある。

<a id="s_22_3"></a>
## 29.3 kernel modeへ入る三つの経路

U-modeからS-modeへは主にsystem call、exception、interruptで入る。system callはECALL、exceptionはpage faultやillegal instruction、interruptはtimerやexternal deviceである。kernelはtrap frameへレジスタを保存し、原因を判定する。

system callはfunction callと違いprivilege boundaryを越える。argument検査、ポインタのuser access、schedulerによるcontext switchが起こり得る。`open`や`mmap`はsystem callだが、mapping後の各MMIO storeは通常kernel functionを毎回呼ばない。

<a id="s_22_4"></a>
## 29.4 file descriptorとdevice

Linuxではregular ファイル、terminal、deviceなどをファイル descriptorで表す。`open("/dev/mem", O_RDWR | O_SYNC)`は物理 メモリ accessを提供するcharacter deviceを開く。成功には通常root権限とkernel設定が必要である。

ファイル descriptor自体は番地ではない。`mmap`が指定物理 offsetのpageをプロセス virtual 番地へ対応付け、その戻りポインタを使ってload/storeする。`close(fd)`後もmappingは`munmap`するまで残るため、固定版constructorはmmap後にfdを閉じられる。

<a id="s_22_5"></a>
## 29.5 page faultは常にbugではない

プロセスがまだmappingされていない合法virtual pageへ初めてaccessすると、demand pagingのためpage faultが起き、kernelがpageを用意して再実行することがある。permission違反や存在しない番地ならSIGSEGVになる。

MMIO mappingでSIGBUSまたはmachine checkになる場合は、物理 region、access width、ハードウェア responseを調べる。virtual ポインタ値だけを見てdevice 物理 番地だと思わない。`/proc/<pid>/maps`とpage offsetを確認する。

<a id="s_22_6"></a>
## 29.6 schedulingとgameの時間

Linuxは複数プロセスをtime sliceで実行する。20 MHzのsingle-core Wallyでは、kernel workやinterruptがgameを中断する。`steady_clock`で測るwall timeには、そのプロセスが実行されていない時間も含まれる。

CPU time、wall time、frame completion intervalを区別する。game simulationは固定60 Hz tickをaccumulateし、render回数が減ってもsimulation stepを飛ばさない設計になっている。これは描画throughputとgame speedを分離する。

<a id="s_22_7"></a>
## 29.7 signalと終了処理

Ctrl-Cはterminal driverからSIGINTをプロセスへ送る。固定版handlerは`sig_atomic_t` flagだけを更新し、main loopが安全な場所で終了する。信号 handler内で複雑なC++処理や非async-signal-safe functionを呼ばない。

正常終了と信号終了の両方でRasterIX context、device、mappingを正しい順序で破棄する。強制電源断ではdestructorが走らないため、ハードウェア側も次回起動時に初期化できる設計が必要である。
<!-- appendix-content:end -->

---

[前：第28章 SDカードからLinuxが起動するまで](boot-chain.md) ｜ [次：第30章 デバイスツリーで回路の情報をLinuxへ伝える](device-tree.md)
