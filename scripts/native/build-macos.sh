#!/bin/sh
# Run on a native macOS arm64 or x86_64 host with Xcode CLI tools and CMake.
set -eu

if [ "$(uname -s)" != Darwin ]; then echo 'Requires macOS.' >&2; exit 1; fi
case "$(uname -m)" in arm64) arch=arm64 ;; x86_64) arch=amd64 ;; *) echo 'Unsupported CPU.' >&2; exit 1 ;; esac
for command in git make clang cmake lipo shasum; do command -v "$command" >/dev/null || { echo "Missing $command" >&2; exit 1; }; done

root=$(CDPATH= cd -- "$(dirname -- "$0")/../.." && pwd)
ffmpeg_version=$(tr -d '\r\n' < "$root/third_party/ffmpeg/VERSION")
whisper_version=$(tr -d '\r\n' < "$root/third_party/whisper/VERSION")
target="darwin-$arch"
source_root="$root/build/bin/native-source/$target"
output="$root/build/bin/native-candidates/$target"
if [ -e "$source_root" ] || [ -e "$output" ]; then echo 'Build output already exists; use a fresh output location.' >&2; exit 1; fi
mkdir -p "$source_root" "$output"

git clone --depth 1 --branch "n$ffmpeg_version" https://github.com/FFmpeg/FFmpeg.git "$source_root/ffmpeg"
test "$(git -C "$source_root/ffmpeg" rev-parse HEAD)" = 946fcce07b6dcd0331c8cc609192aeff5e1924f8
cd "$source_root/ffmpeg"
if [ "$arch" = amd64 ]; then
  ./configure --disable-x86asm --enable-static --disable-shared \
    --disable-autodetect --disable-programs --enable-ffmpeg --disable-doc \
    --disable-debug --disable-ffplay --disable-ffprobe
else
  ./configure --enable-static --disable-shared \
    --disable-autodetect --disable-programs --enable-ffmpeg --disable-doc \
    --disable-debug --disable-ffplay --disable-ffprobe
fi
make -j2
cp ffmpeg "$output/ffmpeg"
git archive --format=tar.gz --output="$output/ffmpeg-source.tar.gz" HEAD
git diff > "$output/ffmpeg-changes.diff"

git clone --depth 1 --branch "v$whisper_version" https://github.com/ggml-org/whisper.cpp.git "$source_root/whisper.cpp"
test "$(git -C "$source_root/whisper.cpp" rev-parse HEAD)" = 306c88f4d1286aec1bf96e544632897886af5501
cmake -S "$source_root/whisper.cpp" -B "$source_root/whisper-build" \
  -DCMAKE_BUILD_TYPE=Release -DBUILD_SHARED_LIBS=OFF \
  -DGGML_BACKEND_DL=OFF -DGGML_NATIVE=OFF -DGGML_OPENMP=OFF \
  -DGGML_METAL=OFF -DWHISPER_BUILD_TESTS=OFF -DWHISPER_BUILD_EXAMPLES=ON
cmake --build "$source_root/whisper-build" --target whisper-cli -j 2
cp "$source_root/whisper-build/bin/whisper-cli" "$output/whisper-cli"
cp "$source_root/whisper-build/CMakeCache.txt" "$output/WHISPER_build-config.txt"
git -C "$source_root/whisper.cpp" archive --format=tar.gz --output="$output/whisper-source.tar.gz" HEAD

expected=x86_64
if [ "$arch" = arm64 ]; then expected=arm64; fi
for binary in "$output/ffmpeg" "$output/whisper-cli"; do
  lipo -archs "$binary" | grep -qw "$expected" || { echo "Wrong architecture: $binary" >&2; exit 1; }
  chmod 755 "$binary"
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
mkdir -p "$root/build/bin/ffmpeg-$ffmpeg_version-$target" "$root/build/bin/whisper-$whisper_version-$target"
ffmpeg_artifact="$root/build/bin/ffmpeg-$ffmpeg_version-$target"
whisper_artifact="$root/build/bin/whisper-$whisper_version-$target"
cp "$output/ffmpeg" "$ffmpeg_artifact/"
cp "$output/FFMPEG_VERSION" "$ffmpeg_artifact/VERSION"
cp "$output/FFMPEG_SOURCE.txt" "$ffmpeg_artifact/SOURCE.txt"
cp "$output/FFMPEG_LICENSE.txt" "$ffmpeg_artifact/LICENSE"
cp "$output/build-config.txt" "$ffmpeg_artifact/"
cp "$output/ffmpeg-source.tar.gz" "$output/ffmpeg-changes.diff" "$ffmpeg_artifact/"
cp "$output/whisper-cli" "$whisper_artifact/"
cp "$output/WHISPER_VERSION" "$whisper_artifact/VERSION"
cp "$output/WHISPER_SOURCE.txt" "$whisper_artifact/SOURCE.txt"
cp "$output/WHISPER_LICENSE.txt" "$whisper_artifact/LICENSE"
cp "$output/WHISPER_build-config.txt" "$whisper_artifact/build-config.txt"
cp "$output/whisper-source.tar.gz" "$whisper_artifact/"
shasum -a 256 "$output/ffmpeg" | awk '{print $1 "  ffmpeg"}' > "$ffmpeg_artifact/SHA256SUMS"
shasum -a 256 "$output/whisper-cli" | awk '{print $1 "  whisper-cli"}' > "$whisper_artifact/SHA256SUMS"
echo "Candidate only: $output"
