param([Parameter(Mandatory = $true)][string]$OutputDirectory)

$ErrorActionPreference = 'Stop'
$project = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$source = Join-Path $project 'native/windows-media/main.cpp'
$vswhere = Join-Path ${env:ProgramFiles(x86)} 'Microsoft Visual Studio/Installer/vswhere.exe'
if (-not (Test-Path -LiteralPath $vswhere -PathType Leaf)) {
    throw 'Visual Studio Build Tools are required to build the Windows Media Foundation helper.'
}
$installation = (& $vswhere -latest -products '*' -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64 -property installationPath | Select-Object -First 1)
if (-not $installation) { throw 'Visual C++ tools were not found.' }
$vcvars = Join-Path $installation 'VC/Auxiliary/Build/vcvars64.bat'
if (-not (Test-Path -LiteralPath $vcvars -PathType Leaf)) { throw 'Visual C++ x64 environment was not found.' }
$destination = [IO.Path]::GetFullPath($OutputDirectory)
New-Item -ItemType Directory -Force -Path $destination | Out-Null
$output = Join-Path $destination 'windows-media.exe'
$object = Join-Path $env:TEMP ('textmotion-media-' + [guid]::NewGuid().ToString('N') + '.obj')
try {
    $command = '"{0}" >nul && cl /nologo /std:c++17 /EHsc /O2 /MT /Brepro "{1}" /Fo:"{2}" /Fe:"{3}" mfreadwrite.lib mfplat.lib mfuuid.lib ole32.lib' -f $vcvars, $source, $object, $output
    & cmd.exe /c $command
    if ($LASTEXITCODE -ne 0 -or -not (Test-Path -LiteralPath $output -PathType Leaf)) {
        throw 'Windows Media Foundation helper build failed.'
    }
} finally {
    Remove-Item -LiteralPath $object -ErrorAction SilentlyContinue
}
