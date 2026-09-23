# Native binary approval

No binary is approved yet. Candidate builds write `SHA256SUMS`. After reviewing
source provenance, binary imports, license configuration, functionality, and
matching source archives, copy that file to `<target>.sha256` here and copy the
captured FFmpeg `build-config.txt` to
`third_party/ffmpeg/build-config-<target>.txt`. Do not copy hashes merely to
make a failing build pass. `nativecheck` then compares every packaged native
executable/library byte-for-byte with this manifest. Rebuilds may yield new
hashes and require fresh approval.
