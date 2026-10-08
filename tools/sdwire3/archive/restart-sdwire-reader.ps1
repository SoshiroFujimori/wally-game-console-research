$ErrorActionPreference = 'Stop'
$target = 'USB\VID_0BDA&PID_0316\SDWIRE_READER_SERIAL'
$out = 'C:\Users\researcher\.codex\tmp\rasterix-integration-20260909\reboot-admin-preflight'
$result = [ordered]@{startedUtc=[DateTime]::UtcNow.ToString('o');target=$target;action='pnputil /restart-device';completed=$false}
try {
    $device = Get-PnpDevice -InstanceId $target -PresentOnly -ErrorAction Stop
    $result.before = @{status=[string]$device.Status;problem=(Get-PnpDeviceProperty -InstanceId $target -KeyName 'DEVPKEY_Device_ProblemCode').Data}
    $commandOutput = & "$env:SystemRoot\System32\pnputil.exe" /restart-device $target 2>&1
    $result.exitCode = $LASTEXITCODE
    $commandOutput | Out-File -LiteralPath (Join-Path $out 'restart-command.log') -Encoding utf8
    Start-Sleep -Seconds 2
    $device = Get-PnpDevice -InstanceId $target -PresentOnly -ErrorAction Stop
    $result.after = @{status=[string]$device.Status;problem=(Get-PnpDeviceProperty -InstanceId $target -KeyName 'DEVPKEY_Device_ProblemCode').Data}
    $result.completed = $true
} catch { $result.error = $_.Exception.Message }
$result.finishedUtc = [DateTime]::UtcNow.ToString('o')
$result | ConvertTo-Json -Depth 8 | Out-File -LiteralPath (Join-Path $out 'restart-result.json') -Encoding utf8
