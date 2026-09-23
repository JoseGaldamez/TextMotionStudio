# FFmpeg release provenance

FFmpeg source is pinned to official tag `n9.0.2`; no built binary is approved
for commercial distribution yet. The locally staged
Windows `8.1.1-essentials_build-www.gyan.dev` executable contains
`--enable-gpl`, `--enable-libx264`, and `--enable-libx265`; do not ship it.

Before release, review the exact source archive and commit, generated
`changes.diff`, complete per-target `-buildconf` output, build commands,
imports, and SHA-256 of each platform binary. Commit approved configurations
and hashes as described in `docs/native-dependencies.md`.
Preserve the corresponding source and publish it alongside the application at
the planned `/opensource/ffmpeg` page. The release checker rejects GPL and
nonfree builds but cannot prove all license obligations from flags alone.

For the current transcription pipeline, retain common MP4, MOV, MKV, WebM,
MP3, AAC and WAV demuxing/decoding plus PCM 16-bit WAV output. Do not enable
`libx264` or `libx265`. Future H.264 export should assess system encoders
(`h264_videotoolbox` on macOS, `h264_mf` on Windows) separately.
