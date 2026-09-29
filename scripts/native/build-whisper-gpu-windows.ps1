param(
    [string]$Generator = 'Visual Studio 17 2022',
    [string]$DumpbinPath = 'dumpbin',
    [string]$CudaToolkit = $env:CUDA_PATH,
    [string]$VulkanSdk = $env:VULKAN_SDK,
    [Parameter(Mandatory = $true)][string]$CudaEula
)

$ErrorActionPreference = 'Stop'
$project = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$version = (Get-Content -Raw (Join-Path $project 'third_party/whisper/VERSION')).Trim()
$source = Join-Path $project 'build/bin/native-source/windows-amd64/whisper.cpp'
$build = Join-Path $project 'build/gpu-whisper'
$candidate = Join-Path $project 'build/bin/native-candidates/windows-amd64-gpu'
$expectedCommit = '306c88f4d1286aec1bf96e544632897886af5501'

if (-not $CudaToolkit -or -not (Test-Path -LiteralPath (Join-Path $CudaToolkit 'bin/nvcc.exe') -PathType Leaf)) {
    throw 'CUDA Toolkit with nvcc.exe is required. Pass -CudaToolkit or set CUDA_PATH.'
}
if (-not $VulkanSdk -or -not (Test-Path -LiteralPath (Join-Path $VulkanSdk 'Bin/glslc.exe') -PathType Leaf)) {
    throw 'Vulkan SDK with glslc.exe is required. Pass -VulkanSdk or set VULKAN_SDK.'
}
$env:VULKAN_SDK = $VulkanSdk
$env:CUDA_PATH = $CudaToolkit
foreach ($file in @($CudaEula, $source)) {
    if (-not (Test-Path -LiteralPath $file)) { throw "Required input missing: $file" }
}
if (Test-Path -LiteralPath $candidate) { throw "Candidate already exists: $candidate" }
if ((& git -C $source rev-parse HEAD).Trim() -ne $expectedCommit) { throw 'Unexpected whisper.cpp source commit.' }
if ((& git -C $source status --porcelain).Count -ne 0) { throw 'whisper.cpp source has local modifications.' }

& cmake -S $source -B $build -G $Generator -A x64 -T "cuda=$CudaToolkit" `
    "-DCUDAToolkit_ROOT=$CudaToolkit" '-DCMAKE_CUDA_ARCHITECTURES=75-virtual;86-real;89-real;120a-real' `
    -DBUILD_SHARED_LIBS=ON -DGGML_BACKEND_DL=ON -DGGML_NATIVE=OFF `
    -DGGML_SSE42=OFF -DGGML_AVX=OFF -DGGML_AVX2=OFF -DGGML_BMI2=OFF `
    -DGGML_OPENMP=OFF -DGGML_CPU=ON -DGGML_VULKAN=ON -DGGML_CUDA=ON -DGGML_CUDA_NCCL=OFF `
    -DWHISPER_BUILD_TESTS=OFF -DWHISPER_BUILD_EXAMPLES=ON `
    -DCMAKE_POLICY_DEFAULT_CMP0091=NEW -DCMAKE_MSVC_RUNTIME_LIBRARY=MultiThreaded
if ($LASTEXITCODE -ne 0) { throw 'GPU CMake configuration failed.' }
& cmake --build $build --config Release --target whisper-cli --parallel 12
if ($LASTEXITCODE -ne 0) { throw 'GPU whisper-cli build failed.' }

$built = Join-Path $build 'bin/Release'
foreach ($name in @('whisper-cli.exe', 'ggml-cpu.dll', 'ggml-vulkan.dll', 'ggml-cuda.dll')) {
    if (-not (Test-Path -LiteralPath (Join-Path $built $name) -PathType Leaf)) { throw "Built component missing: $name" }
}
New-Item -ItemType Directory -Path $candidate | Out-Null
& (Join-Path $project 'scripts/native/build-windows-media.ps1') -OutputDirectory $candidate
Copy-Item -LiteralPath (Join-Path $built 'whisper-cli.exe') -Destination $candidate
Get-ChildItem -LiteralPath $built -Filter '*.dll' -File | Copy-Item -Destination $candidate

