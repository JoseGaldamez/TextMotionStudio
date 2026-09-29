# GPU build handoff — 2026-09-28

Historical build record. The current Windows export path uses Media Foundation;
the current Windows package no longer includes FFmpeg. The notes below describe
the previous installer and should not be used as current release instructions.

## Objective

Produce and verify a distributable Windows build of TextMotion Studio with
whisper.cpp CPU, CUDA and Vulkan transcription backends. Auto mode should use
an available GPU and fall back to CPU; the CPU setting passes `--no-gpu`.
Video export through FFmpeg is unchanged.

## Completed after resuming — 2026-09-28

- The incremental CUDA build completed. The candidate is at
  `build/bin/native-candidates/windows-amd64-gpu/` and its exact binary hashes
  are approved in `third_party/approved/windows-amd64-gpu.sha256`.
- The candidate passed `nativecheck`. A short speech sample produced JSON in
  CUDA, forced CPU, Vulkan-only and automatic CPU-only modes. The Vulkan-only
  and CPU-only checks isolated those DLLs on the same RTX 4060 Ti computer;
  separate AMD/Intel hardware has not been tested.
- The local NSIS installer was built at
  `build/bin/TextMotionStudio-amd64-installer.exe` (about 509 MB). It includes
  CUDA/Vulkan/CPU libraries, the CUDA EULA and the pinned FFmpeg source archive,
  build script and configuration. NSIS was already installed but not on PATH;
  `scripts/package-windows.ps1` now locates it and verifies a new installer was
  produced.
- Remaining distribution tasks are external: test the installer on separate
  hardware and publish the matching FFmpeg source alongside any download page.
  The source is already included inside this installer. The app has not been
  code signed or submitted to Microsoft Store.

The sections below preserve the original paused-build state and resume notes.

## State at pause

- The user installed CUDA Toolkit 13.3 at
  `C:\Program Files\NVIDIA GPU Computing Toolkit\CUDA\v13.3` and Vulkan SDK
  1.4.357.0 at `C:\VulkanSDK\1.4.357.0`. The NVIDIA EULA is at
  `C:\Program Files\NVIDIA GPU Computing Toolkit\CUDA\v13.3\EULA.txt`.
- Visual Studio 2026 Enterprise is at
  `C:\Program Files\Microsoft Visual Studio\18\Enterprise`.
- The host has an NVIDIA GeForce RTX 4060 Ti, compute capability 8.9,
  driver 610.88. It can run a CUDA smoke test after the build.
- `scripts/native/build-whisper-gpu-windows.ps1` configures pinned
  whisper.cpp v1.9.2 with dynamic CPU, CUDA and Vulkan modules. CUDA targets
  are `75-virtual;86-real;89-real;120a-real`: PTX fallback from Turing onward
  and native kernels for RTX 30, 40 and 50.
- The interrupted incremental build is in `build/gpu-whisper/`. It has
  produced `ggml-base.dll`, `ggml-cpu.dll` and `ggml-vulkan.dll` under
  `build/gpu-whisper/bin/Release/`, plus 83 CUDA object files. It has **not**
  produced `ggml-cuda.dll`, `whisper-cli.exe`, the combined candidate or an
  installer. Ctrl+C stopped MSBuild; no `nvcc` or `MSBuild` process remained.
- `build/gpu-whisper/` is ignored by Git so these incremental outputs remain
  available locally without entering a commit. Do not clean this directory
  before resuming.

## Resume command

Run from the repository root in PowerShell:

```powershell
& .\scripts\native\build-whisper-gpu-windows.ps1 `
  -Generator 'Visual Studio 18 2026' `
  -CudaToolkit 'C:\Program Files\NVIDIA GPU Computing Toolkit\CUDA\v13.3' `
  -VulkanSdk 'C:\VulkanSDK\1.4.357.0' `
  -CudaEula 'C:\Program Files\NVIDIA GPU Computing Toolkit\CUDA\v13.3\EULA.txt' `
  -DumpbinPath 'C:\Program Files\Microsoft Visual Studio\18\Enterprise\VC\Tools\MSVC\14.51.36231\bin\Hostx64\x64\dumpbin.exe'
```

The script reconfigures the same build directory and `cmake --build` should
reuse completed objects. Run outside the filesystem sandbox when required:
MSBuild needs read access to `C:\Users\joseg\AppData\Local\Microsoft SDKs`.
The first attempt failed because the CUDA path was not supplied as a Visual
Studio toolset. The script now uses `-T cuda=<path>`. Another attempt failed
because MSBuild exceeded the Windows path limit; the shorter `build/gpu-whisper`
directory fixed that. Do not return to the old long build directory.

## Remaining work

1. Finish the incremental build. The script then inspects recursive DLL
   imports, copies only allowlisted CUDA runtime DLLs, includes the NVIDIA
   EULA and source/build metadata, and writes
   `build/bin/native-candidates/windows-amd64-gpu/` with `SHA256SUMS`.
   If it stops on an import, compare that DLL against Attachment A of the
   installed CUDA EULA before changing the allowlist.
2. Inspect the actual candidate (`DLL_IMPORTS.txt`, CUDA DLLs, CMake cache,
   source archive and notices). Verify `whisper-cli --version` and help.
   Test a short transcription on this RTX 4060 Ti in Auto mode and with
   `--no-gpu`. Vulkan-only and CPU-only host tests remain necessary before
   claiming broad hardware compatibility.
3. After review, copy the exact candidate `SHA256SUMS` to
   `third_party/approved/windows-amd64-gpu.sha256`. The GPU release gate in
   `tools/nativecheck/main.go` intentionally fails until this is done.
4. Build the installer with
   `scripts/package-windows.ps1 -NativeDirectory <candidate> -Variant gpu`.
   This stages the approved DLLs and CUDA EULA and builds the NSIS installer.

## Code already changed

The Auto/CPU choice is persisted in `internal/config/config.go`, passed through
`app.go`, used by `internal/transcription/service.go`, and connected to
`frontend/src/components/views/SettingsView.tsx`. GPU packaging and license
gates are in `scripts/package-windows.ps1`, `tools/nativecheck/main.go`,
`THIRD_PARTY_NOTICES.txt`, and `docs/native-dependencies.md`. Generated Wails
bindings under `frontend/wailsjs/go/` were updated. Do not overwrite other
pre-existing uncommitted work on video export, captions or styles.

Before this build attempt, Go tests and TypeScript checking passed. The
PowerShell scripts parsed successfully. The native GPU build and installer
have not passed yet.
