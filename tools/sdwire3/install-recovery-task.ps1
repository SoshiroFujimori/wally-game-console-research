param(
    [Parameter(Mandatory=$true)][string]$InstanceId
)
$ErrorActionPreference = 'Stop'
if ($InstanceId -notmatch '^USB\\VID_0BDA&PID_0316\\[A-Za-z0-9._-]+$') {
    throw 'Select one explicit SDWire3 reader instance.'
}
$identity = [Security.Principal.WindowsIdentity]::GetCurrent()
$principal = [Security.Principal.WindowsPrincipal]::new($identity)
if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    throw 'One administrator-approved installation is required.'
}
$taskName = 'WallyExperiment-SDWire3-ForceShare'
$installRoot = Join-Path $env:ProgramData 'WallyResearchSDWire3'
$service = New-Object -ComObject Schedule.Service
$service.Connect()
$folder = $service.GetFolder('\')
if (Test-Path -LiteralPath $installRoot) { throw 'Installation directory already exists; inspect it before changing it.' }
try { $existing = $folder.GetTask($taskName) } catch { $existing = $null }
if ($existing) { throw 'Task already exists; inspect it before changing it.' }
$usbipd = Join-Path $env:ProgramFiles 'usbipd-win\usbipd.exe'
if (-not(Test-Path -LiteralPath $usbipd)) { throw 'usbipd-win is not installed in the expected protected location.' }

# Neither the task nor its executable script is writable by an unelevated user.
New-Item -ItemType Directory -Path $installRoot | Out-Null
$acl = New-Object Security.AccessControl.DirectorySecurity
$acl.SetSecurityDescriptorSddlForm('O:BAG:BAD:P(A;OICI;FA;;;SY)(A;OICI;FA;;;BA)(A;OICI;GRGX;;;'+$identity.User.Value+')')
Set-Acl -LiteralPath $installRoot -AclObject $acl
$helper = Join-Path $installRoot 'force-share.ps1'
$code = @'
$ErrorActionPreference = 'Stop'
$readerIdentity = '__INSTANCE__'
$usbipd = '__USBIPD__'
$resultFile = Join-Path $PSScriptRoot 'last-result.json'
$record = @{startedUtc=[DateTime]::UtcNow.ToString('o');completed=$false}
try {
    # A caller must quiesce both hosts and detach WSL before invoking this task.
    # No request file, command text, destination, or script path is accepted.
    $done = $false
    for ($attempt=0; $attempt -lt 4; $attempt++) {
        $readers = @((& $usbipd state | Out-String | ConvertFrom-Json).Devices | Where-Object { $_.InstanceId -eq $readerIdentity -and $_.BusId })
        if ($readers.Count -ne 1) { throw 'The selected reader is not uniquely present.' }
        $reader = $readers[0]
        if ($reader.ClientIPAddress) { throw 'Detach the selected, unmounted WSL reader first.' }
        if ($reader.IsForced) { $done=$true; break }
        & $usbipd bind --force --busid $reader.BusId
        $code = $LASTEXITCODE
        Start-Sleep -Seconds 1
        $after = @((& $usbipd state | Out-String | ConvertFrom-Json).Devices | Where-Object { $_.InstanceId -eq $readerIdentity })
        if ($code -eq 0 -and $after.Count -eq 1 -and $after[0].IsForced -and -not $after[0].ClientIPAddress) { $done=$true; break }
    }
    if (-not $done) { throw 'The selected reader did not reach detached forced-sharing state.' }
    $record.completed=$true
} catch {
    $record.error=$_.Exception.Message
} finally {
    $record.finishedUtc=[DateTime]::UtcNow.ToString('o')
    $record | ConvertTo-Json | Set-Content -LiteralPath $resultFile -Encoding UTF8
}
if (-not $record.completed) { exit 1 }
'@
$code = $code.Replace('__INSTANCE__',$InstanceId.Replace("'","''")).Replace('__USBIPD__',$usbipd.Replace("'","''"))
[IO.File]::WriteAllText($helper,$code,[Text.UTF8Encoding]::new($false))
$definition = $service.NewTask(0)
$definition.RegistrationInfo.Description = 'Force-share one fixed SDWire3 reader after an explicit unmounted detach. No arbitrary elevated commands.'
$definition.Principal.UserId = $identity.User.Value
$definition.Principal.LogonType = 3
$definition.Principal.RunLevel = 1
$definition.Settings.Enabled = $true
$definition.Settings.Hidden = $true
$definition.Settings.AllowDemandStart = $true
$definition.Settings.DisallowStartIfOnBatteries = $false
$definition.Settings.StopIfGoingOnBatteries = $false
$definition.Settings.ExecutionTimeLimit = 'PT1M'
$definition.Settings.MultipleInstances = 2
$action = $definition.Actions.Create(0)
$action.Path = Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe'
$action.Arguments = '-NoProfile -NonInteractive -WindowStyle Hidden -ExecutionPolicy Bypass -File "'+$helper+'"'
$action.WorkingDirectory = $installRoot
$sddl = 'O:BAG:BAD:P(A;;FA;;;SY)(A;;FA;;;BA)(A;;GRGX;;;'+$identity.User.Value+')'
# TASK_CREATE | TASK_DONT_ADD_PRINCIPAL_ACE preserves the explicit limited ACL.
$task = $folder.RegisterTaskDefinition($taskName,$definition,18,$identity.User.Value,$null,3,$sddl)
@{task=$taskName;scriptSha256=(Get-FileHash -LiteralPath $helper -Algorithm SHA256).Hash;installedUtc=[DateTime]::UtcNow.ToString('o')} |
    ConvertTo-Json | Set-Content -LiteralPath (Join-Path $installRoot 'installation.json') -Encoding UTF8
$task.Run($null) | Out-Null
Write-Output 'Installed the fixed-reader recovery task and started its first run.'
