#!/bin/sh
set -eu

if [ "$#" -ne 3 ]; then
  echo "usage: $0 <arm64|amd64> <native-directory> <app-bundle>" >&2
  exit 1
fi

arch=$1
native=$2
app=$3
case "$arch" in arm64|amd64) ;; *) echo "unsupported architecture: $arch" >&2; exit 1 ;; esac
root=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
native=$(CDPATH= cd -- "$native" && pwd)
app=$(CDPATH= cd -- "$app" && pwd)
test -f "$native/ffmpeg"
test -f "$native/whisper-cli"
test -d "$app/Contents/MacOS"
cd "$root"
go run ./tools/nativecheck -target "darwin-$arch" -dir "$native" -report "$root/build/bin/native-build-report-darwin-$arch.txt"
destination="$app/Contents/Resources/bin/darwin-$arch"
mkdir -p "$destination"
cp "$native/ffmpeg" "$native/whisper-cli" "$destination/"
for library in "$native"/*.dylib; do
  if [ -f "$library" ]; then cp "$library" "$destination/"; fi
done
cp "$native/SHA256SUMS" "$destination/"
chmod 755 "$destination/ffmpeg" "$destination/whisper-cli"
go run ./tools/nativecheck -target "darwin-$arch" -dir "$destination"
cp "$root/THIRD_PARTY_NOTICES.txt" "$app/Contents/Resources/"
cp "$root/third_party/ffmpeg/LICENSE" "$app/Contents/Resources/FFMPEG_LICENSE.txt"
echo "Sign and notarize the completed app bundle after this step."
