$ErrorActionPreference='Stop'
$runtimeMeta=Get-Content -LiteralPath 'artifacts/final-02-postgres-2026-10-03/runtime.json' -Raw | ConvertFrom-Json
$runtimeFull=[IO.Path]::GetFullPath($runtimeMeta.runtimeRoot)
$temporaryRoot=[IO.Path]::GetFullPath([IO.Path]::GetTempPath()).TrimEnd('\','/')
if ([IO.Path]::GetDirectoryName($runtimeFull) -ne $temporaryRoot -or [IO.Path]::GetFileName($runtimeFull) -notmatch '^ltvn-final02-[a-f0-9]{32}$') { throw 'Refusing unsafe cleanup path' }
$initExecutable=Join-Path $runtimeMeta.bin 'initdb.exe'
$nativeProcesses=@(Get-CimInstance Win32_Process | Where-Object { $_.ExecutablePath -and $_.ExecutablePath.StartsWith($runtimeFull+'\',[StringComparison]::OrdinalIgnoreCase) })
if ($nativeProcesses.Count -ne 0) { throw 'Refusing cleanup while runtime process is running' }
$databaseDirectoryExists=Test-Path -LiteralPath (Join-Path $runtimeFull 'data')
if ($databaseDirectoryExists) { throw 'Unexpected DB directory: require identity-aware cleanup instead' }
$blockEvidence=@{blocker='Windows Application Control';command='initdb.exe --version';observedError='An Application Control policy has blocked this file.';initdbBinarySHA256=(Get-FileHash -LiteralPath $initExecutable -Algorithm SHA256).Hash.ToLowerInvariant();versionMetadata=(Get-Item -LiteralPath $initExecutable).VersionInfo.FileVersion;firstAttempt='Node spawn UNKNOWN before initdb execution; attempt-01 preserved';databaseConnections=0;migrationsExecuted=0;existingDatabaseUrlUsed=$false;policyBypassAttempted=$false}
$blockEvidence | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath 'artifacts/final-02-postgres-2026-10-03/runtime-blocker.json' -Encoding utf8
Remove-Item -LiteralPath $runtimeFull -Recurse -Force
$removed=-not (Test-Path -LiteralPath $runtimeFull)
if (-not $removed) { throw 'Runtime cleanup verification failed' }
$cleanup=@{result='PASS';runtimeRoot=$runtimeFull;runtimeRemoved=$removed;processesBeforeCleanup=$nativeProcesses.Count;testDatabaseCreated=$false;testDatabaseDropped='NOT NEEDED: no database created';apiStarted=$false;postgresStarted=$false;productionDatabaseTouched=$false;testOnlyTriggers='NONE CREATED';scope='Only the exact verified temporary FINAL02 directory removed'}
$cleanup | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath 'artifacts/final-02-postgres-2026-10-03/cleanup-blocked.json' -Encoding utf8
Write-Output 'Verified FINAL02 temporary runtime REMOVED; no DB/API process existed; no database was created or connected.'
