$ErrorActionPreference = 'Stop'
$tool = 'C:\Program Files\usbipd-win\usbipd.exe'
$target = 'USB\VID_0BDA&PID_0316\SDWIRE_READER_SERIAL'
$dir = Split-Path -Parent $MyInvocation.MyCommand.Path
$result = [ordered]@{ startedUtc = [DateTime]::UtcNow.ToString('o'); target = $target; completed = $false; operations = @() }
function Get-Target {
    $state = (& $tool state | Out-String | ConvertFrom-Json)
    $devices = @($state.Devices | Where-Object { $_.InstanceId -eq $target -and $_.BusId })
    if ($devices.Count -ne 1) { throw 'Expected exactly one matching SDWire reader.' }
    return $devices[0]
}
function Invoke-Usbip([string[]] $Arguments) {
    $savedPreference = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    $output = & $tool @Arguments 2>&1 | Out-String
    $code = $LASTEXITCODE
    $ErrorActionPreference = $savedPreference
    $result.operations += [ordered]@{ args = $Arguments; exitCode = $code; output = $output; utc = [DateTime]::UtcNow.ToString('o') }
    $result | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath (Join-Path $dir 'rebind-result.json') -Encoding UTF8
    return $code
}
try {
    $device = Get-Target
    $result.before = $device
    if ($device.ClientIPAddress) { throw 'The reader is already attached; refusing to disrupt it.' }
    if ((Invoke-Usbip @('unbind', '--busid', $device.BusId)) -ne 0) { throw 'Unbind failed.' }
    Start-Sleep -Seconds 2
    $device = Get-Target
    if ((Invoke-Usbip @('bind', '--busid', $device.BusId)) -ne 0) { throw 'Normal bind failed.' }
    $device = Get-Target
    $attached = (Invoke-Usbip @('attach', '--wsl', '--busid', $device.BusId)) -eq 0
    if (-not $attached) {
        $device = Get-Target
        if ($device.ClientIPAddress) { throw 'Reader ownership changed unexpectedly.' }
        if ((Invoke-Usbip @('bind', '--force', '--busid', $device.BusId)) -ne 0) { throw 'Forced bind failed.' }
        $device = Get-Target
        $attached = (Invoke-Usbip @('attach', '--wsl', '--busid', $device.BusId)) -eq 0
    }
    $result.after = Get-Target
    $result.completed = $attached -and [bool]$result.after.ClientIPAddress
    if (-not $result.completed) { throw 'Reader is still not attached.' }
} catch {
    $result.error = $_.Exception.Message
} finally {
    $result.finishedUtc = [DateTime]::UtcNow.ToString('o')
    $result | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath (Join-Path $dir 'rebind-result.json') -Encoding UTF8
}
