param(
    [string]$MongoUri = $env:MONGODB_URI,
    [string]$OutputRoot = "$(Join-Path $PSScriptRoot '..\backups')",
    [int]$KeepLast = 14
)

$ErrorActionPreference = 'Stop'

if ([string]::IsNullOrWhiteSpace($MongoUri)) {
    throw "MONGODB_URI is not set. Pass -MongoUri or set env var MONGODB_URI."
}

$mongoDumpCmd = Get-Command mongodump -ErrorAction SilentlyContinue
if (-not $mongoDumpCmd) {
    throw "mongodump not found. Install MongoDB Database Tools and add to PATH."
}

New-Item -ItemType Directory -Path $OutputRoot -Force | Out-Null

$timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$workDir = Join-Path $OutputRoot "mongo-$timestamp"
$zipPath = "$workDir.zip"

Write-Output "Creating MongoDB backup at: $workDir"
mongodump --uri "$MongoUri" --out "$workDir"

if ($LASTEXITCODE -ne 0) {
    throw "mongodump failed with exit code $LASTEXITCODE"
}

Write-Output "Compressing backup: $zipPath"
Compress-Archive -Path "$workDir\*" -DestinationPath "$zipPath" -Force
Remove-Item -Path $workDir -Recurse -Force

# Retention cleanup for old zip backups
$zipBackups = Get-ChildItem -Path $OutputRoot -Filter 'mongo-*.zip' |
    Sort-Object LastWriteTime -Descending

$toDelete = $zipBackups | Select-Object -Skip $KeepLast
foreach ($file in $toDelete) {
    Remove-Item -Path $file.FullName -Force
}

Write-Output "Backup complete: $zipPath"
Write-Output "Kept latest $KeepLast backup file(s)."
