# Nexys Video版Wallyの追加実機試験

2026-09-09追記：その後の依頼に基づき、SDWire3を用いた遠隔実機試験をアシスタントが実施しました。CoreMark 2条件、DDR3の256 MiB・16 MiB試験、SDの書き込み・読み戻し、FPGA再構成からの起動3回が合格しました。実測結果・ログは [remote-20260909/RESULTS.md](remote/RESULTS.md) を参照してください。以下は当初提案した手動試験手順です。遠隔でのFPGA再構成による起動試験は、以下の「電源OFF→ON」と区別して記録しています。本体電源の入れ直しと全スイッチ位置の確認は、アシスタントによる遠隔試験では実施していません。

このディレクトリはCVWリポジトリの外にある、一時的な試験用ディレクトリです。試験ツール、ソース、手順、ログをまとめて置き、コミットには含めません。

対象は現在の20 MHz・512 MiB DDR3のWally単体構成です。RasterIX、映像出力、ゲームコントローラーは試験対象に含みません。

## 今回の合格基準

| 試験 | 実施内容 | 合格条件 |
| --- | --- | --- |
| 電源投入後の起動 | 電源OFF→ON→同じbitstreamを書き込み、3回確認 | 毎回Linuxにrootでログインでき、`info`が`INFO_PASS`を出す |
| スイッチ入力 | 全OFF、SW0～SW7を1本ずつON、全ON、全OFF | `SWITCHES_PASS`が出る |
| メモリの広い範囲 | 256 MiBを確保・ロックし、アドレス、乱数、連番、8/16ビット書き込みを1周 | `WIDE_PASS`が出る |
| メモリの各種パターン | 16 MiBを確保・ロックし、memtesterの全パターンを1周 | `PATTERNS_PASS`と最後の`MEMORY_PASS`が出る |

3回、256 MiB、16 MiBは今回の初期動作確認のために提案した条件で、CVW公式の合格基準ではありません。既に確認したLEDの0x55、0xaa、消灯の試験は再実施不要です。

## 1. SDカードに試験ファイルを追加する

1. 現在のpicocomを **Ctrl+A → Ctrl+X** で終了する。
2. Nexys Videoの電源を切る。
3. microSDを取り出し、PCのカードリーダーに挿す。Windowsがフォーマットを提案したらキャンセルする。
4. 管理者PowerShellでカードリーダーをWSLに接続する。前回のログにあった同じリーダーは `1908:0226`。現在接続した機器を `usbipd list` で確認する。

```powershell
usbipd list
usbipd bind --hardware-id 1908:0226
usbipd attach --wsl Ubuntu --hardware-id 1908:0226
```

既にSharedならbindは不要、既にAttachedならattachも不要です。違うリーダーを使う場合は、その機器のIDを確認してください。

5. **WSL Ubuntuの端末**で実行する。

```bash
sudo python3 /path/to/research/experiments/install-to-sd.py
```

このスクリプトはUSB接続のディスクから、4つのパーティション名と、device tree・OpenSBI・Linuxの内容が今回の記録に一致するカードを探します。候補がちょうど1枚のときだけ、第4パーティションへ `nexys-video-tests` フォルダーを追加します。コピー先を再マウントしてSHA-256を照合し、起動用データが変わっていないことも確認します。フォーマットやパーティションの作り直しは行いません。

最後に次の表示が出たら、カードはアンマウント済みです。

```text
SD_INSTALL_PASS: package verified after remount; boot images unchanged; card unmounted.
```

`Found 0 matching cards` の場合は、WSLへのカードリーダー接続状態と `lsblk -o NAME,SIZE,MODEL,TRAN,PARTLABEL,FSTYPE,MOUNTPOINTS` を確認します。エラー時に `flash-sd.sh` を実行する必要はありません。候補が複数ある場合は、確認したディスク名を引数に指定できます。

6. カードをPCから取り出し、電源を切ったNexys Videoへ戻す。

## 2. 電源投入後の起動を確認する（1回目）

1. Nexys Videoの電源を入れる。
2. Windows側の `usbipd list` で、JTAGとUARTがAttachedであることを確認する。再接続が必要な場合のみ実行する。

```powershell
usbipd attach --wsl Ubuntu --hardware-id 0403:6010
usbipd attach --wsl Ubuntu --hardware-id 0403:6001
```

3. **WSL Ubuntuの端末**で、ログ保存付きのpicocomを開始する。

```bash
bash /path/to/research/experiments/console.sh cold-1
```

既存のpicocomがポートを使用中なら、終了を求めるメッセージが出ます。そのセッションをCtrl+A → Ctrl+Xで閉じてから再実行してください。

4. VivadoのHardware Managerでターゲットに接続し、次のファイルをProgram Deviceで書き込む。

```text
/path/to/wally-game-console/fpga/generator/WallyFPGA.runs/impl_1/fpgaTop.bit
```

