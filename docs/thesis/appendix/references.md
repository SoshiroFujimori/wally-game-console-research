<!-- appendix-content:start -->
<a id="h3417"></a>
# 参考文献と実験記録
<!-- appendix-content:end -->

[付録の総目次](../技術付録.md) ｜ [論文本文](../本文.md) ｜ [参考文献](references.md)

ファイルパスの表記は、[資料フォルダー](../README.md)を基準とする。

## このページの目次

- [外部資料と公開ソース](#h3419)
- [本研究で保存した実験記録](#h3441)

<!-- appendix-content:start -->
本文では、著者名や資料の略称と年などからなる参照記号を角括弧で示す。例えば[Harris26](#ref_harris26)はHarrisらの2026年の書籍を指す。刊行年を確認できない継続更新の資料では、年を推測して記号へ付けず、資料名と版の識別情報を示した。ソースの版は記載したコミットを基準とし、Webページの将来の更新とは区別する。

<a id="h3419"></a>
## 外部資料と公開ソース

<a id="ref_console26"></a>
[Console26] 研究者（非公開）, wally-game-console, 公開ソースコード, 2026. 基準版: d3e181ac434a01a1f174549b5fbc7ee03a8875b4. https://github.com/SoshiroFujimori/wally-game-console/tree/d3e181ac434a01a1f174549b5fbc7ee03a8875b4

<a id="ref_harris26"></a>
[Harris26] D. Harris, J. Stine, R. Thompson, S. Harris, RISC-V System-on-Chip Design, Morgan Kaufmann, 2026. ISBN 9780323994989. https://shop.elsevier.com/books/risc-v-system-on-chip-design/harris/978-0-323-99498-9

<a id="ref_nexysvideo"></a>
[NexysVideo] Digilent, Nexys Video FPGA Board Reference Manual, ボード仕様・端子・クロック・DDR3の説明. https://digilent.com/reference/_media/reference/programmable-logic/nexys-video/nexys-video_rm.pdf

<a id="ref_rasterix"></a>
[RasterIX] ToNi3141, RasterIX, ソースコードとREADME. 固定版: 9fdcf97a31b2e4247594e06d605871980cd5e9e1. RasterIX_IF.v、RenderConfigs.hpp、DisplayListDispatcher.hppなどを参照. https://github.com/ToNi3141/RasterIX/tree/9fdcf97a31b2e4247594e06d605871980cd5e9e1

<a id="ref_thompson25"></a>
[Thompson25] R. Thompson, D. Harris, J. E. Stine, S. L. Harris, “RISC-V System-on-Chip Design Textbook and Course,” 2025 ASEE Annual Conference & Exposition, 2025. DOI: 10.18260/1-2--57147. https://peer.asee.org/57147

<a id="ref_vivado25"></a>
[Vivado25] AMD, Vivado Design Suite Tcl Command Reference Guide, UG835, version 2025.2, “create_clock.” https://docs.amd.com/r/en-US/Vivado-Design-Suite-Tcl-Command-Reference-Guide-UG835/create_clock

<a id="ref_wally"></a>
[Wally] OpenHW Foundation, CORE-V Wally, ソースコードとREADME. 本研究の出発点: 2345ec2ad68d9a9073b2dfec0929ce87c90cb0ce. https://github.com/openhwfoundation/cvw/tree/2345ec2ad68d9a9073b2dfec0929ce87c90cb0ce

<a id="ref_amd085"></a>
[AMD085] AMD, AXI4-Stream Infrastructure IP Suite LogiCORE IP Product Guide, PG085, version 3.0, 2025, Clocking. https://docs.amd.com/r/en-US/pg085-axi4stream-infrastructure/Clocking

<a id="ref_amdaxi"></a>
[AMDAXI] AMD, Vivado Design Suite AXI Reference Guide, UG1037, AXI4-Streamの転送規則. https://www.amd.com/content/dam/xilinx/support/documents/ip_documentation/axi_ref_guide/latest/ug1037-vivado-axi-reference-guide.pdf

<a id="ref_amdgray"></a>
[AMDGray] AMD, Vivado Design Suite 7 Series FPGA and Zynq-7000 SoC Libraries Guide, UG953, version 2021.1, XPM_CDC_GRAY, 2021. https://docs.amd.com/r/2021.1-English/ug953-vivado-7series-libraries/XPM_CDC_GRAY

<a id="ref_amd901"></a>
[AMD901] AMD, Vivado Design Suite User Guide: Synthesis, UG901, version 2025.2, 2025. https://docs.amd.com/r/en-US/ug901-vivado-synthesis/Overview

<a id="ref_amd903"></a>
[AMD903] AMD, Vivado Design Suite User Guide: Using Constraints, UG903, version 2025.1, 2025. https://docs.amd.com/r/2025.1-English/ug903-vivado-using-constraints/About-XDC-Constraints

<a id="ref_amd906"></a>
[AMD906] AMD, Vivado Design Suite User Guide: Design Analysis and Closure Techniques, UG906, version 2025.2, 2025. https://docs.amd.com/r/2025.2-English/ug906-vivado-design-analysis/Timing-Field

<a id="ref_amd949"></a>
[AMD949] AMD, UltraFast Design Methodology Guide for FPGAs and SoCs, UG949, version 2025.2, 2025. https://docs.amd.com/r/2025.2-English/ug949-vivado-design-methodology/Using-This-Guide

<a id="ref_riscvunpriv26"></a>
[RISCVUnpriv26] RISC-V International, The RISC-V Instruction Set Manual, Volume I: Unprivileged Architecture, version 20260120, 2026. https://docs.riscv.org/reference/isa/_attachments/riscv-unprivileged.pdf

<a id="ref_riscvpriv26"></a>
[RISCVPriv26] RISC-V International, The RISC-V Instruction Set Manual, Volume II: Privileged Architecture, version 20260120, 2026. https://docs.riscv.org/reference/isa/_attachments/riscv-privileged.pdf

<a id="ref_riscvabi"></a>
[RISCVABI] RISC-V International, RISC-V ABIs Specification, calling convention、ELF、linkingの仕様. https://riscv-non-isa.github.io/riscv-elf-psabi-doc/

<a id="ref_buildroot"></a>
[Buildroot] The Buildroot Developers, The Buildroot User Manual, cross compilation、output directory、project customizationの説明. 固定版repositoryの指定は2026.02.x. https://buildroot.org/downloads/manual/manual.html

<a id="ref_linuxdt"></a>
[LinuxDT] The Linux Kernel Documentation, Linux and the Devicetree, boot時のhardware descriptionとdriver populationの説明. https://docs.kernel.org/devicetree/usage-model.html

<a id="ref_opensbi"></a>
[OpenSBI] RISC-V Open Source Software, OpenSBI Firmware with Jump Address, FW_JUMPの役割と設定. https://github.com/riscv-software-src/opensbi/blob/master/docs/firmware/fw_jump.md

<a id="ref_armaxi20"></a>
[ArmAXI20] Arm, AMBA AXI and ACE Protocol Specification, ARM IHI 0022H, 2020, A3.2.1, A3.3, A6.1. https://developer.arm.com/-/media/Arm%20Developer%20Community/PDF/IHI0022H_amba_axi_protocol_spec.pdf

<a id="h3441"></a>
## 本研究で保存した実験記録

E1〜E7は本研究の測定資料を区別する識別子であり、外部文献の著者・年を表す記号ではない。日付、条件、ログを併記し、本文の結果と対応させる。

<a id="ref_e1"></a>
[E1] Wally / official RasterIX integration current qualified results、2026年9月9日。再現資料/実験記録/E1/RESULTS.md。対応するtest-apb.log、test-display.log、reset-test.log、hardware-results.json、timing_summary.rpt。

<a id="ref_e2"></a>
[E2] コミットと追加検証、2026年9月13日。再現資料/実験記録/E2/コミットと追加検証.md。verification/board-dvi-acceptance/results.json、board-dvi-visual/result.json、hdmi-analysis.json、game-dvi.mp4。

<a id="ref_e3"></a>
[E3] 内部作業領域の容量とBRAMの余裕、2026年9月14日。再現資料/実験記録/E3/BRAM容量の確認.md、utilization-standard-dvi.rpt、utilization-hierarchical.rpt、analysis.json。

<a id="ref_e4"></a>
[E4] WallyとRasterIXによる2Dゲームの成果、2026年9月11日。再現資料/実験記録/E4/report/成果と検証範囲.md、METHODS.md、plans/controlled-finalhdmi.json、wait-finalhdmi.json、対応する試行のframes.csvとresult.json。実験用720p HDMI構成。

<a id="ref_e5"></a>
[E5] 描画準備時間の原因を分ける実験、2026年9月10日。再現資料/実験記録/E5/results-ja.md、technical-results.md、METHODS.md、cases.csv、analysis.json。

<a id="ref_e6"></a>
[E6] FIFO接続方式の比較と公式更新後の検証、2026年10月8日。再現資料/実験記録/E6。主比較90回、再書き込み後18回、通常版の新規生成と実機検証。report/結果と判断.md、report/results/runs.csv、board-v2、board-reconfiguration、fresh-product/qualification/qualification.json、report/results/video/validation.json、命令解析回路の単体再現試験。

<a id="ref_e7"></a>
[E7] 描画命令の転送方式と送信処理の比較、2026年10月9日。研究リポジトリのexperiments/transport-study-20261009。RESULTS.md、METHODS.md、results、results-if17、results-board。内部DMAの単体448転送、描画・テクスチャの機能モデル192条件。実機のソフトウェア比較168試行、DMAの送信方法・最小長・内訳の比較54試行、作業領域を2倍にした構成12試行。回路の配置・配線検査と、状態・転送量・完成画像の照合結果を含む。
<!-- appendix-content:end -->

---

[前：第72章 メモリから描画命令を読む方式を検証する](05-integration/command-dma-comparison.md)
