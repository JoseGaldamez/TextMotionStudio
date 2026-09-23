param(
    [Parameter(Mandatory = $true)][string]$NativeDirectory
)

$ErrorActionPreference = 'Stop'
$project = Split-Path -Parent $PSScriptRoot
$source = (Resolve-Path -LiteralPath $NativeDirectory).Path
$stage = Join-Path $project 'build/windows/installer/runtime/windows-amd64'
$stageAbsolute = [IO.Path]::GetFullPath($stage)
$projectAbsolute = [IO.Path]::GetFullPath($project) + [IO.Path]::DirectorySeparatorChar
if (-not $stageAbsolute.StartsWith($projectAbsolute, [StringComparison]::OrdinalIgnoreCase)) {
    throw 'Native staging path escapes the project.'
}
$ffmpeg = Join-Path $source 'ffmpeg.exe'
$whisper = Join-Path $source 'whisper-cli.exe'
foreach ($file in @($ffmpeg, $whisper)) {
    if (-not (Test-Path -LiteralPath $file -PathType Leaf)) { throw "Missing required binary: $file" }
}
$report = Join-Path $project 'build/bin/native-build-report.txt'
Push-Location $project
try {
    & go run ./tools/nativecheck -target windows-amd64 -dir $source -report $report
    if ($LASTEXITCODE -ne 0) { throw 'Native dependency validation failed. No installer was built.' }
    if (Test-Path -LiteralPath $stage -PathType Container) {
        Remove-Item -LiteralPath $stage -Recurse -Force
    }
    New-Item -ItemType Directory -Force -Path $stage | Out-Null
    Copy-Item -LiteralPath $ffmpeg, $whisper -Destination $stage -Force
    Get-ChildItem -LiteralPath $source -Filter '*.dll' -File | Copy-Item -Destination $stage -Force
    Copy-Item -LiteralPath (Join-Path $source 'SHA256SUMS') -Destination $stage
    & go run ./tools/nativecheck -target windows-amd64 -dir $stage
    if ($LASTEXITCODE -ne 0) { throw 'Staged native binaries differ from approved hashes.' }
    & wails build -nsis
    if ($LASTEXITCODE -ne 0) { throw 'Wails installer build failed.' }
} finally { Pop-Location }