期待するSHA-256は `0d562f25ea7ab34ca70d2b87fee9ff53cd4f8f10ff49da2d99291e496b828c3d` です。FPGAの再ビルドは不要です。

5. CPU RESETを押さずにLinuxのloginが出ることを確認し、`root` でログインする。起動しない場合は、その回を不合格としてログを残す。リセットして起動できても、その結果で電源投入試験の成功を置き換えない。
6. **picocom内の、ボード上Linuxの `#` プロンプト**で実行する。

```sh
mkdir -p /mnt/nexys-test
mount -t ext4 -o ro /dev/mmcblk0p4 /mnt/nexys-test
sh /mnt/nexys-test/nexys-video-tests/board-tests.sh info
```

ファイルのSHA-256、ボード名、Linuxのメモリ容量、SDの存在を確認し、最後に `INFO_PASS` と出れば合格です。

以前からある `/sbin/ifup` とcronのディレクトリ不足のメッセージはLinuxイメージ側の既知の起動設定の問題として記録します。この試験で修正したことにはしません。SD読み出しエラー、新しいkernel panic、予期しない再起動や停止があればログを確認する必要があります。

## 3. スイッチを全て確認する

ボードの `#` プロンプトで実行する。

```sh
sh /mnt/nexys-test/nexys-video-tests/board-tests.sh switches
```

英語の表示に従ってスイッチを動かし、その都度Enterを押します。

- `Set ALL switches OFF`：すべてOFF。
- `Set ONLY SW0 ON (all others OFF)`：SW0だけON。他の番号も同様。
- `Set ALL switches ON`：すべてON。

各段階で実際の値を読み、期待値と自動照合します。最後の `SWITCHES_PASS` が合格です。不一致のときはその場で停止し、値を表示します。

## 4. DDR3の読み書きを確認する

ボードの `#` プロンプトで実行する。

```sh
sh /mnt/nexys-test/nexys-video-tests/board-tests.sh memory
```

256 MiBの試験、16 MiBの全パターン試験が順番に実行されます。20 MHzの実機での所要時間は未測定で、長時間になる可能性があります。進捗表示の更新を見ながら待ってください。Ctrl+Cで中断できますが、中断は未完了として扱います。

合格には、終了コード0に加えて、指定量を確保・ロックしたことが必要です。スクリプトはこの条件を確認します。メモリ不足やロック失敗による試験範囲の縮小を合格として扱いません。最後は次の順に表示されます。

```text
WIDE_PASS
PATTERNS_PASS
MEMORY_PASS
```

詳しいログはボードの `/tmp/nexys-video-memory-...` と、PCのUARTログに残ります。ボードの `/tmp` は電源を切ると消えるので、結果の保存にはPC側のログを使います。

## 5. 電源投入後の起動を、あと2回確認する

1回目の試験が終わったら、ボードで実行する。

```sh
umount /mnt/nexys-test
sync
```

picocomをCtrl+A → Ctrl+Xで終了し、Nexys Videoの電源を切ります。数秒待ってから入れ直し、手順2を繰り返してください。ログのラベルをそれぞれ変更します。

```bash
bash /path/to/research/experiments/console.sh cold-2
```

```bash
bash /path/to/research/experiments/console.sh cold-3
```

各回でFPGAの再書き込み、rootログイン、SDの読み取り専用マウント、`info` を確認します。スイッチ・メモリ試験は1回目で合格していれば、2回目と3回目には繰り返しません。

## 結果の渡し方と、言える範囲

PC側のログは `/path/to/research/experiments/logs/` に保存されます。cold-1、cold-2、cold-3を含むログをこのタスクに渡してください。日時とプロセス番号を含む名前なので、以前のログを上書きしません。

この試験で確認するのは、現在の構成での起動の再現性、スイッチ入力、Linuxから使うメモリ経路です。512 MiBの全物理アドレスの網羅、すべての温度・電源条件での保証、ゲームの描画性能を測定したことにはなりません。Linux用に予約された領域はmemtesterの対象外です。キャッシュを含む通常のメモリ経路で試験します。

memtester 4.7.1の作者のソースを変更せず、現在のBuildrootのRISC-Vツールチェーンでビルドしています。広い範囲の試験のマスクは `0x18081`、全パターン試験はマスク未指定です。試験の選択、メモリ確保、ロック、終了コードの意味は同梱の `source/memtester-4.7.1/memtester.8` と [memtesterの公式資料](https://pyropus.ca/software/memtester/) に基づきます。

ホスト側では、ソース配布物のSHA-256、RISC-V ELFと既存LinuxのABIの一致、シェル構文、SD選択の拒否条件、ネイティブ版memtesterの1 MiB・全パターン1周を確認済みです。その後のSDへのコピーと実機試験の結果は、冒頭の遠隔試験記録を参照してください。
