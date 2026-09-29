#!/usr/bin/env bash
# Run under MSYS2 UCRT64 after building the approved Windows GPU whisper candidate.
set -euo pipefail

if [[ "${MSYSTEM:-}" != UCRT64 ]] || [[ "$(uname -m)" != x86_64 ]]; then
  echo 'Requires native Windows x64 MSYS2 UCRT64.' >&2
  exit 1
fi
for command in git make gcc pkg-config sha256sum; do
  command -v "$command" >/dev/null || { echo "Missing $command" >&2; exit 1; }
done

root=$(cd "$(dirname "$0")/../.." && pwd)
ffmpeg_source="$root/build/ffmpeg-source-nvenc"
headers="$root/build/nv-codec-headers"
baseline="$root/build/bin/native-candidates/windows-amd64-gpu"
output="$root/build/bin/native-candidates/windows-amd64-gpu-nvenc"
if [[ -e "$ffmpeg_source" || -e "$headers" || -e "$output" ]]; then
  echo 'NVENC build paths already exist; use fresh build paths.' >&2
  exit 1
fi
test -f "$baseline/SHA256SUMS"
(cd "$baseline" && sha256sum -c SHA256SUMS)

git clone --depth 1 --branch n9.0.2 https://github.com/FFmpeg/FFmpeg.git "$ffmpeg_source"
git clone --depth 1 --branch n12.1.14.1 https://github.com/FFmpeg/nv-codec-headers.git "$headers"
test "$(git -C "$ffmpeg_source" rev-parse HEAD)" = 946fcce07b6dcd0331c8cc609192aeff5e1924f8
test "$(git -C "$headers" rev-parse HEAD)" = 7c8e7fc751f803c672b42c37d9199c8a4f98b327
(cd "$headers" && make PREFIX="$headers" all)

pushd "$ffmpeg_source" >/dev/null
printf '9.0.2\n' > VERSION
PKG_CONFIG_PATH="$headers" ./configure --target-os=mingw32 --arch=x86_64 \
  --enable-static --disable-shared --disable-autodetect --disable-programs \
  --enable-ffmpeg --disable-doc --disable-debug --disable-ffplay --disable-ffprobe \
  --extra-ldflags=-static --enable-ffnvcodec --enable-nvenc
make -j2
./ffmpeg.exe -encoders | grep -q h264_nvenc
popd >/dev/null

mkdir -p "$output"
cp -a "$baseline"/. "$output"/
cp "$ffmpeg_source/ffmpeg.exe" "$output/ffmpeg.exe"
"$output/ffmpeg.exe" -buildconf > "$output/build-config.txt" 2>&1
(cd "$output" && sha256sum *.exe *.dll | sort -k2 > SHA256SUMS)
echo "NVENC candidate created: $output"
