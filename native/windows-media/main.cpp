#include <windows.h>
#include <mfapi.h>
#include <mferror.h>
#include <mfidl.h>
#include <mfreadwrite.h>
#include <mftransform.h>
#include <wrl/client.h>

#include <algorithm>
#include <atomic>
#include <cmath>
#include <cstdint>
#include <cstdio>
#include <fstream>
#include <iostream>
#include <stdexcept>
#include <string>
#include <vector>

using Microsoft::WRL::ComPtr;

static std::atomic<bool> cancelled{false};

static BOOL WINAPI onConsoleEvent(DWORD) {
    cancelled = true;
    return TRUE;
}

static void check(HRESULT result, const char *operation) {
    if (FAILED(result)) {
        char message[160];
        std::snprintf(message, sizeof(message), "%s failed (0x%08lx)", operation,
                      static_cast<unsigned long>(result));
        throw std::runtime_error(message);
    }
}

static void ensureActive() {
    if (cancelled) throw std::runtime_error("Canceled");
}

struct MediaRuntime {
    MediaRuntime() {
        check(CoInitializeEx(nullptr, COINIT_MULTITHREADED), "COM initialization");
        try { check(MFStartup(MF_VERSION), "Media Foundation startup"); }
        catch (...) { CoUninitialize(); throw; }
    }
    ~MediaRuntime() { MFShutdown(); CoUninitialize(); }
};

static ComPtr<IMFMediaType> mediaType(GUID major, GUID subtype) {
    ComPtr<IMFMediaType> type;
    check(MFCreateMediaType(&type), "Create media type");
    check(type->SetGUID(MF_MT_MAJOR_TYPE, major), "Set major type");
    check(type->SetGUID(MF_MT_SUBTYPE, subtype), "Set subtype");
    return type;
}

static void probeEncoder(GUID category, GUID major, GUID subtype) {
    MFT_REGISTER_TYPE_INFO output = {major, subtype};
    IMFActivate **encoders = nullptr;
    UINT32 count = 0;
    check(MFTEnumEx(category, MFT_ENUM_FLAG_SYNCMFT | MFT_ENUM_FLAG_ASYNCMFT |
                   MFT_ENUM_FLAG_HARDWARE | MFT_ENUM_FLAG_LOCALMFT,
                   nullptr, &output, &encoders, &count), "Find Windows encoder");
    for (UINT32 index = 0; index < count; ++index) encoders[index]->Release();
    CoTaskMemFree(encoders);
    if (!count) throw std::runtime_error("Required Windows media encoder is unavailable");
}

static void probeExport() {
    probeEncoder(MFT_CATEGORY_VIDEO_ENCODER, MFMediaType_Video, MFVideoFormat_H264);
    probeEncoder(MFT_CATEGORY_AUDIO_ENCODER, MFMediaType_Audio, MFAudioFormat_AAC);
}

static const char *encoderDevice(IMFSinkWriter *writer, DWORD stream) {
    ComPtr<IMFTransform> encoder;
    if (FAILED(writer->GetServiceForStream(stream, GUID_NULL, IID_PPV_ARGS(&encoder))))
        return "system";
    ComPtr<IMFAttributes> attributes;
    if (FAILED(encoder->GetAttributes(&attributes))) return "cpu";
    UINT32 length = 0;
    return SUCCEEDED(attributes->GetStringLength(MFT_ENUM_HARDWARE_URL_Attribute, &length))
        ? "gpu" : "cpu";
}

static ComPtr<IMFSourceReader> sourceReader(const wchar_t *input, bool videoProcessing) {
    ComPtr<IMFAttributes> attributes;
    check(MFCreateAttributes(&attributes, 2), "Create reader attributes");
    if (videoProcessing)
        check(attributes->SetUINT32(MF_SOURCE_READER_ENABLE_VIDEO_PROCESSING, TRUE), "Enable video conversion");
    ComPtr<IMFSourceReader> reader;
    check(MFCreateSourceReaderFromURL(input, attributes.Get(), &reader), "Open source video");
    check(reader->SetStreamSelection(MF_SOURCE_READER_ALL_STREAMS, FALSE), "Deselect streams");
    return reader;
}

