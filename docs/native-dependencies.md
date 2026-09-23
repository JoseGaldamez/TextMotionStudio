# Native dependencies and release packaging

`whisper-cli` and FFmpeg are resolved only from the executable's bundle in
production. Wails development builds may use `TEXTMOTION_WHISPER_PATH` and
`TEXTMOTION_FFMPEG_PATH`; release builds ignore those environment variables.
Missing files produce a friendly caption-generation error and a detailed log.

| Target | Native tools | Notices |
| --- | --- | --- |
| Windows x64 | `bin/windows-amd64/` next to `TextMotionStudio.exe` | next to the exe |
| macOS arm64 | `.app/Contents/Resources/bin/darwin-arm64/` | `.app/Contents/Resources/` |
| macOS x64 | `.app/Contents/Resources/bin/darwin-amd64/` | `.app/Contents/Resources/` |

## FFmpeg

Source is pinned to official FFmpeg 9.0.2, tag `n9.0.2`, commit recorded in
`third_party/ffmpeg/SOURCE.txt`. This version is selected as source; **no built
binary is approved yet**. The Windows/macOS build scripts compile the official
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
candidate is **also not approved as a complete release bundle** until paired
with the controlled FFmpeg build and tested in the installer.

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
`scripts/native/build-windows.sh` under MSYS2 UCRT64 with GCC and make. On
native macOS arm64 and Intel hosts with
Xcode CLI tools and CMake, run `scripts/native/build-macos.sh`. Neither script
has been executed in this Windows environment. Both pin official Git tags and
commits, then create candidate artifacts under `build/bin/`:

- `ffmpeg-9.0.2-<target>/`: executable, version, LGPL, source identification,
  captured build config, SHA256SUMS, exact source archive and `changes.diff`.
- `whisper-1.9.2-<target>/`: executable, version, MIT license, source ID, CMake
  cache/build configuration, SHA256SUMS and exact source archive.
- `native-candidates/<target>/`: combined binaries and a combined SHA256SUMS
  for packaging.

The build scripts run `go run ./tools/nativecheck -candidate -target <target>
-dir <candidate-dir>`. This records hashes and configuration but explicitly
does **not** approve the candidate. Review provenance, FFmpeg configuration,
binary imports, codec compatibility and source package first. Then copy the
captured FFmpeg configuration into
`third_party/ffmpeg/build-config-<target>.txt` and the combined SHA256SUMS into
`third_party/approved/<target>.sha256`. Normal `go run ./tools/nativecheck`
is strict and fails while those files are absent or any byte changes.

On Windows, pass the approved combined directory to
`scripts/package-windows.ps1 -NativeDirectory <directory>`. The checker runs
before staging, then Wails builds NSIS. The installer includes notices and the
complete FFmpeg LGPL text. Plain `wails build -nsis` is not a release workflow:
it does not validate native provenance or hashes.

On macOS, first build the appropriate Wails `.app`, then run
`scripts/package-macos.sh arm64|amd64 <native-directory> <app-bundle>` before
codesign/notarization. This has not been verified on a macOS host.

There is currently no `.github/workflows` pipeline in this repository. The
native scripts are ready for native runners, but no CI build or final Windows
installer/macOS bundle has been verified. The Windows MSVC whisper candidate
was compiled locally; the host lacks MSYS2 for FFmpeg. Installing a system
toolchain was intentionally not done as part of validation.
