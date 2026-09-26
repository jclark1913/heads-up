param([switch]$Stop, [switch]$SkipBuild)
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
$taskRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$taskRuntime = Join-Path $taskRoot '.tmp'
$taskTools = Join-Path $taskRoot '.tools'
$taskRecordPath = Join-Path $taskRuntime 'phone-test.json'
$taskBinary = Join-Path $taskTools 'cloudflared-2026.9.3.exe'
$taskDigest = 'f096265ec2fcbe9bb6e2d64268db167ced3fcbb83d894bdb9e2fcdb26f2ea7e2'
$taskEncoding = [Text.UTF8Encoding]::new($false)
function Stop-RecordedProcess($taskProcessId, $taskStart) {
  if (-not $taskProcessId -or -not $taskStart) { return }
  $taskProcess = Get-Process -Id $taskProcessId -ErrorAction SilentlyContinue
  if ($taskProcess -and $taskProcess.StartTime.ToUniversalTime().ToString('o') -eq $taskStart) {
    Stop-Process -Id $taskProcess.Id
  }
}
if (Test-Path -LiteralPath $taskRecordPath) {
  $taskExisting = Get-Content -LiteralPath $taskRecordPath -Raw | ConvertFrom-Json
  if (-not $Stop) {
    $taskAlive = if ($taskExisting.tunnelPid) { Get-Process -Id $taskExisting.tunnelPid -ErrorAction SilentlyContinue } else { $null }
    if ($taskAlive -and $taskAlive.StartTime.ToUniversalTime().ToString('o') -eq $taskExisting.tunnelStart) {
      try {
        $taskResponse = Invoke-WebRequest -Uri 'http://127.0.0.1:4173' -UseBasicParsing -TimeoutSec 3
        if ($taskResponse.StatusCode -eq 200) { Write-Output $taskExisting.url; Write-Output 'Existing test session is still running.'; exit 0 }
      } catch { }
    }
  }
  Stop-RecordedProcess $taskExisting.tunnelPid $taskExisting.tunnelStart
  Stop-RecordedProcess $taskExisting.serverPid $taskExisting.serverStart
}
if ($Stop) {
  if (Test-Path -LiteralPath $taskRecordPath) { [IO.File]::WriteAllText($taskRecordPath, '{}', $taskEncoding) }
  Write-Output 'Stopped the recorded phone test session.'
  exit 0
}
if (Get-NetTCPConnection -LocalPort 4173 -State Listen -ErrorAction SilentlyContinue) { throw 'Port 4173 is already in use. Stop the existing test/preview server first.' }
[IO.Directory]::CreateDirectory($taskRuntime) | Out-Null
[IO.Directory]::CreateDirectory($taskTools) | Out-Null
if (-not $SkipBuild) {
  Push-Location $taskRoot
  try { & npm.cmd run build; if ($LASTEXITCODE -ne 0) { throw 'Build failed.' } } finally { Pop-Location }
}
if (-not (Test-Path -LiteralPath (Join-Path $taskRoot 'dist/index.html'))) { throw 'Run npm run build first.' }
if (-not (Test-Path -LiteralPath $taskBinary)) {
  Write-Output 'Downloading the official Cloudflare tunnel helper...'
  Invoke-WebRequest -UseBasicParsing -Uri 'https://github.com/cloudflare/cloudflared/releases/download/2026.9.3/cloudflared-windows-amd64.exe' -OutFile $taskBinary
}
if ((Get-FileHash -LiteralPath $taskBinary -Algorithm SHA256).Hash.ToLowerInvariant() -ne $taskDigest) { throw 'Cloudflare helper checksum does not match the official release digest.' }
$taskConfig = Join-Path $taskRuntime 'cloudflared.yml'
[IO.File]::WriteAllText($taskConfig, "no-autoupdate: true", $taskEncoding)
$taskNode = (Get-Command node.exe).Source
$taskServerScript = Join-Path $taskRoot 'scripts/serve-test.mjs'
$taskServer = Start-Process -FilePath $taskNode -ArgumentList ('"' + $taskServerScript + '"') -WorkingDirectory $taskRoot -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $taskRuntime 'server.out.log') -RedirectStandardError (Join-Path $taskRuntime 'server.err.log')
$taskTunnel = $null
try {
  $taskReady = $false
  for ($taskAttempt = 0; $taskAttempt -lt 20; $taskAttempt++) {
    try { $taskResponse = Invoke-WebRequest -Uri 'http://127.0.0.1:4173' -UseBasicParsing -TimeoutSec 2; $taskReady = $taskResponse.StatusCode -eq 200 } catch { }
    if ($taskReady) { break }
    Start-Sleep -Milliseconds 250
  }
  if (-not $taskReady) { throw 'Static test server did not start. Check .tmp/server.err.log.' }
  $taskTunnelArgs = 'tunnel --config "' + $taskConfig + '" --no-autoupdate --protocol http2 --url http://127.0.0.1:4173'
  $taskTunnel = Start-Process -FilePath $taskBinary -ArgumentList $taskTunnelArgs -WorkingDirectory $taskRoot -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $taskRuntime 'tunnel.out.log') -RedirectStandardError (Join-Path $taskRuntime 'tunnel.err.log')
  $taskUrl = $null
  for ($taskAttempt = 0; $taskAttempt -lt 60; $taskAttempt++) {
    $taskStream = [IO.File]::Open((Join-Path $taskRuntime 'tunnel.err.log'), [IO.FileMode]::Open, [IO.FileAccess]::Read, [IO.FileShare]::ReadWrite)
    $taskReader = [IO.StreamReader]::new($taskStream)
    try { $taskLog = $taskReader.ReadToEnd() } finally { $taskReader.Dispose() }
    $taskMatch = [regex]::Match($taskLog, 'https://[a-z0-9-]+\.trycloudflare\.com')
    if ($taskMatch.Success) { $taskUrl = $taskMatch.Value; break }
    $taskTunnel.Refresh()
    if ($taskTunnel.HasExited) { throw 'Tunnel exited. Check .tmp/tunnel.err.log.' }
    Start-Sleep -Milliseconds 500
  }
  if (-not $taskUrl) { throw 'No HTTPS URL arrived. Check .tmp/tunnel.err.log.' }
  $taskRecord = @{
    url = $taskUrl
    serverPid = $taskServer.Id
    serverStart = $taskServer.StartTime.ToUniversalTime().ToString('o')
    tunnelPid = $taskTunnel.Id
    tunnelStart = $taskTunnel.StartTime.ToUniversalTime().ToString('o')
    created = [DateTime]::UtcNow.ToString('o')
  }
  [IO.File]::WriteAllText($taskRecordPath, ($taskRecord | ConvertTo-Json), $taskEncoding)
  Write-Output $taskUrl
  Write-Output 'Open this HTTPS link in Safari on iPhone and Chrome on Android.'
  Write-Output 'Keep this computer awake. The temporary link lasts only while these helpers run.'
  Write-Output 'Stop with: npm run phone:test -- -Stop'
} catch {
  if ($taskTunnel) { Stop-RecordedProcess $taskTunnel.Id $taskTunnel.StartTime.ToUniversalTime().ToString('o') }
  Stop-RecordedProcess $taskServer.Id $taskServer.StartTime.ToUniversalTime().ToString('o')
  throw
}
