# SDWire3を研究用PCから操作する

SDWire3は、1枚のSDカードを開発用PCとFPGAのどちらへ接続するか切り替える道具です。
ゲーム機に必要な回路機能ではありません。製品リポジトリには専用処理を追加しません。

## 準備と対象の確認

Ubuntu側に `sdwire` コマンド、Windows側に `usbipd-win` が必要です。
Windowsの共有設定には管理者権限が必要な場合があります。このリポジトリは
権限の昇格、UACの無効化、管理者タスクの登録を自動で行いません。

Ubuntuで `sdwire list`、`sdwire state`、
`lsblk --paths -o PATH,TYPE,SIZE,MODEL,SERIAL,TRAN,MOUNTPOINTS` を確認します。
制御インターフェースのserial、カードリーダーの識別子、ディスクのパスは別物です。
元の実験機器の値は公開していません。自分の機器の値を引数で指定してください。

## 切り替え

```bash
python3 tools/sdwire3/switch.py state --serial CONTROL_SERIAL --execute
python3 tools/sdwire3/switch.py host --serial CONTROL_SERIAL
```

2行目は予定を表示するだけです。FPGA側のSDアクセスを停止し、ファイルシステムを
アンマウントしたことを確認してから `--target-quiesced --execute` を追加します。
単にゲームプログラムを終了しただけでは、LinuxのSDアクセスが停止したことにはなりません。
当時の実験では、ターゲットのSDアクセスを止める専用手順を用いています。

PC側での書き込み後はアンマウントし、対象ディスクを明示して戻します。

```bash
python3 tools/sdwire3/switch.py target --serial CONTROL_SERIAL \
  --reader-device /dev/disk/by-id/READER_ID --target-quiesced --execute
```

このツールは指定ディスクがUSB接続で、子パーティションを含めてマウントされていないことを
確認します。SDカードのフォーマットやファイル書き込みは行いません。
カードの切り替えだけでFPGA側の停止が確認できるわけではありません。

## Windows側の共有ドライバーを復旧する

`usbipd list` と `usbipd state` で対象を確認します。次は計画表示です。

```powershell
.\tools\sdwire3\recover-reader.ps1 -DeviceInstanceId 'USB\VID_0BDA&PID_0316\READER_SERIAL'
```

対象を再確認し、ターゲット側のSDアクセスを停止した後に、必要な権限のPowerShellから
`-TargetQuiesced -Execute` を付けます。通常の接続に失敗した場合に限り、
明示的に `-AllowForcedBind` を指定できます。接続中のリーダーは操作しません。

## 保存した処理との違い

`archive/` は実験当時の復旧スクリプトを匿名化した記録です。
元の機器を特定する部分はプレースホルダーであり、そのまま実行する対象ではありません。
上のパラメータ化したツールは引数・対象確認のテストを実施していますが、
公開資料を作る今回の作業で実機を再切り替えしたわけではありません。