static bool selectStream(IMFSourceReader *reader, DWORD stream, GUID major, GUID subtype,
                         ComPtr<IMFMediaType> &selected) {
    ComPtr<IMFMediaType> native;
    if (FAILED(reader->GetNativeMediaType(stream, 0, &native))) return false;
    check(reader->SetStreamSelection(stream, TRUE), "Select source stream");
    auto requested = mediaType(major, subtype);
    check(reader->SetCurrentMediaType(stream, nullptr, requested.Get()), "Decode source stream");
    check(reader->GetCurrentMediaType(stream, &selected), "Get decoded media type");
    return true;
}

static DWORD streamIndex(IMFSourceReader *reader, GUID major) {
    for (DWORD index = 0; index < 100; ++index) {
        ComPtr<IMFMediaType> type;
        if (FAILED(reader->GetNativeMediaType(index, 0, &type))) break;
        GUID found;
        if (SUCCEEDED(type->GetGUID(MF_MT_MAJOR_TYPE, &found)) && found == major) return index;
    }
    return DWORD(-1);
}

static void put16(std::ofstream &out, uint16_t value) {
    char bytes[] = {static_cast<char>(value), static_cast<char>(value >> 8)};
    out.write(bytes, 2);
}

static void put32(std::ofstream &out, uint32_t value) {
    char bytes[] = {static_cast<char>(value), static_cast<char>(value >> 8),
                    static_cast<char>(value >> 16), static_cast<char>(value >> 24)};
    out.write(bytes, 4);
}

static void wavHeader(std::ofstream &out, uint32_t size) {
    out.seekp(0);
    out.write("RIFF", 4); put32(out, size + 36); out.write("WAVEfmt ", 8);
    put32(out, 16); put16(out, 1); put16(out, 1); put32(out, 16000);
    put32(out, 32000); put16(out, 2); put16(out, 16);
    out.write("data", 4); put32(out, size);
}

static void extractAudio(const wchar_t *input, const wchar_t *output) {
    auto reader = sourceReader(input, false);
    ComPtr<IMFMediaType> audio;
    if (!selectStream(reader.Get(), MF_SOURCE_READER_FIRST_AUDIO_STREAM,
                      MFMediaType_Audio, MFAudioFormat_PCM, audio))
        throw std::runtime_error("The video has no audio stream");
    auto requested = mediaType(MFMediaType_Audio, MFAudioFormat_PCM);
    check(requested->SetUINT32(MF_MT_AUDIO_NUM_CHANNELS, 1), "Set mono audio");
    check(requested->SetUINT32(MF_MT_AUDIO_SAMPLES_PER_SECOND, 16000), "Set audio rate");
    check(requested->SetUINT32(MF_MT_AUDIO_BITS_PER_SAMPLE, 16), "Set audio depth");
    check(requested->SetUINT32(MF_MT_AUDIO_BLOCK_ALIGNMENT, 2), "Set audio alignment");
    check(requested->SetUINT32(MF_MT_AUDIO_AVG_BYTES_PER_SECOND, 32000), "Set audio byte rate");
    check(reader->SetCurrentMediaType(MF_SOURCE_READER_FIRST_AUDIO_STREAM, nullptr, requested.Get()),
          "Convert audio to 16 kHz mono");
    std::ofstream wav(output, std::ios::binary | std::ios::trunc);
    if (!wav) throw std::runtime_error("Cannot create audio file");
    wavHeader(wav, 0);
    uint64_t bytesWritten = 0;
    for (;;) {
        ensureActive();
        DWORD stream = 0, flags = 0;
        LONGLONG timestamp = 0;
        ComPtr<IMFSample> sample;
        check(reader->ReadSample(MF_SOURCE_READER_FIRST_AUDIO_STREAM, 0, &stream, &flags,
                                 &timestamp, &sample), "Read audio sample");
        if (flags & MF_SOURCE_READERF_ENDOFSTREAM) break;
        if (!sample) continue;
        ComPtr<IMFMediaBuffer> buffer;
        check(sample->ConvertToContiguousBuffer(&buffer), "Get audio buffer");
        BYTE *data = nullptr;
        DWORD capacity = 0, length = 0;
        check(buffer->Lock(&data, &capacity, &length), "Lock audio buffer");
        wav.write(reinterpret_cast<char *>(data), length);
        buffer->Unlock();
        bytesWritten += length;
        if (!wav || bytesWritten > UINT32_MAX - 36) throw std::runtime_error("Audio file is too large");
    }
    wavHeader(wav, static_cast<uint32_t>(bytesWritten));
    if (!wav) throw std::runtime_error("Cannot finish audio file");
}

