# Native dependencies and release packaging

Windows resolves `whisper-cli` and the small `windows-media.exe` Media Foundation
helper from the application bundle. Video and audio codecs are supplied by
Windows. macOS still resolves bundled FFmpeg and `whisper-cli`. Wails development
builds may use `TEXTMOTION_WHISPER_PATH`, `TEXTMOTION_MEDIA_PATH` (Windows), or
`TEXTMOTION_FFMPEG_PATH` (macOS); release builds ignore those overrides.
Missing files produce a friendly caption-generation error and a detailed log.

| Target | Native tools | Notices |
| --- | --- | --- |
| Windows x64 | `bin/windows-amd64/` next to `TextMotionStudio.exe` | next to the exe |
| macOS arm64 | `.app/Contents/Resources/bin/darwin-arm64/` | `.app/Contents/Resources/` |
| macOS x64 | `.app/Contents/Resources/bin/darwin-amd64/` | `.app/Contents/Resources/` |

## Windows media helper

`native/windows-media/main.cpp` uses the Windows Media Foundation source reader,
H.264/AAC encoders and MP4 sink. `scripts/native/build-windows-media.ps1` builds
it with Visual C++ and a static C runtime. The installer includes the helper,
not FFmpeg, and the release checker pins its SHA-256 with the Whisper binary.
On Windows N, users can install Microsoft's Media Feature Pack as an optional
Windows feature. MP4 export requires H.264 and AAC encoders. MOV/ProRes export
is unavailable in the Windows build.

## FFmpeg (macOS only)

Source is pinned to official FFmpeg 9.0.2, tag `n9.0.2`, commit recorded in
`third_party/ffmpeg/SOURCE.txt`. macOS binaries remain unapproved.
The macOS build script compiles the official
tag without external codec libraries, capture `ffmpeg -buildconf`, and produce
source archives plus `changes.diff`. A known local Windows 8.1.1 build is
GPL-enabled and remains excluded from release. The application invokes FFmpeg
as a separate process; Go does not link FFmpeg libraries.

The checker rejects GPL/nonfree/x264/x265/xvid/vidstab flags and compares the
binary's exact configuration and SHA-256 against reviewed per-target metadata.
This is a technical gate, not a substitute for source/notice/legal review.

## whisper.cpp

Source is pinned to official whisper.cpp `v1.9.2`; see
`third_party/whisper/SOURCE.txt` and its MIT license. The tested Windows MSVC
build requests CPU-only, static internal libraries, baseline x64 instructions,
and no dynamic ggml backend. Its candidate SHA-256 is recorded in
`third_party/whisper/SHA256SUMS.windows-amd64-msvc-candidate`; `dumpbin` reports
only KERNEL32.dll and ADVAPI32.dll imports. The old locally staged Windows
1.9.2 executable predates this process and remains unapproved. The new
candidate must be paired with the Windows media helper and checked against
the approved bundle hashes.

### Optional Windows CUDA + Vulkan build

`scripts/native/build-whisper-gpu-windows.ps1` builds the same pinned source
with dynamically loaded CPU, CUDA and Vulkan backends. Supply a Windows CUDA
Toolkit, Vulkan SDK, and the EULA file accompanying that CUDA Toolkit. The
script copies only CUDA DLLs found in the binary import tree and rejects
unresolved imports. The NVIDIA graphics driver and Vulkan driver remain
system dependencies. Neither development SDK is included in the installer.

The whisper build script combines the GPU build with the Windows Media
Foundation helper and writes `build/bin/native-candidates/windows-amd64-gpu/`.
Its DLL imports, CMake cache,
CUDA EULA and hashes were reviewed. CUDA, forced CPU, Vulkan-only and automatic
CPU fallback transcription passed locally on an RTX 4060 Ti host; actual
AMD/Intel GPU machines have not been tested. The approved native hashes are in
`third_party/approved/windows-amd64-gpu.sha256`. Package with
`scripts/package-windows.ps1 -NativeDirectory build/bin/native-candidates/windows-amd64-gpu -Variant gpu`.
The release checker refuses a GPU installer if that approval file is missing
or any approved binary changes.
The existing CPU release process and approval remain separate.

Settings persist an Auto/CPU choice. Auto lets whisper.cpp select CUDA, then
Vulkan, then CPU according to available backend devices. CPU passes
`--no-gpu` to the transcription process. MP4 export uses Windows Media
Foundation and enables hardware encoder transforms when available, with the
Windows software encoder available as fallback.

## Models

OpenAI Whisper models (MIT) are downloaded from Hugging Face during onboarding
into per-user application data. No `ggml-*.bin` model belongs in the installer.

## WebView2 and signing

The Windows NSIS installer uses Wails' existing check and official WebView2
bootstrapper fallback. It is not bundled in full. Microsoft Store EXE/MSI
submission has an offline-installer requirement; resolve this conflict before
Store submission (for example, use a Store-compatible packaging approach).
The selected Store path is a full-trust desktop MSIX, documented in
`docs/microsoft-store-distribution.md`; the Store re-signs that package after
certification, so this path does not depend on the NSIS installer or a commercial
publisher certificate.
The macOS helper copies tools into the app bundle before signing; sign nested
executables/libraries and then the app, followed by notarization. No signing
identity or notarization workflow is configured yet.

## Release commands

On Windows x64, run `scripts/native/build-whisper-windows.ps1` with Visual
Studio/CMake, then pass its candidate directory to
`scripts/native/build-windows.sh` under MSYS2 UCRT64. On
native macOS arm64 and Intel hosts with
Xcode CLI tools and CMake, run `scripts/native/build-macos.sh`. Neither script
has been executed in this Windows environment. Both pin official Git tags and
commits, then create candidate artifacts under `build/bin/`:

- `ffmpeg-9.0.2-darwin-<arch>/`: executable, version, LGPL, source identification,
  captured build config, SHA256SUMS, exact source archive and `changes.diff`.
- `whisper-1.9.2-<target>/`: executable, version, MIT license, source ID, CMake
  cache/build configuration, SHA256SUMS and exact source archive.
- `native-candidates/<target>/`: combined binaries and a combined SHA256SUMS
  for packaging.

The build scripts run `go run ./tools/nativecheck -candidate -target <target>
-dir <candidate-dir>`. This records hashes and configuration but explicitly
does **not** approve the candidate. Review provenance, binary imports, codec
compatibility and source package first. For macOS also review FFmpeg configuration.
Copy the combined SHA256SUMS into
`third_party/approved/<target>.sha256`. Normal `go run ./tools/nativecheck`
is strict and fails while those files are absent or any byte changes.

On Windows, pass the approved combined directory to
`scripts/package-windows.ps1 -NativeDirectory <directory>`. The checker runs
on staged files, then Wails builds NSIS. Plain `wails build -nsis` is not a release workflow:
it does not validate native provenance or hashes.

On macOS, first build the appropriate Wails `.app`, then run
`scripts/package-macos.sh arm64|amd64 <native-directory> <app-bundle>` before
codesign/notarization. This has not been verified on a macOS host.

There is currently no `.github/workflows` pipeline in this repository. A GPU
Windows NSIS installer was built locally from the approved binaries. No macOS
bundle or cross-vendor GPU hardware test has been verified.
