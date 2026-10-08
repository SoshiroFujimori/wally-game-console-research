# 実演と再ビルド

この資料は実験記録であり、CVWリポジトリに追加するファイルではない。採用・実機確認の成否は同梱の`checks/finalhdmi-acceptance.json`と`checks/canonical-adoption-finalhdmi.json`を参照する。作成時のプログラムmanifestにある`hardwareTested: false`はビルド時点の状態であり、その後の実機結果を上書きしたものではない。

## 今回使用した構成

- リポジトリ：`/path/to/wally-game-console`、main。
- FPGA：Nexys Video、Wally 20 MHz、DDR3 512 MiB。
- ゲーム：640×480。HDMIは1280×720、ゲームを縦横1.5倍にし、左右160画素の黒帯を挿入する。
- WindowsのOBS：キャプチャ入力1280×720 YUY2。1920×1080のキャンバスに縦横1.5倍で配置する。デスクトップを取り込まない。
- 公式RasterIX：`9fdcf97a31b2e4247594e06d605871980cd5e9e1`。
- 公式hdl-util/hdmi：`83b1c9543a91b776671a44e68e130f81cae437b7`。

## 基板のLinuxでゲームを起動する

試験時はSDカード上の圧縮プログラムを読み取り専用で取り込み、`/tmp`で展開した。ゲーム実行中はSDカードをアンマウントしている。基板上のLinuxが動いている場合、UART端末から次を実行する。

```sh
/tmp/final-game-v2-rasterix-breakout --demo --seconds 80
```

操作する場合は次を使う。

```sh
/tmp/final-game-v2-rasterix-breakout
```

| 入力 | 動作 |
|---|---|
| A / D | 左 / 右へ動き続ける |
| S | 移動を止める |
| Space | ボールを発射する |
| R | ゲームを最初からやり直す |
| M | 自動操作を切り替える |
| Q | 終了する |

キーを離しても移動は続く。UARTから受け取るのはキー入力の文字であり、PC上の通常のゲームのようなキーを離した通知ではない。今回の操作試験はこの仕様に対するもの。人が遊んだ際の操作感やWiiコントローラーの試験は含まない。

WSLでUARTを開く場合のコマンドは次のとおり。自動試験が動作している間は、同じUARTを同時に開かない。

```sh
picocom -b 115200 /dev/serial/by-id/usb-FTDI_FT232R_USB_UART_UART_SERIAL-if00-port0
```

`/tmp`のプログラムは基板の再起動で消える。同梱の`programs/rasterix-breakout.gz`とSHA-256を使い、既存のSD経路で読み込む。別のPCのディスク番号を流用するような一括書き込みコマンドは用意していない。

## FPGAの再ビルド

今回の変更を反映したリポジトリで、通常のターゲットを使う。

```sh
cd /path/to/wally-game-console
source ./setup.sh
source /home/researcher/AMD/2025.2/Vivado/settings64.sh
make -C fpga/generator nexysvideo-rasterix
```

`setup.sh`の`WALLY`設定は変更していない。新しいHDMI依存は現時点ではチェックアウトと`.gitmodules`を用意した状態で、gitlinkをステージする操作は保留している。まだ公開済みのmainをクローンするだけでは、この未コミットの変更は取得できない。

生成されるbitstreamは`fpga/generator/WallyFPGA.runs/impl_1/fpgaTop.bit`。再ビルドした場合は、以前の測定済みbitstreamと同じ結果だと仮定せず、タイミング報告と出力を確認する。今回実機で検証したbitstream自体は同梱の`hardware/fpgaTop.bit`にある。

`IP/videoclock.log`は`videoclock.tcl`に依存するため、Tclの更新は通常のmakeで再生成の対象になる。`rasterixmem.tcl`は`wally.tcl`から毎回読み込まれる。今回の配置配線は既存の生成済みIPを引き継いだ外部のビルドディレクトリで行っており、すべてのIPを一から再生成した試験ではない。

## ゲームの再ビルド

使用したコンパイラーとオプションは`programs/manifest.json`に記録した。現環境で同じ設定を使用する場合は次のとおり。出力はリポジトリの外に置く。

```sh
cmake -S /path/to/wally-game-console/examples/rasterix \
  -B /path/to/research/experiments/breakout-local-build \
  -DCMAKE_BUILD_TYPE=Release \
  -DCMAKE_C_COMPILER=/home/researcher/cvw/linux/buildroot/output/host/bin/riscv64-buildroot-linux-gnu-gcc \
  -DCMAKE_CXX_COMPILER=/home/researcher/cvw/linux/buildroot/output/host/bin/riscv64-buildroot-linux-gnu-g++ \
  '-DCMAKE_C_FLAGS=-march=rv64gc -mabi=lp64d' \
  '-DCMAKE_CXX_FLAGS=-march=rv64gc -mabi=lp64d' \
  '-DCMAKE_CXX_FLAGS_RELEASE=-O3 -DNDEBUG -g' \
  -DRIX_BUILD_NATIVE=OFF -DRIX_BUILD_EXAMPLES=OFF \
  -DRIX_BUILD_SHARED_LIBRARY=OFF -DRIX_BUILD_TESTS_SOFTWARE=OFF \
  -DRIX_BUILD_TESTS_VERILATOR=OFF -DRIX_ENABLE_SPDLOG=OFF
cmake --build /path/to/research/experiments/breakout-local-build --target rasterix-breakout rasterix-demo -j 4
```

絶対パスやビルド情報が変わると実行ファイルのハッシュが変わる場合がある。測定で使用したファイルそのものを確認したい場合は同梱の実行ファイルとmanifestを使う。

## 映像取得とPCの操作

録画はOBS WebSocketを通してFPGAのDirectShow入力を取得する。OBSはトレイに置いたままで、ウィンドウのクリック、前面への切り替え、キーボード入力、デスクトップの撮影は使用しない。録画後の解析に使うWindows子プロセスもウィンドウを作らず起動する。

認証情報を含むローカルのOBS接続ヘルパーとOBSプロファイルは、この成果資料に含めていない。再利用時は自分の環境の認証を設定する必要がある。CPU負荷やファイル書き込みは発生するが、PCの入力操作を占有する方法ではない。