struct CaptionFrame {
    std::wstring path;
    LONGLONG end;
};

static std::vector<CaptionFrame> readManifest(const wchar_t *path) {
    std::wifstream file(path);
    if (!file) throw std::runtime_error("Cannot read caption manifest");
    std::vector<CaptionFrame> frames;
    double duration = 0;
    std::wstring folder(path);
    folder.resize(folder.find_last_of(L"\\/") + 1);
    double seconds = 0;
    while (file >> seconds) {
        if (!(seconds > 0) || !std::isfinite(seconds)) throw std::runtime_error("Invalid caption duration");
        duration += seconds;
        wchar_t filename[32];
        std::swprintf(filename, 32, L"%06zu.qoi", frames.size());
        frames.push_back({folder + filename, static_cast<LONGLONG>(std::llround(duration * 10000000.0))});
    }
    if (frames.empty() || !file.eof()) throw std::runtime_error("Invalid caption manifest");
    return frames;
}

// The Go frontend writes QOI using RGB, RGBA and RUN operations only.
static std::vector<uint8_t> readCaption(const std::wstring &path, int width, int height) {
    std::ifstream file(path, std::ios::binary | std::ios::ate);
    if (!file) throw std::runtime_error("Cannot read caption image");
    auto length = file.tellg();
    if (length < 22 || length > static_cast<std::streamoff>(width) * height * 5 + 22)
        throw std::runtime_error("Invalid caption image size");
    std::vector<uint8_t> encoded(static_cast<size_t>(length));
    file.seekg(0);
    file.read(reinterpret_cast<char *>(encoded.data()), length);
    if (!file || encoded[0] != 'q' || encoded[1] != 'o' || encoded[2] != 'i' || encoded[3] != 'f')
        throw std::runtime_error("Invalid caption image");
    auto dimension = [&](int index) {
        return (uint32_t(encoded[index]) << 24) | (uint32_t(encoded[index+1]) << 16) |
               (uint32_t(encoded[index+2]) << 8) | encoded[index+3];
    };
    if (dimension(4) != static_cast<uint32_t>(width) || dimension(8) != static_cast<uint32_t>(height))
        throw std::runtime_error("Caption dimensions differ from video");
    std::vector<uint8_t> rgba(static_cast<size_t>(width) * height * 4);
    uint8_t pixel[4] = {0, 0, 0, 255};
    size_t pos = 14;
    size_t run = 0;
    for (size_t i = 0; i < static_cast<size_t>(width) * height; ++i) {
        if (run) --run;
        else {
            if (pos >= encoded.size() - 8) throw std::runtime_error("Truncated caption image");
            auto op = encoded[pos++];
            if (op == 0xfe) {
                if (pos + 3 > encoded.size() - 8) throw std::runtime_error("Truncated caption image");
                for (int c = 0; c < 3; ++c) pixel[c] = encoded[pos++];
            } else if (op == 0xff) {
                if (pos + 4 > encoded.size() - 8) throw std::runtime_error("Truncated caption image");
                for (int c = 0; c < 4; ++c) pixel[c] = encoded[pos++];
            } else if ((op & 0xc0) == 0xc0) run = op & 0x3f;
            else throw std::runtime_error("Unsupported caption image operation");
        }
        for (int c = 0; c < 4; ++c) rgba[i*4+c] = pixel[c];
    }
    return rgba;
}

