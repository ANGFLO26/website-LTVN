$ErrorActionPreference='Stop'
$runtimeRoot=Join-Path ([IO.Path]::GetTempPath()) ('ltvn-final02-'+[Guid]::NewGuid().ToString('N'))
$runtimeParent=[IO.Path]::GetFullPath([IO.Path]::GetTempPath())
$runtimeFull=[IO.Path]::GetFullPath($runtimeRoot)
if (-not $runtimeFull.StartsWith($runtimeParent,[StringComparison]::OrdinalIgnoreCase) -or [IO.Path]::GetFileName($runtimeFull) -notmatch '^ltvn-final02-[a-f0-9]{32}$') { throw 'Unsafe runtime target' }
New-Item -ItemType Directory -Path $runtimeFull | Out-Null
$archive=Join-Path $runtimeFull 'postgresql.zip'
$downloadUrl='https://get.enterprisedb.com/postgresql/postgresql-18.6-5-windows-x64-binaries.zip'
Write-Output 'Downloading official PostgreSQL portable archive (no DB connection).'
Invoke-WebRequest -Uri $downloadUrl -OutFile $archive -TimeoutSec 240
$archiveHash=(Get-FileHash -LiteralPath $archive -Algorithm SHA256).Hash.ToLowerInvariant()
Add-Type -AssemblyName System.IO.Compression.FileSystem
$archiveZip=[IO.Compression.ZipFile]::OpenRead($archive)
$extracted=0
try {
  foreach ($entry in $archiveZip.Entries) {
    if ($entry.FullName -notmatch '^pgsql/(bin|lib|share)/' -or $entry.FullName.EndsWith('/')) { continue }
    $destination=[IO.Path]::GetFullPath((Join-Path $runtimeFull $entry.FullName))
    if (-not $destination.StartsWith($runtimeFull+[IO.Path]::DirectorySeparatorChar,[StringComparison]::OrdinalIgnoreCase)) { throw 'Archive path outside isolated runtime' }
    [IO.Directory]::CreateDirectory([IO.Path]::GetDirectoryName($destination)) | Out-Null
    [IO.Compression.ZipFileExtensions]::ExtractToFile($entry,$destination,$false)
    $extracted++
  }
} finally { $archiveZip.Dispose() }
$runtimeMeta=@{runtimeRoot=$runtimeFull; bin=(Join-Path $runtimeFull 'pgsql/bin'); archiveSHA256=$archiveHash; downloadUrl=$downloadUrl; extractedFiles=$extracted; strategy='fresh local native cluster; no existing data or service'}
$runtimeMeta | ConvertTo-Json | Set-Content -LiteralPath 'artifacts/final-02-postgres-2026-10-03/runtime.json' -Encoding utf8
Write-Output ('Portable files ready: '+$extracted+'; SHA256 '+$archiveHash)
& (Join-Path $runtimeFull 'pgsql/bin/postgres.exe') --version
if ($LASTEXITCODE -ne 0) { throw 'PostgreSQL executable cannot run' }
