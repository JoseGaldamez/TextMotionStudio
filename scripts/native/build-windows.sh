#!/usr/bin/env bash
# Run under MSYS2 UCRT64 on a native Windows x64 machine.
set -euo pipefail

if [[ "$#" != 1 ]]; then echo "usage: $0 <approved whisper MSVC candidate directory>" >&2; exit 1; fi
whisper_artifact=$1
if [[ "${MSYSTEM:-}" != UCRT64 ]] || [[ "$(uname -m)" != x86_64 ]]; then
  echo 'Requires native Windows x64 MSYS2 UCRT64.' >&2
  exit 1
fi
for command in cygpath sha256sum powershell.exe; do command -v "$command" >/dev/null || { echo "Missing $command" >&2; exit 1; }; done

root=$(cd "$(dirname "$0")/../.." && pwd)
whisper_version=$(<"$root/third_party/whisper/VERSION")
output="$root/build/bin/native-candidates/windows-amd64"
if [[ -e "$output" ]]; then echo 'Candidate already exists; use a fresh output location.' >&2; exit 1; fi
test -f "$whisper_artifact/whisper-cli.exe"
test -f "$whisper_artifact/SHA256SUMS"
test "$(cat "$whisper_artifact/VERSION")" = "$whisper_version"
cmp "$whisper_artifact/SOURCE.txt" "$root/third_party/whisper/SOURCE.txt"
(cd "$whisper_artifact" && tr -d '\r' < SHA256SUMS | sha256sum -c -)
test "$(sha256sum "$whisper_artifact/whisper-cli.exe" | awk '{print $1}')" = "$(awk '{print $1}' "$root/third_party/whisper/SHA256SUMS.windows-amd64-msvc-candidate")"

mkdir -p "$output"
cp "$whisper_artifact/whisper-cli.exe" "$output/"
cp "$whisper_artifact/build-config.txt" "$output/WHISPER_build-config.txt"
cp "$whisper_artifact/whisper-source.tar.gz" "$output/"
cp "$root/third_party/whisper/SOURCE.txt" "$output/WHISPER_SOURCE.txt"
cp "$root/third_party/whisper/LICENSE" "$output/WHISPER_LICENSE.txt"
cp "$root/THIRD_PARTY_NOTICES.txt" "$output/"
printf '%s\n' "$whisper_version" > "$output/WHISPER_VERSION"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "$(cygpath -w "$root/scripts/native/build-windows-media.ps1")" -OutputDirectory "$(cygpath -w "$output")"

cd "$root"
go run ./tools/nativecheck -candidate -target windows-amd64 -dir "$output"
echo "Candidate only: $output"