static void blend(BYTE *video, LONG stride, const std::vector<uint8_t> &caption,
                  int width, int height) {
    for (int y = 0; y < height; ++y) {
        BYTE *row = video + static_cast<ptrdiff_t>(y) * stride;
        const uint8_t *overlay = caption.data() + static_cast<size_t>(y) * width * 4;
        for (int x = 0; x < width; ++x) {
            auto alpha = overlay[x*4+3];
            if (!alpha) continue;
            BYTE *base = row + x*4;
            for (int channel = 0; channel < 3; ++channel) {
                // Media Foundation RGB32 is stored BGRA; canvas QOI is RGBA.
                int source = overlay[x*4+2-channel];
                base[channel] = static_cast<BYTE>((source*alpha + base[channel]*(255-alpha) + 127)/255);
            }
        }
    }
}

class LockedVideoFrame {
    ComPtr<IMFMediaBuffer> buffer;
    ComPtr<IMF2DBuffer> buffer2D;
    bool is2D = false;
public:
    BYTE *firstRow = nullptr;
    LONG stride = 0;

    LockedVideoFrame(IMFMediaBuffer *source, IMFMediaType *type, UINT32 width, UINT32 height)
        : buffer(source) {
        if (SUCCEEDED(buffer.As(&buffer2D)) &&
            SUCCEEDED(buffer2D->Lock2D(&firstRow, &stride))) {
            is2D = true;
        } else {
            buffer2D.Reset();
            BYTE *start = nullptr;
            DWORD capacity = 0, length = 0;
            check(buffer->Lock(&start, &capacity, &length), "Lock video buffer");
            UINT32 encodedStride = 0;
            if (SUCCEEDED(type->GetUINT32(MF_MT_DEFAULT_STRIDE, &encodedStride))) {
                stride = static_cast<LONG>(encodedStride);
            } else {
                HRESULT result = MFGetStrideForBitmapInfoHeader(MFVideoFormat_RGB32.Data1, width, &stride);
                if (FAILED(result)) { buffer->Unlock(); check(result, "Get RGB stride"); }
            }
            // Some decoders pad every RGB row without exposing IMF2DBuffer or
            // updating MF_MT_DEFAULT_STRIDE (for example, 1080 pixels in 1088).
            if (length % height == 0 && length / height >= width*4 &&
                length / height <= width*4 + 4096) {
                LONG actualPitch = static_cast<LONG>(length / height);
                stride = stride < 0 ? -actualPitch : actualPitch;
            }
            auto pitch = std::abs(stride);
            if (pitch < static_cast<LONG>(width*4) ||
                length < static_cast<size_t>(height-1)*pitch + width*4) {
                buffer->Unlock();
                throw std::runtime_error("Invalid decoded video buffer");
            }
            firstRow = stride < 0 ? start + static_cast<size_t>(height-1)*pitch : start;
        }
        if (std::abs(stride) < static_cast<LONG>(width*4)) {
            if (is2D) buffer2D->Unlock2D();
            throw std::runtime_error("Invalid decoded video stride");
        }
    }

    ~LockedVideoFrame() {
        if (is2D) buffer2D->Unlock2D();
        else buffer->Unlock();
    }
};

