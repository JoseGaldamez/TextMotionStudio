#!/usr/bin/env bash
# Run under MSYS2 UCRT64 on a native Windows x64 machine.
set -euo pipefail

if [[ "$#" != 1 ]]; then echo "usage: $0 <approved-source whisper MSVC candidate directory>" >&2; exit 1; fi
whisper_artifact=$1

if [[ "${MSYSTEM:-}" != UCRT64 ]] || [[ "$(uname -m)" != x86_64 ]]; then
  echo 'Requires native Windows x64 MSYS2 UCRT64.' >&2
  exit 1
fi
for command in git make gcc objdump sha256sum; do command -v "$command" >/dev/null || { echo "Missing $command" >&2; exit 1; }; done

root=$(cd "$(dirname "$0")/../.." && pwd)
ffmpeg_version=$(<"$root/third_party/ffmpeg/VERSION")
whisper_version=$(<"$root/third_party/whisper/VERSION")
target=windows-amd64
source_root="$root/build/bin/native-source/$target/ffmpeg"
output="$root/build/bin/native-candidates/$target"
if [[ -e "$source_root" || -e "$output" ]]; then echo 'Build output already exists; use a fresh output location.' >&2; exit 1; fi
test -f "$whisper_artifact/whisper-cli.exe"
test -f "$whisper_artifact/SHA256SUMS"
test "$(cat "$whisper_artifact/VERSION")" = "$whisper_version"
cmp "$whisper_artifact/SOURCE.txt" "$root/third_party/whisper/SOURCE.txt"
(cd "$whisper_artifact" && sha256sum -c SHA256SUMS)
test "$(sha256sum "$whisper_artifact/whisper-cli.exe" | awk '{print $1}')" = "$(awk '{print $1}' "$root/third_party/whisper/SHA256SUMS.windows-amd64-msvc-candidate")"
mkdir -p "$(dirname "$source_root")" "$output"

git clone --depth 1 --branch "n$ffmpeg_version" https://github.com/FFmpeg/FFmpeg.git "$source_root"
test "$(git -C "$source_root" rev-parse HEAD)" = 946fcce07b6dcd0331c8cc609192aeff5e1924f8
pushd "$source_root" >/dev/null
./configure --target-os=mingw32 --arch=x86_64 --enable-static --disable-shared \
  --disable-autodetect --disable-programs --enable-ffmpeg --disable-doc \
  --disable-debug --disable-ffplay --disable-ffprobe
make -j2
cp ffmpeg.exe "$output/ffmpeg.exe"
git archive --format=tar.gz --output="$output/ffmpeg-source.tar.gz" HEAD
git diff > "$output/ffmpeg-changes.diff"
popd >/dev/null

cp "$whisper_artifact/whisper-cli.exe" "$output/"
cp "$whisper_artifact/build-config.txt" "$output/WHISPER_build-config.txt"
cp "$whisper_artifact/whisper-source.tar.gz" "$output/"

for binary in "$output/ffmpeg.exe" "$output/whisper-cli.exe"; do
  if objdump -p "$binary" | grep -Ei 'DLL Name: (msys-|libgcc|libstdc\+\+|libwinpthread)'; then
    echo "Unbundled toolchain DLL dependency: $binary" >&2
    exit 1
  fi
done

cp "$root/third_party/ffmpeg/SOURCE.txt" "$output/FFMPEG_SOURCE.txt"
cp "$root/third_party/whisper/SOURCE.txt" "$output/WHISPER_SOURCE.txt"
cp "$root/third_party/ffmpeg/LICENSE" "$output/FFMPEG_LICENSE.txt"
cp "$root/third_party/whisper/LICENSE" "$output/WHISPER_LICENSE.txt"
cp "$root/THIRD_PARTY_NOTICES.txt" "$output/"
printf '%s\n' "$ffmpeg_version" > "$output/FFMPEG_VERSION"
printf '%s\n' "$whisper_version" > "$output/WHISPER_VERSION"

cd "$root"
go run ./tools/nativecheck -candidate -target "$target" -dir "$output"
mkdir -p "$root/build/bin/ffmpeg-$ffmpeg_version-$target"
ffmpeg_artifact="$root/build/bin/ffmpeg-$ffmpeg_version-$target"
cp "$output/ffmpeg.exe" "$ffmpeg_artifact/"
cp "$output/FFMPEG_VERSION" "$ffmpeg_artifact/VERSION"
cp "$output/FFMPEG_SOURCE.txt" "$ffmpeg_artifact/SOURCE.txt"
cp "$output/FFMPEG_LICENSE.txt" "$ffmpeg_artifact/LICENSE"
cp "$output/build-config.txt" "$ffmpeg_artifact/"
cp "$output/ffmpeg-source.tar.gz" "$output/ffmpeg-changes.diff" "$ffmpeg_artifact/"
sha256sum "$output/ffmpeg.exe" | awk '{print $1 "  ffmpeg.exe"}' > "$ffmpeg_artifact/SHA256SUMS"
echo "Candidate only: $output"