# Copy only CUDA runtime libraries that appear in the actual recursive import tree.
$queue = [Collections.Generic.Queue[string]]::new()
Get-ChildItem -LiteralPath $candidate -File | Where-Object { $_.Extension -in @('.exe', '.dll') } | ForEach-Object { $queue.Enqueue($_.FullName) }
$scanned = [Collections.Generic.HashSet[string]]::new([StringComparer]::OrdinalIgnoreCase)
$imports = [Collections.Generic.List[string]]::new()
while ($queue.Count -gt 0) {
    $binary = $queue.Dequeue()
    if (-not $scanned.Add($binary)) { continue }
    $output = & $DumpbinPath /DEPENDENTS $binary 2>&1 | Out-String
    if ($LASTEXITCODE -ne 0) { throw "Cannot inspect DLL imports: $binary" }
    foreach ($match in [regex]::Matches($output, '(?im)^\s+([\w.-]+\.dll)\s*$')) {
        $name = $match.Groups[1].Value
        $imports.Add("$([IO.Path]::GetFileName($binary)): $name")
        $local = Join-Path $candidate $name
        if (Test-Path -LiteralPath $local -PathType Leaf) { $queue.Enqueue($local); continue }
        $sdkFile = @(
            (Join-Path $CudaToolkit "bin/$name"),
            (Join-Path $CudaToolkit "bin/x64/$name")
        ) | Where-Object { Test-Path -LiteralPath $_ -PathType Leaf } | Select-Object -First 1
        if ($sdkFile) {
            if ($name -notmatch '^(?i:cudart64_|cublas64_|cublasLt64_|nvrtc64_|nvrtc-builtins64_|nvJitLink_)') {
                throw "CUDA dependency is not on the redistributable allowlist: $name"
            }
            Copy-Item -LiteralPath $sdkFile -Destination $candidate
            $queue.Enqueue($local)
            continue
        }
        if ($name -ieq 'nvcuda.dll' -or $name -ieq 'vulkan-1.dll' -or $name -match '^(?i:api-ms-win-|ext-ms-win-)') { continue }
        if ($name -match '^(?i:vcruntime|msvcp|concrt)') {
            throw "Unbundled Visual C++ runtime dependency: $name"
        }
        if (-not (Test-Path -LiteralPath (Join-Path $env:SystemRoot "System32/$name") -PathType Leaf)) {
            throw "Unresolved DLL import: $name required by $binary"
        }
    }
}

Copy-Item -LiteralPath $CudaEula -Destination (Join-Path $candidate 'CUDA_EULA.txt')
Copy-Item -LiteralPath (Join-Path $project 'third_party/whisper/LICENSE') -Destination (Join-Path $candidate 'WHISPER_LICENSE.txt')
Copy-Item -LiteralPath (Join-Path $project 'third_party/whisper/SOURCE.txt') -Destination (Join-Path $candidate 'WHISPER_SOURCE.txt')
Copy-Item -LiteralPath (Join-Path $project 'THIRD_PARTY_NOTICES.txt') -Destination $candidate
Copy-Item -LiteralPath (Join-Path $build 'CMakeCache.txt') -Destination (Join-Path $candidate 'WHISPER_build-config.txt')
Set-Content -LiteralPath (Join-Path $candidate 'DLL_IMPORTS.txt') -Value $imports -Encoding ascii
& git -C $source archive --format=tar.gz "--output=$(Join-Path $candidate 'whisper-source.tar.gz')" HEAD
if ($LASTEXITCODE -ne 0) { throw 'Could not archive whisper.cpp source.' }
Push-Location $project
try {
    & go run ./tools/nativecheck -candidate -variant gpu -target windows-amd64 -dir $candidate
    if ($LASTEXITCODE -ne 0) { throw 'GPU candidate validation failed.' }
} finally { Pop-Location }
Write-Host "GPU candidate only, not approved for release: $candidate"