static ComPtr<IMFSample> prepareVideoSample(IMFSample *source, IMFMediaType *sourceType,
                                            UINT32 rawWidth, UINT32 rawHeight, UINT32 rotation,
                                            const std::vector<uint8_t> &caption,
                                            LONGLONG timestamp) {
    ComPtr<IMFMediaBuffer> sourceBuffer;
    check(source->ConvertToContiguousBuffer(&sourceBuffer), "Get decoded video buffer");
    LockedVideoFrame input(sourceBuffer.Get(), sourceType, rawWidth, rawHeight);
    UINT32 outputWidth = rotation == 90 || rotation == 270 ? rawHeight : rawWidth;
    UINT32 outputHeight = rotation == 90 || rotation == 270 ? rawWidth : rawHeight;
    ComPtr<IMFMediaBuffer> outputBuffer;
    check(MFCreateMemoryBuffer(outputWidth*outputHeight*4, &outputBuffer), "Create packed video buffer");
    BYTE *outputBytes = nullptr;
    DWORD outputCapacity = 0, outputLength = 0;
    check(outputBuffer->Lock(&outputBytes, &outputCapacity, &outputLength), "Lock packed video output");
    // The encoder receives tightly packed, bottom-up RGB32 regardless of decoder padding.
    for (UINT32 y = 0; y < rawHeight; ++y) {
        BYTE *row = input.firstRow + static_cast<ptrdiff_t>(y) * input.stride;
        if (!rotation) {
            std::copy_n(row, rawWidth*4, outputBytes + static_cast<size_t>(outputHeight-1-y)*outputWidth*4);
            continue;
        }
        for (UINT32 x = 0; x < rawWidth; ++x) {
            UINT32 targetX = 0, targetY = 0;
            if (rotation == 90) { targetX = rawHeight - 1 - y; targetY = x; }
            else if (rotation == 180) { targetX = rawWidth - 1 - x; targetY = rawHeight - 1 - y; }
            else { targetX = y; targetY = rawWidth - 1 - x; }
            std::copy_n(row + x*4, 4, outputBytes + (static_cast<size_t>(outputHeight-1-targetY)*outputWidth + targetX)*4);
        }
    }
    blend(outputBytes + static_cast<size_t>(outputHeight-1)*outputWidth*4,
          -static_cast<LONG>(outputWidth*4), caption, outputWidth, outputHeight);
    outputBuffer->Unlock();
    check(outputBuffer->SetCurrentLength(outputWidth*outputHeight*4), "Set packed frame size");
    ComPtr<IMFSample> result;
    check(MFCreateSample(&result), "Create packed video sample");
    check(result->AddBuffer(outputBuffer.Get()), "Add packed video buffer");
    check(result->SetSampleTime(timestamp), "Set packed sample time");
    LONGLONG sampleDuration = 0;
    if (SUCCEEDED(source->GetSampleDuration(&sampleDuration)))
        check(result->SetSampleDuration(sampleDuration), "Set packed sample duration");
    return result;
}

