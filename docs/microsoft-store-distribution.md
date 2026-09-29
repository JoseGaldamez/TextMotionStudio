# Microsoft Store distribution target

TextMotion Studio's preferred public Windows distribution channel is the
Microsoft Store using an **MSIX package**. The Store submission must not use
the NSIS/MSI/EXE ingestion path: Microsoft re-signs accepted MSIX/AppX packages,
while MSI and EXE submissions require the publisher to provide an Authenticode
signature.

Official references:

- [MSIX package requirements and Store signing](https://learn.microsoft.com/en-us/windows/apps/publish/publish-your-app/msix/app-package-requirements)
- [Choose a Windows app distribution path](https://learn.microsoft.com/en-us/windows/apps/package-and-deploy/choose-distribution-path)
- [Generate MSIX package components for a desktop app](https://learn.microsoft.com/en-us/windows/msix/desktop/desktop-to-uwp-manual-conversion)
- [Prepare a desktop application for MSIX packaging](https://learn.microsoft.com/en-us/windows/msix/desktop/desktop-to-uwp-prepare)
- [Test an MSIX package](https://learn.microsoft.com/en-us/windows/msix/desktop/desktop-to-uwp-debug)

## Durable compatibility constraints

Future implementation work must preserve these constraints unless the product
owner explicitly changes the distribution strategy:

- Treat the installed package directory as read-only. Configuration, downloaded
  Whisper models, temporary audio, caches, and user projects belong in supported
  per-user data or user-selected locations.
- Do not require administrator elevation for application functionality.
- Keep `windows-media.exe`, `whisper-cli.exe`, and required DLLs package-relative at
  `bin/windows-amd64/`; production path resolution depends on this layout.
- Declare the Wails executable as a full-trust desktop application using
  `EntryPoint="Windows.FullTrustApplication"` and the restricted
  `runFullTrust` capability.
- Package notices and license texts with the application. Continue validating
  native binaries against `third_party/approved/windows-amd64.sha256` before
  staging them.
- Keep Whisper model downloads in the per-user model directory; do not add
  `ggml-*.bin` models to the MSIX.
- Do not make the Microsoft Store package depend on an NSIS custom action,
  machine-wide registry write, service, driver, or external installer.
- Verify the WebView2 runtime strategy for Store certification before the first
  submission; the NSIS bootstrapper is not part of an MSIX package.
- Test install, launch, model download, transcription, update, and uninstall on
  a clean Windows 10/11 environment before submission.

## Package contents

The MSIX staging root must contain at least:

```text
AppxManifest.xml
TextMotionStudio.exe
THIRD_PARTY_NOTICES.txt
Assets/
bin/windows-amd64/windows-media.exe
bin/windows-amd64/whisper-cli.exe
bin/windows-amd64/*.dll
```

Use the exact `Identity Name`, `Publisher`, and `PublisherDisplayName` assigned
to the new TextMotion Studio product in Partner Center. Do not reuse Kapivara's
product identity. The account-level publisher value may be the same, but it
must be copied from TextMotion Studio's Partner Center identity page.

For local installation tests, create a self-signed certificate whose subject
matches the manifest `Publisher`, package with `MakeAppx.exe`, and sign with
`SignTool.exe`. That certificate is for local testing only. Partner Center will
replace the signature after certification, so no commercial signing certificate
is required for the Store MSIX submission.

## Licensing remains separate from signing

Store signing does not remove third-party license obligations. The Windows
package includes Whisper and optional CUDA runtime notices; Windows provides
the media codecs through Media Foundation. See `docs/native-dependencies.md`.

## Work deferred until release preparation

Do not build the final MSIX pipeline while the product is still under active
feature development. At release-preparation time, add a repository script that:

1. validates the approved Windows native binaries;
2. stages the executable, native tools, notices, and Store assets;
3. injects the exact Partner Center identity and release version;
4. runs `MakeAppx.exe`;
5. optionally signs the package with a local test certificate; and
6. produces the artifact intended for Partner Center submission.
