param(
    [Parameter(Mandatory = $true)][string]$NativeDirectory,
    [ValidateSet('cpu', 'gpu')][string]$Variant = 'cpu'
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
$whisper = Join-Path $source 'whisper-cli.exe'
foreach ($file in @($whisper)) {
    if (-not (Test-Path -LiteralPath $file -PathType Leaf)) { throw "Missing required binary: $file" }
}
$report = Join-Path $project 'build/bin/native-build-report.txt'
Push-Location $project
try {
    if (Test-Path -LiteralPath $stage -PathType Container) {
        Remove-Item -LiteralPath $stage -Recurse -Force
    }
    New-Item -ItemType Directory -Force -Path $stage | Out-Null
    Copy-Item -LiteralPath $whisper -Destination $stage -Force
    Get-ChildItem -LiteralPath $source -Filter '*.dll' -File | Copy-Item -Destination $stage -Force
    & (Join-Path $project 'scripts/native/build-windows-media.ps1') -OutputDirectory $stage
    if ($Variant -eq 'gpu') {
        Copy-Item -LiteralPath (Join-Path $source 'CUDA_EULA.txt') -Destination $stage
        Copy-Item -LiteralPath (Join-Path $source 'DLL_IMPORTS.txt') -Destination $stage
    }
    & go run ./tools/nativecheck -candidate -target windows-amd64 -variant $Variant -dir $stage
    if ($LASTEXITCODE -ne 0) { throw 'Native dependency validation failed. No installer was built.' }
    & go run ./tools/nativecheck -target windows-amd64 -variant $Variant -dir $stage -report $report
    if ($LASTEXITCODE -ne 0) { throw 'Staged native binaries differ from approved hashes.' }
    if (-not (Get-Command makensis -ErrorAction SilentlyContinue)) {
        $nsis = @(
            "${env:ProgramFiles(x86)}\NSIS\makensis.exe",
            "$env:ProgramFiles\NSIS\makensis.exe"
        ) | Where-Object { Test-Path -LiteralPath $_ -PathType Leaf } | Select-Object -First 1
        if (-not $nsis) { throw 'NSIS makensis.exe is required to create the Windows installer.' }
        $env:PATH = "$(Split-Path -Parent $nsis);$env:PATH"
    }
    $installer = Join-Path $project 'build/bin/TextMotionStudio-amd64-installer.exe'
    $previous = Get-Item -LiteralPath $installer -ErrorAction SilentlyContinue
    $previousWriteTime = if ($previous) { $previous.LastWriteTimeUtc } else { [datetime]::MinValue }
    & wails build -nsis
    if ($LASTEXITCODE -ne 0) { throw 'Wails installer build failed.' }
    $created = Get-Item -LiteralPath $installer -ErrorAction SilentlyContinue
    if (-not $created -or $created.LastWriteTimeUtc -le $previousWriteTime) {
        throw 'Wails did not create a new Windows installer.'
    }
} finally { Pop-Location }