static void exportVideo(const wchar_t *input, const wchar_t *output,
                        const wchar_t *manifest, UINT32 width, UINT32 height,
                        double duration) {
    auto frames = readManifest(manifest);
    auto reader = sourceReader(input, true);
    ComPtr<IMFMediaType> nativeVideo;
    check(reader->GetNativeMediaType(MF_SOURCE_READER_FIRST_VIDEO_STREAM, 0, &nativeVideo),
          "Get source video type");
    UINT32 rotation = MFGetAttributeUINT32(nativeVideo.Get(), MF_MT_VIDEO_ROTATION, 0);
    if (rotation != 0 && rotation != 90 && rotation != 180 && rotation != 270)
        throw std::runtime_error("Unsupported source video rotation");
    ComPtr<IMFMediaType> decodedVideo;
    if (!selectStream(reader.Get(), MF_SOURCE_READER_FIRST_VIDEO_STREAM,
                      MFMediaType_Video, MFVideoFormat_RGB32, decodedVideo))
        throw std::runtime_error("The source has no supported video stream");
    DWORD videoIndex = streamIndex(reader.Get(), MFMediaType_Video);
    DWORD audioIndex = streamIndex(reader.Get(), MFMediaType_Audio);
    UINT32 actualWidth = 0, actualHeight = 0;
    check(MFGetAttributeSize(decodedVideo.Get(), MF_MT_FRAME_SIZE, &actualWidth, &actualHeight),
          "Get video dimensions");
    UINT32 displayWidth = rotation == 90 || rotation == 270 ? actualHeight : actualWidth;
    UINT32 displayHeight = rotation == 90 || rotation == 270 ? actualWidth : actualHeight;
    if (displayWidth != width || displayHeight != height)
        throw std::runtime_error("Source dimensions changed after preview (decoded " +
                                 std::to_string(actualWidth) + "x" + std::to_string(actualHeight) +
                                 ", rotation " + std::to_string(rotation) + ")");
    UINT32 fpsNumerator = 30, fpsDenominator = 1;
    MFGetAttributeRatio(decodedVideo.Get(), MF_MT_FRAME_RATE, &fpsNumerator, &fpsDenominator);
    if (!fpsNumerator || !fpsDenominator) { fpsNumerator = 30; fpsDenominator = 1; }

    ComPtr<IMFMediaType> decodedAudio;
    bool hasAudio = selectStream(reader.Get(), MF_SOURCE_READER_FIRST_AUDIO_STREAM,
                                 MFMediaType_Audio, MFAudioFormat_PCM, decodedAudio);
    if (hasAudio) {
        auto pcm = mediaType(MFMediaType_Audio, MFAudioFormat_PCM);
        check(pcm->SetUINT32(MF_MT_AUDIO_NUM_CHANNELS, 2), "Set stereo audio");
        check(pcm->SetUINT32(MF_MT_AUDIO_SAMPLES_PER_SECOND, 48000), "Set audio rate");
        check(pcm->SetUINT32(MF_MT_AUDIO_BITS_PER_SAMPLE, 16), "Set audio depth");
        check(pcm->SetUINT32(MF_MT_AUDIO_BLOCK_ALIGNMENT, 4), "Set audio alignment");
        check(pcm->SetUINT32(MF_MT_AUDIO_AVG_BYTES_PER_SECOND, 192000), "Set audio byte rate");
        check(reader->SetCurrentMediaType(MF_SOURCE_READER_FIRST_AUDIO_STREAM, nullptr, pcm.Get()),
              "Convert source audio");
        check(reader->GetCurrentMediaType(MF_SOURCE_READER_FIRST_AUDIO_STREAM, &decodedAudio),
              "Get converted audio type");
    }

    ComPtr<IMFAttributes> writerAttributes;
    check(MFCreateAttributes(&writerAttributes, 1), "Create writer attributes");
    check(writerAttributes->SetUINT32(MF_READWRITE_ENABLE_HARDWARE_TRANSFORMS, TRUE),
          "Enable available hardware encoder");
    ComPtr<IMFSinkWriter> writer;
    check(MFCreateSinkWriterFromURL(output, nullptr, writerAttributes.Get(), &writer),
          "Create MP4 writer");

    auto h264 = mediaType(MFMediaType_Video, MFVideoFormat_H264);
    check(MFSetAttributeSize(h264.Get(), MF_MT_FRAME_SIZE, width, height), "Set H.264 dimensions");
    check(MFSetAttributeRatio(h264.Get(), MF_MT_FRAME_RATE, fpsNumerator, fpsDenominator), "Set H.264 frame rate");
    check(MFSetAttributeRatio(h264.Get(), MF_MT_PIXEL_ASPECT_RATIO, 1, 1), "Set pixel aspect ratio");
    check(h264->SetUINT32(MF_MT_INTERLACE_MODE, MFVideoInterlace_Progressive), "Set progressive video");
    double pixelsPerSecond = double(width) * height * fpsNumerator / fpsDenominator;
    UINT32 bitrate = static_cast<UINT32>(std::clamp(pixelsPerSecond * 0.45, 8000000.0, 100000000.0));
    check(h264->SetUINT32(MF_MT_AVG_BITRATE, bitrate), "Set video bitrate");
    DWORD videoStream = 0;
    check(writer->AddStream(h264.Get(), &videoStream), "Add H.264 stream");
    auto encoderInput = mediaType(MFMediaType_Video, MFVideoFormat_RGB32);
    check(MFSetAttributeSize(encoderInput.Get(), MF_MT_FRAME_SIZE, width, height), "Set video input size");
    check(MFSetAttributeRatio(encoderInput.Get(), MF_MT_FRAME_RATE, fpsNumerator, fpsDenominator), "Set video input frame rate");
    check(MFSetAttributeRatio(encoderInput.Get(), MF_MT_PIXEL_ASPECT_RATIO, 1, 1), "Set video input aspect ratio");
    check(encoderInput->SetUINT32(MF_MT_INTERLACE_MODE, MFVideoInterlace_Progressive), "Set video input scan mode");
    check(encoderInput->SetUINT32(MF_MT_DEFAULT_STRIDE, static_cast<UINT32>(-static_cast<LONG>(width*4))),
          "Set packed video stride");
    check(writer->SetInputMediaType(videoStream, encoderInput.Get(), nullptr), "Set video input type");

    DWORD audioStream = 0;
    if (hasAudio) {
        auto aac = mediaType(MFMediaType_Audio, MFAudioFormat_AAC);
        check(aac->SetUINT32(MF_MT_AUDIO_NUM_CHANNELS, 2), "Set AAC channels");
        check(aac->SetUINT32(MF_MT_AUDIO_SAMPLES_PER_SECOND, 48000), "Set AAC rate");
        check(aac->SetUINT32(MF_MT_AUDIO_BITS_PER_SAMPLE, 16), "Set AAC depth");
        check(aac->SetUINT32(MF_MT_AUDIO_AVG_BYTES_PER_SECOND, 40000), "Set AAC bitrate");
        check(aac->SetUINT32(MF_MT_AUDIO_BLOCK_ALIGNMENT, 1), "Set AAC alignment");
        check(writer->AddStream(aac.Get(), &audioStream), "Add AAC stream");
        check(writer->SetInputMediaType(audioStream, decodedAudio.Get(), nullptr), "Set audio input type");
    }
    check(writer->BeginWriting(), "Begin MP4 export");
    std::cout << "device:" << encoderDevice(writer.Get(), videoStream) << std::endl;

    size_t captionIndex = 0;
    std::vector<uint8_t> caption;
    int lastProgress = -1;
    bool videoEnded = false, audioEnded = !hasAudio;
    while (!videoEnded || !audioEnded) {
        ensureActive();
        DWORD stream = 0, flags = 0;
        LONGLONG timestamp = 0;
        ComPtr<IMFSample> sample;
        check(reader->ReadSample(MF_SOURCE_READER_ANY_STREAM, 0, &stream, &flags,
                                 &timestamp, &sample), "Read source sample");
        if (flags & MF_SOURCE_READERF_ENDOFSTREAM) {
            if (stream == videoIndex) videoEnded = true;
            if (stream == audioIndex) audioEnded = true;
        }
        if (!sample) continue;
        if (stream == videoIndex) {
            while (captionIndex + 1 < frames.size() && timestamp >= frames[captionIndex].end) {
                ++captionIndex;
                caption.clear();
            }
            if (caption.empty()) caption = readCaption(frames[captionIndex].path, width, height);
            auto prepared = prepareVideoSample(sample.Get(), decodedVideo.Get(), actualWidth, actualHeight,
                                               rotation, caption, timestamp);
            check(writer->WriteSample(videoStream, prepared.Get()), "Encode video frame");
        } else if (hasAudio) {
            check(writer->WriteSample(audioStream, sample.Get()), "Encode audio sample");
        }
        int progress = static_cast<int>(std::clamp(double(timestamp) / (duration * 100000.0), 0.0, 99.0));
        if (progress > lastProgress) { std::cout << progress << std::endl; lastProgress = progress; }
    }
    ensureActive();
    check(writer->Finalize(), "Finish MP4 export");
    std::cout << 100 << std::endl;
}

int wmain(int argc, wchar_t **argv) {
    SetConsoleCtrlHandler(onConsoleEvent, TRUE);
    try {
        if (argc < 2) throw std::runtime_error("Usage: windows-media probe | extract <source> <wav> | export <source> <mp4> <manifest> <width> <height> <duration>");
        MediaRuntime runtime;
        if (std::wstring(argv[1]) == L"probe" && argc == 2) probeExport();
        else if (std::wstring(argv[1]) == L"extract" && argc == 4) extractAudio(argv[2], argv[3]);
        else if (std::wstring(argv[1]) == L"export" && argc == 8)
            exportVideo(argv[2], argv[3], argv[4], std::stoul(argv[5]), std::stoul(argv[6]), std::stod(argv[7]));
        else throw std::runtime_error("Invalid command arguments");
        return 0;
    } catch (const std::exception &error) {
        std::cerr << error.what() << std::endl;
        return 1;
    }
}
