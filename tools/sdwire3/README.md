# SDWire3を研究用PCから操作する

SDWire3は、1枚のSDカードを開発用PCとFPGAのどちらへ接続するか切り替える道具です。
ゲーム機に必要な回路機能ではありません。製品リポジトリには専用処理を追加しません。

## 準備と対象の確認

Ubuntu側に `sdwire` コマンド、Windows側に `usbipd-win` が必要です。
Windowsの共有設定には管理者権限が必要な場合があります。通常の切り替えツールは
権限を昇格しません。同じリーダーの復旧を繰り返す場合は、後述の専用タスクを
管理者が明示的に登録できます。UAC自体の設定は変更しません。

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
2026年10月9日の実験では、選択した実機で共有設定の復旧、SDカードからの
Linux起動、専用タスクの非管理者からの呼び出しを確認しました。

## Optional fixed-device recovery task

Run `install-recovery-task.ps1` once from an administrator PowerShell, selecting
the exact SDWire3 reader instance. Use `usbipd state` to obtain the instance ID.
The placeholder below must be replaced with your own device; no experiment
device identifier is published.

```powershell
.\tools\sdwire3\install-recovery-task.ps1 -InstanceId 'USB\VID_0BDA&PID_0316\READER_SERIAL'
```

The installer registers `WallyExperiment-SDWire3-ForceShare`. It embeds the exact
reader identity in a protected script under `%ProgramData%\WallyResearchSDWire3`.
Administrators and SYSTEM can modify it; the selected user can read and execute
it. The task accepts no command text, script path, or device argument. It refuses
to operate while that reader is attached to WSL. Other USB devices are not reset.
The existing single-device restart task, if present, is left unchanged.

After stopping SD access on the FPGA, unmounting the card on the host, and
detaching that reader from WSL, the selected user can request this fixed recovery:

```powershell
Start-ScheduledTask -TaskName 'WallyExperiment-SDWire3-ForceShare'
Get-ScheduledTaskInfo -TaskName 'WallyExperiment-SDWire3-ForceShare'
Get-Content "$env:ProgramData\WallyResearchSDWire3\last-result.json"
```

Wait until the task finishes, then confirm `LastTaskResult` is zero and that
`usbipd state` reports the selected reader as forced-shared and detached.
Invocation needs no new UAC confirmation. This grants only the fixed SDWire3
sharing operation; unrelated administrator actions still require their usual
authorization. Local installation records contain device and account identifiers
and must not be imported into this public repository.

