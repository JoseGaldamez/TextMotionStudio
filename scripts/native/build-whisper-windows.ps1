param(
    [string]$Generator = 'Visual Studio 17 2022',
    [string]$DumpbinPath = 'dumpbin'
)

$ErrorActionPreference = 'Stop'
$project = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$version = (Get-Content -Raw (Join-Path $project 'third_party/whisper/VERSION')).Trim()
$source = Join-Path $project 'build/bin/native-source/windows-amd64/whisper.cpp'
$build = Join-Path $project 'build/bin/native-source/windows-amd64/whisper-build-msvc-static'
$artifact = Join-Path $project "build/bin/whisper-$version-windows-amd64-msvc"
$expectedCommit = '306c88f4d1286aec1bf96e544632897886af5501'

if (-not (Test-Path -LiteralPath $source -PathType Container)) {
    & git clone --depth 1 --branch "v$version" https://github.com/ggml-org/whisper.cpp.git $source
    if ($LASTEXITCODE -ne 0) { throw 'Could not clone the official whisper.cpp tag.' }
}
$actualCommit = (& git -C $source rev-parse HEAD).Trim()
if ($actualCommit -ne $expectedCommit) { throw "Unexpected whisper.cpp source commit: $actualCommit" }
if ((& git -C $source status --porcelain).Count -ne 0) { throw 'whisper.cpp source has local modifications.' }

& cmake -S $source -B $build -G $Generator -A x64 `
    -DBUILD_SHARED_LIBS=OFF -DGGML_BACKEND_DL=OFF -DGGML_NATIVE=OFF `
    -DGGML_SSE42=OFF -DGGML_AVX=OFF -DGGML_AVX2=OFF -DGGML_BMI2=OFF `
    -DGGML_OPENMP=OFF -DGGML_VULKAN=OFF -DGGML_CUDA=OFF -DGGML_METAL=OFF `
    -DWHISPER_BUILD_TESTS=OFF -DWHISPER_BUILD_EXAMPLES=ON `
    -DCMAKE_POLICY_DEFAULT_CMP0091=NEW -DCMAKE_MSVC_RUNTIME_LIBRARY=MultiThreaded
if ($LASTEXITCODE -ne 0) { throw 'whisper.cpp CMake configuration failed.' }
& cmake --build $build --config Release --target whisper-cli --parallel 4
if ($LASTEXITCODE -ne 0) { throw 'whisper.cpp build failed.' }

$binary = Join-Path $build 'bin/Release/whisper-cli.exe'
$versionOutput = & $binary --version 2>&1 | Out-String
if ($LASTEXITCODE -ne 0 -or $versionOutput -notmatch "whisper\.cpp version: $([regex]::Escape($version))") {
    throw 'Built whisper-cli does not report the pinned version.'
}
$imports = & $DumpbinPath /DEPENDENTS $binary 2>&1 | Out-String
if ($LASTEXITCODE -ne 0) { throw 'Could not inspect whisper-cli DLL dependencies.' }
$dlls = [regex]::Matches($imports, '(?im)^\s+([\w.-]+\.dll)\s*$') | ForEach-Object { $_.Groups[1].Value }
$unexpected = @($dlls | Where-Object { $_ -notin @('KERNEL32.dll', 'ADVAPI32.dll') })
if ($unexpected.Count -gt 0) { throw "Unexpected DLL imports: $($unexpected -join ', ')" }

if (Test-Path -LiteralPath $artifact) { throw "Candidate artifact already exists: $artifact" }
New-Item -ItemType Directory -Path $artifact | Out-Null
Copy-Item -LiteralPath $binary -Destination $artifact
Copy-Item -LiteralPath (Join-Path $project 'third_party/whisper/LICENSE') -Destination (Join-Path $artifact 'LICENSE')
Copy-Item -LiteralPath (Join-Path $project 'third_party/whisper/SOURCE.txt') -Destination (Join-Path $artifact 'SOURCE.txt')
Copy-Item -LiteralPath (Join-Path $project 'third_party/whisper/VERSION') -Destination (Join-Path $artifact 'VERSION')
Copy-Item -LiteralPath (Join-Path $build 'CMakeCache.txt') -Destination (Join-Path $artifact 'build-config.txt')
& git -C $source archive --format=tar.gz "--output=$(Join-Path $artifact 'whisper-source.tar.gz')" HEAD
if ($LASTEXITCODE -ne 0) { throw 'Could not archive whisper.cpp source.' }
$hash = (Get-FileHash -Algorithm SHA256 -LiteralPath $binary).Hash.ToLowerInvariant()
Set-Content -LiteralPath (Join-Path $artifact 'SHA256SUMS') -Value "$hash  whisper-cli.exe" -Encoding ascii
Set-Content -LiteralPath (Join-Path $artifact 'DLL_IMPORTS.txt') -Value ($dlls -join "`n") -Encoding ascii
Write-Host "Candidate only, not approved for release: $artifact"
Write-Host "SHA-256: $hash"
