# 対象版・出典・説明の根拠

[分野別の入口](README.md)

<!-- technical-toc:start -->
**このページの目次**

- [1 この資料で混ぜない三種類の情報](#sec-1)
- [2 ソースの版を固定する](#sec-2)
- [3 具体的な説明とソースの対応](#sec-3)
- [4 一般原理を確認する一次資料](#sec-4)
- [5 さらに深い既存資料へ戻る](#sec-5)
<!-- technical-toc:end -->

<a id="sec-1"></a>
## 1 この資料で混ぜない三種類の情報

| 種類 | 例 | 確認先 |
|---|---|---|
| 一般原理の説明 | readyとvalidが同時に1のときに受理する | 規格、各詳説の計算例 |
| 特定の実装の事実 | 通常語をオフセット0、最後の語を4へ書く | 固定版のソース |
| この研究の測定結果 | E6のAPB待ち時間 | 記録したCSV、再計算スクリプト、実験条件 |

説明用の図やPythonモデルは、一般原理を具体化するために追加した。これらを実行しても、FPGAの配線遅延や公式IPの内部回路を検証したことにはならない。

<a id="sec-2"></a>
## 2 ソースの版を固定する

| 対象 | コミットまたは記録 | 使い方 |
|---|---|---|
| 製品の公開基準版 | `cdf907bc1752b0f300e4fc70b9a51b2bae983b7f` | 本リポジトリの`console`参照。Wally用の接続とゲームの説明 |
| 上記に対応するRasterIX | `9fdcf97a31b2e4247594e06d605871980cd5e9e1` | 旧版の描画経路と既存の測定条件を読む |
| E6で反映したWally公式版 | `2064ca2bb8a88e3e3ec43753be93d00bef49345b` | E6の差分・条件と組み合わせる。単独で製品版と同一とはしない |
| E6で使ったRasterIX公式版 | `9269a01c9bd4c3342bfa70ef8e3cdd751c15c6d0` | 更新後の画素の扱い、転送問題の検証 |

E6は「サブモジュールを最新にする」だけで当時の実験構成を再現できるという記録ではない。適用した変更、実験用回路、条件を[E6の入口](../thesis/再現資料/実験記録/E6/README.md)で確認する。新しい版が公開されても、測定結果をその新しい版の結果へ読み替えない。

<a id="sec-3"></a>
## 3 具体的な説明とソースの対応

| 説明した内容 | 根拠となる実装・記録 | 読む際の注意 |
|---|---|---|
| APBの書込みとストリームの変換 | [rasterix_apb.sv](../thesis/再現資料/接続ソース/fpga/src/rasterix_apb.sv) | `PREADY`、`CommandWrite`、`CmdValid`、幅の選択をまとめて読む |
| CPUから32ビットずつ送る | [WallyBusConnector.hpp](https://github.com/SoshiroFujimori/wally-game-console/blob/cdf907bc1752b0f300e4fc70b9a51b2bae983b7f/examples/rasterix/WallyBusConnector.hpp) | CPUがメモリから直接DMA送信しているという説明にしない |
| 全体描画・一括描画・部分描画 | [BreakoutRenderer.hpp](https://github.com/SoshiroFujimori/wally-game-console/blob/cdf907bc1752b0f300e4fc70b9a51b2bae983b7f/examples/rasterix/BreakoutRenderer.hpp) | 二枚それぞれの履歴と初期化条件を確認する |
| 変更領域と重なる図形を再描画 | [BreakoutDamage.hpp](https://github.com/SoshiroFujimori/wally-game-console/blob/cdf907bc1752b0f300e4fc70b9a51b2bae983b7f/examples/rasterix/BreakoutDamage.hpp) | 消去だけで元の画像を復元できるとは限らない |
| CPUの各段と停止・無効化 | [wallypipelinedcore.sv](https://github.com/SoshiroFujimori/wally-game-console/blob/cdf907bc1752b0f300e4fc70b9a51b2bae983b7f/src/wally/wallypipelinedcore.sv)、[hazard.sv](https://github.com/SoshiroFujimori/wally-game-console/blob/cdf907bc1752b0f300e4fc70b9a51b2bae983b7f/src/hazard/hazard.sv) | 理想的な5段の例と、実際の停止条件を分ける |
| 三角形の内外と共有辺 | [旧版Rasterizer.v](https://github.com/ToNi3141/RasterIX/blob/9fdcf97a31b2e4247594e06d605871980cd5e9e1/rtl/RasterIX/Rasterizer.v)、[E6版Rasterizer.v](https://github.com/ToNi3141/RasterIX/blob/9269a01c9bd4c3342bfa70ef8e3cdd751c15c6d0/rtl/RasterIX/Rasterizer.v) | 旧版の符号判定と、更新版の`edgeInclusive`を区別する |
| 一語方式で値と確認を往復 | [command_mailbox.sv](../thesis/再現資料/実験記録/E6/scripts/command_mailbox.sv) | 実験用の設計。FIFO製品実装そのものではない |
| 三方式のAPB待ち時間 | [結果と判断](../thesis/再現資料/実験記録/E6/report/結果と判断.md)、[再計算](../thesis/再現資料/実験記録/E6/recalculate_wait.py) | 中央値の差を独立した処理区間の測定値と扱わない |

<a id="sec-4"></a>
## 4 一般原理を確認する一次資料

| 文献・仕様 | 本詳説で支える内容 |
|---|---|
| [Arm, AMBA APB Protocol Specification, IHI0024](https://developer.arm.com/documentation/ihi0024/latest/) | APBの準備段階、アクセス段階、待機と完了の条件 |
| [Arm, AMBA AXI-Stream Protocol Specification, IHI0051](https://developer.arm.com/documentation/ihi0051/latest/) | ready/validと、停止中にデータを保持する規則 |
| [AMD, AXI4-Stream Infrastructure IP Suite, PG085](https://docs.amd.com/r/1.1-English/pg085-axi4stream-infrastructure/Overview) | ストリームのクロック変換、データ保存に使うIPの役割 |
| [AMD, Vivado Synthesis, UG901: RAM HDL Coding Techniques](https://docs.amd.com/r/en-US/ug901-vivado-synthesis/RAM-HDL-Coding-Techniques) | HDLのメモリの書き方と、FPGA資源への推論の関係 |
| [RISC-V International, RV32I Base Integer Instruction Set](https://docs.riscv.org/reference/isa/unpriv/rv32.html) | load/store、整数命令、順序を指定する命令の基本。RV64固有の説明は該当する版も確認する |
| [RISC-V International, RV64I Base Integer Instruction Set, v20260120](https://docs.riscv.org/reference/isa/v20260120/unpriv/rv64.html) | 64ビットの整数レジスタ、`LW`の符号拡張、`SW`の保存幅 |
| [RISC-V International, Supervisor-Level ISA](https://docs.riscv.org/reference/isa/priv/supervisor.html) | 仮想記憶、番地変換、`SFENCE.VMA` |
| [Linux documentation, Bus-Independent Device Accesses](https://docs.kernel.org/driver-api/device-io.html) | 通常メモリと機器アクセスの違い、アクセス関数と順序 |
| [Linux documentation, DMA API HOWTO](https://docs.kernel.org/core-api/dma-api-howto.html) | CPUと機器から見える番地、DMAとキャッシュの整合 |
| [Linux documentation, Linux kernel memory barriers](https://kernel.org/doc/html/latest/core-api/wrappers/memory-barriers.html) | 順序保証とキャッシュ整合の区別 |
| [Linux documentation, RISC-V Kernel Boot Requirements and Constraints](https://docs.kernel.org/arch/riscv/boot.html) | RISC-V Linuxの起動時に満たす条件 |
| [Digilent, Nexys Video Reference Manual](https://digilent.com/reference/_media/reference/programmable-logic/nexys-video/nexys-video_rm.pdf) | ボードの機器、電源・I/O・メモリの前提 |
| [NXP, I2C-bus specification and user manual, UM10204](https://www.nxp.com/docs/en/user-guide/UM10204.pdf) | I2Cの電気的な扱いと通信手順。Wii固有の応答形式を保証する資料ではない |

仕様の最新版リンクは、実験のソース版を指定するリンクとは用途が違う。外部サイトで仕様が改訂されても、この研究で使った回路や測定条件が自動的に変わるわけではない。各章では、一般仕様だけで言えることと、実装を読まなければ言えないことを分けている。

<a id="sec-5"></a>
## 5 さらに深い既存資料へ戻る

本詳説は既存の数式の検査、RTLの検証、設計差分を要約だけで置き換えない。[技術付録](../thesis/技術付録.md)の各章から、保存したコード、テスト、出力へ進める。

一方、有限のソース調査と実験から「このゲーム機に関わる全知識を網羅した」「将来のどの変更も正しい」「任意の表示機器で動く」とは言えない。新たな設定へ変えるときには、変更した境界の前提と検証を確認し直す。
