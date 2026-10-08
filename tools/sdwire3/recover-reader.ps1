[CmdletBinding(SupportsShouldProcess)]
param(
    [Parameter(Mandatory=$true)]
    [ValidatePattern('^USB\\VID_0BDA&PID_0316\\[^\\]+$')]
    [string]$DeviceInstanceId,
    [switch]$Execute,
    [switch]$TargetQuiesced,
    [switch]$AllowForcedBind
)
$ErrorActionPreference = 'Stop'
$tool = (Get-Command usbipd.exe -ErrorAction Stop).Source
function Get-Reader {
    $state = (& $tool state | Out-String | ConvertFrom-Json)
    if ($LASTEXITCODE -ne 0) { throw 'usbipd state failed.' }
    $matches = @($state.Devices | Where-Object { $_.InstanceId -eq $DeviceInstanceId -and $_.BusId })
    if ($matches.Count -ne 1) { throw 'Expected exactly one matching reader.' }
    return $matches[0]
}
function Invoke-Checked([string[]] $Arguments) {
    & $tool @Arguments
    if ($LASTEXITCODE -ne 0) { throw ('usbipd failed: ' + ($Arguments -join ' ')) }
}
$reader = Get-Reader
if ($reader.ClientIPAddress) { throw 'Reader is attached to a client; refusing to disrupt it.' }
if (-not $Execute) {
    [ordered]@{ selectedBusId=$reader.BusId; plannedActions=@('unbind','bind','attach --wsl'); executed=$false } | ConvertTo-Json
    return
}
if (-not $TargetQuiesced) { throw 'Stop target SD access and confirm with -TargetQuiesced.' }
if (-not $PSCmdlet.ShouldProcess('the explicitly selected SDWire3 reader','Recreate USB sharing and attach to WSL')) { return }
Invoke-Checked @('unbind','--busid',$reader.BusId)
Start-Sleep -Seconds 2
$reader = Get-Reader
Invoke-Checked @('bind','--busid',$reader.BusId)
$reader = Get-Reader
& $tool attach --wsl --busid $reader.BusId
if ($LASTEXITCODE -ne 0) {
    if (-not $AllowForcedBind) { throw 'Attach failed. Forced binding was not requested.' }
    $reader = Get-Reader
    if ($reader.ClientIPAddress) { throw 'Reader ownership changed unexpectedly.' }
    Invoke-Checked @('bind','--force','--busid',$reader.BusId)
    $reader = Get-Reader
    Invoke-Checked @('attach','--wsl','--busid',$reader.BusId)
}
$reader = Get-Reader
if (-not $reader.ClientIPAddress) { throw 'Reader was not attached.' }
Write-Output 'The selected reader is attached to WSL.'
