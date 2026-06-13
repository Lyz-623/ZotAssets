<#
.SYNOPSIS
  Build the ZotAssets .xpi package (no Node.js required).

.DESCRIPTION
  Copies addon/ into build/, reads the version from addon/manifest.json, and
  zips the contents into dist/ZotAssets-<version>.xpi using Compress-Archive.

  An .xpi is just a ZIP whose manifest.json sits at the archive root, so this
  produces a file Zotero can install directly.

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File scripts\build.ps1
#>

[CmdletBinding()]
param(
  [string]$Configuration = "release"
)

$ErrorActionPreference = "Stop"

# Resolve repo root (this script lives in <root>/scripts).
$Root = Split-Path -Parent $PSScriptRoot
$AddonDir = Join-Path $Root "addon"
$BuildDir = Join-Path $Root "build"
$DistDir = Join-Path $Root "dist"
$ManifestPath = Join-Path $AddonDir "manifest.json"

if (-not (Test-Path $ManifestPath)) {
  throw "manifest.json not found at $ManifestPath"
}

# Read version from the manifest.
$manifest = Get-Content $ManifestPath -Raw | ConvertFrom-Json
$version = $manifest.version
if (-not $version) { throw "Could not read 'version' from manifest.json" }
Write-Host "ZotAssets version: $version"

# Clean build + dist output.
if (Test-Path $BuildDir) { Remove-Item $BuildDir -Recurse -Force }
New-Item -ItemType Directory -Force -Path $BuildDir | Out-Null
New-Item -ItemType Directory -Force -Path $DistDir | Out-Null

# Copy addon contents into build/.
Copy-Item -Path (Join-Path $AddonDir "*") -Destination $BuildDir -Recurse -Force

# Package: zip the CONTENTS of build/ so manifest.json is at the archive root.
#
# NOTE: we do NOT use Compress-Archive. Windows PowerShell 5.1's Compress-Archive
# stores entry paths with backslashes, which violates the ZIP/XPI spec and can
# break Gecko's zip reader (it resolves resources with forward slashes). We build
# the archive with System.IO.Compression and forward-slash entry names instead.
$xpiName = "ZotAssets-$version.xpi"
$xpiPath = Join-Path $DistDir $xpiName
if (Test-Path $xpiPath) { Remove-Item $xpiPath -Force }

Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

$buildFull = (Resolve-Path $BuildDir).Path.TrimEnd('\', '/')
$zipStream = [System.IO.File]::Open($xpiPath, [System.IO.FileMode]::Create)
$archive = New-Object System.IO.Compression.ZipArchive($zipStream, [System.IO.Compression.ZipArchiveMode]::Create)
try {
  $files = Get-ChildItem -Path $buildFull -Recurse -File
  foreach ($file in $files) {
    # Relative path with forward slashes, per ZIP spec.
    $rel = $file.FullName.Substring($buildFull.Length + 1).Replace('\', '/')
    $entry = $archive.CreateEntry($rel, [System.IO.Compression.CompressionLevel]::Optimal)
    $entryStream = $entry.Open()
    $bytes = [System.IO.File]::ReadAllBytes($file.FullName)
    $entryStream.Write($bytes, 0, $bytes.Length)
    $entryStream.Dispose()
  }
}
finally {
  $archive.Dispose()
  $zipStream.Dispose()
}

Write-Host ""
Write-Host "Built: $xpiPath"
Write-Host "Install in Zotero via Tools > Plugins > gear > Install Plugin From File..."
