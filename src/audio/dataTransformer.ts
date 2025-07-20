import fs from 'fs';
import { Transform, TransformCallback } from 'stream';
import { pipeline } from 'stream/promises';

export class AudioDataTransformer {
  // Configuration constants
  private static readonly MAX_BUFFER_SIZE = 50 * 1024 * 1024; // 50MB max buffer (handles large audio files)
  private static readonly MAX_ID3V2_TAG_SIZE = 10 * 1024 * 1024; // 10MB max ID3v2 tag (some have large artwork)
  //   private static readonly MAX_FRAME_SIZE = 4096; // Typical max MP3 frame size
  private static readonly PROCESSING_CHUNK_SIZE = 1024 * 1024; // Process in 1MB chunks

  constructor() {}

  // Helper method to find MP3 frame sync pattern (0xFF 0xF*)
  private findMp3FrameSync(buffer: Buffer, startOffset: number = 0): number {
    for (let i = startOffset; i < buffer.length - 1; i++) {
      if (buffer[i] === 0xff && (buffer[i + 1] & 0xe0) === 0xe0) {
        return i;
      }
    }
    return -1;
  }

  // Helper method to get MP3 frame length from header
  private getMp3FrameLength(buffer: Buffer, offset: number): number {
    if (offset + 4 > buffer.length) return 0; // Need at least 4 bytes for header

    const header = buffer.readUInt32BE(offset);

    // Extract header fields
    const version = (header >> 19) & 0x3;
    const layer = (header >> 17) & 0x3;
    const bitrateIndex = (header >> 12) & 0xf;
    const samplingRateIndex = (header >> 10) & 0x3;
    const padding = (header >> 9) & 0x1;

    // Bitrate table (kbps) - simplified for MPEG1 Layer III
    const bitrateTable = [
      0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 0,
    ];

    // Sample rate table (Hz) - simplified for MPEG1
    const sampleRateTable = [44100, 48000, 32000, 0];

    if (bitrateIndex === 0 || bitrateIndex === 15 || samplingRateIndex === 3) {
      return 0; // Invalid frame
    }

    const bitrate = bitrateTable[bitrateIndex] * 1000;
    const sampleRate = sampleRateTable[samplingRateIndex];

    if (version === 3 && layer === 1) {
      // MPEG1 Layer III
      return Math.floor((144 * bitrate) / sampleRate) + padding;
    }

    return 0; // Unsupported format
  }

  // Helper method to find complete MP3 frames in buffer
  private findCompleteFrames(buffer: Buffer): {
    frames: Buffer;
    remainder: Buffer;
  } {
    let offset = 0;
    let lastFrameEnd = 0;

    while (offset < buffer.length) {
      const syncOffset = this.findMp3FrameSync(buffer, offset);
      if (syncOffset === -1) break;

      const frameLength = this.getMp3FrameLength(buffer, syncOffset);
      if (frameLength === 0) {
        offset = syncOffset + 1;
        continue;
      }

      if (syncOffset + frameLength <= buffer.length) {
        // Complete frame found
        lastFrameEnd = syncOffset + frameLength;
        offset = lastFrameEnd;
      } else {
        // Incomplete frame
        break;
      }
    }

    return {
      frames: buffer.subarray(0, lastFrameEnd),
      remainder: buffer.subarray(lastFrameEnd),
    };
  }

  // Helper method to extract audio parameters from MP3 frame header
  private extractAudioParams(
    buffer: Buffer,
    offset: number
  ): {
    version: number;
    layer: number;
    bitrate: number;
    sampleRate: number;
    valid: boolean;
  } {
    if (offset + 4 > buffer.length) {
      return { version: 0, layer: 0, bitrate: 0, sampleRate: 0, valid: false };
    }

    const header = buffer.readUInt32BE(offset);

    const version = (header >> 19) & 0x3;
    const layer = (header >> 17) & 0x3;
    const bitrateIndex = (header >> 12) & 0xf;
    const samplingRateIndex = (header >> 10) & 0x3;

    const bitrateTable = [
      0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 0,
    ];
    const sampleRateTable = [44100, 48000, 32000, 0];

    if (bitrateIndex === 0 || bitrateIndex === 15 || samplingRateIndex === 3) {
      return { version: 0, layer: 0, bitrate: 0, sampleRate: 0, valid: false };
    }

    return {
      version,
      layer,
      bitrate: bitrateTable[bitrateIndex],
      sampleRate: sampleRateTable[samplingRateIndex],
      valid: true,
    };
  }

  // Method to validate audio file compatibility
  private async validateAudioCompatibility(
    inputFiles: string[]
  ): Promise<string[]> {
    const warnings: string[] = [];

    if (inputFiles.length < 2) return warnings;

    const fileParams: Array<{
      version: number;
      layer: number;
      bitrate: number;
      sampleRate: number;
      valid: boolean;
    }> = [];

    // Read first few bytes from each file to check compatibility
    for (const file of inputFiles) {
      try {
        const buffer = Buffer.alloc(1024); // Read first 1KB
        const fd = await fs.promises.open(file, 'r');
        await fd.read(buffer, 0, 1024, 0);
        await fd.close();

        // Find first MP3 frame
        const syncOffset = this.findMp3FrameSync(buffer);
        if (syncOffset !== -1) {
          const params = this.extractAudioParams(buffer, syncOffset);
          fileParams.push(params);
        } else {
          fileParams.push({
            version: 0,
            layer: 0,
            bitrate: 0,
            sampleRate: 0,
            valid: false,
          });
          warnings.push(`Warning: Could not find valid MP3 frame in ${file}`);
        }
      } catch (error) {
        fileParams.push({
          version: 0,
          layer: 0,
          bitrate: 0,
          sampleRate: 0,
          valid: false,
        });
        warnings.push(
          `Warning: Could not read audio parameters from ${file}: ${error}`
        );
      }
    }

    // Check for consistency
    const validParams = fileParams.filter((p) => p.valid);
    if (validParams.length > 1) {
      const firstParams = validParams[0];

      for (let i = 1; i < validParams.length; i++) {
        const currentParams = validParams[i];

        if (currentParams.sampleRate !== firstParams.sampleRate) {
          warnings.push(
            `Warning: Sample rate mismatch - File 1: ${
              firstParams.sampleRate
            }Hz, File ${i + 1}: ${currentParams.sampleRate}Hz`
          );
        }

        if (Math.abs(currentParams.bitrate - firstParams.bitrate) > 64) {
          warnings.push(
            `Warning: Significant bitrate difference - File 1: ${
              firstParams.bitrate
            }kbps, File ${i + 1}: ${currentParams.bitrate}kbps`
          );
        }

        if (
          currentParams.version !== firstParams.version ||
          currentParams.layer !== firstParams.layer
        ) {
          warnings.push(
            `Warning: Different MPEG version/layer - this may cause compatibility issues`
          );
        }
      }
    }

    return warnings;
  }

  async concatenate(inputFiles: string[], outputFile: string) {
    // 1. Validate input file compatibility
    const warnings = await this.validateAudioCompatibility(inputFiles);
    warnings.forEach((warning) => console.warn(warning));

    // 2. Create the main output stream
    const outputStream = fs.createWriteStream(outputFile);

    // 3. Loop through each input file with index (we need the index later)
    for (let i = 0; i < inputFiles.length; i++) {
      const inputStream = fs.createReadStream(inputFiles[i]);

      const isFirst = i === 0;
      const isLast = i === inputFiles.length - 1;
      const transform = this.createStripperTransform(isFirst, isLast);

      try {
        console.log(
          `Processing file ${i + 1}/${inputFiles.length}: ${inputFiles[i]}`
        );
        await pipeline(inputStream, transform, outputStream, {
          end: false,
        });
        console.log(`Successfully processed: ${inputFiles[i]}`);
      } catch (error) {
        throw new Error(
          `Failed to process file ${inputFiles[i]} (file ${i + 1}/${
            inputFiles.length
          }): ${error}`
        );
      }
    }

    // Manually close the output stream
    outputStream.end();
    console.log(`Finalizing concatenated output: ${outputFile}`);

    return new Promise<void>((resolve, reject) => {
      outputStream.on('finish', () => {
        console.log(`Successfully created concatenated MP3: ${outputFile}`);
        resolve();
      });
      outputStream.on('error', (error) => {
        reject(
          new Error(`Failed to write output file ${outputFile}: ${error}`)
        );
      });
    });
  }

  createStripperTransform(isFirst: boolean, isLast: boolean) {
    let headerStripped = isFirst;
    let buffer = Buffer.alloc(0);
    const ID3v2 = [0x49, 0x44, 0x33]; // The start tag of a file (mp3)
    const ID3v1 = [0x54, 0x41, 0x47]; // The end tag of a file (mp3)
    const ID3v2TagLength = 10; // bytes
    const ID3v1TagLength = 128; // bytes
    return new Transform({
      transform: (
        chunk: any,
        _: BufferEncoding,
        callback: TransformCallback
      ) => {
        buffer = Buffer.concat([buffer, chunk]);

        // Safety check: prevent excessive buffer growth
        if (buffer.length > AudioDataTransformer.MAX_BUFFER_SIZE) {
          callback(
            new Error(
              `Buffer size exceeded maximum limit: ${AudioDataTransformer.MAX_BUFFER_SIZE} bytes`
            )
          );
          return;
        }

        if (!headerStripped && buffer.byteLength >= ID3v2TagLength) {
          if (
            buffer[0] === ID3v2[0] &&
            buffer[1] === ID3v2[1] &&
            buffer[2] === ID3v2[2]
          ) {
            // Found ID3v2 tag! Use synchsafe integer decoding
            const size =
              ((buffer[6] & 0x7f) << 21) |
              ((buffer[7] & 0x7f) << 14) |
              ((buffer[8] & 0x7f) << 7) |
              (buffer[9] & 0x7f);
            const totalTagSize = size + 10; // +10 for the header itself

            // Validate tag size to prevent excessive memory usage
            if (totalTagSize > AudioDataTransformer.MAX_ID3V2_TAG_SIZE) {
              callback(
                new Error(
                  `ID3v2 tag size too large: ${totalTagSize} bytes (max: ${AudioDataTransformer.MAX_ID3V2_TAG_SIZE})`
                )
              );
              return;
            }

            if (buffer.length >= totalTagSize) {
              buffer = buffer.subarray(totalTagSize);
              headerStripped = true;
            } else {
              // Wait for more data to complete the tag
              callback(null, null);
              return;
            }
          } else {
            // No ID3v2 tag found
            headerStripped = true;
          }
        }

        if (headerStripped) {
          // Process buffer in chunks while maintaining frame boundaries
          if (buffer.length >= AudioDataTransformer.PROCESSING_CHUNK_SIZE) {
            const { frames, remainder } = this.findCompleteFrames(buffer);

            if (frames.length > 0) {
              callback(null, frames);
              buffer = remainder as any;
            } else {
              // If we can't find complete frames but buffer is large, output partial data
              // to prevent excessive buffering (this shouldn't happen with valid MP3s)
              if (
                buffer.length >
                AudioDataTransformer.PROCESSING_CHUNK_SIZE * 2
              ) {
                console.warn(
                  'Warning: Large buffer without complete MP3 frames detected, outputting partial data'
                );
                const partialOutput = buffer.subarray(
                  0,
                  AudioDataTransformer.PROCESSING_CHUNK_SIZE
                );
                buffer = buffer.subarray(
                  AudioDataTransformer.PROCESSING_CHUNK_SIZE
                );
                callback(null, partialOutput);
              } else {
                callback(null, null);
              }
            }
          } else {
            // Buffer not large enough for chunk processing, try to find any complete frames
            const { frames, remainder } = this.findCompleteFrames(buffer);

            if (frames.length > 0) {
              callback(null, frames);
              buffer = remainder as any;
            } else {
              callback(null, null);
            }
          }
        } else {
          // Still accumulating data for header analysis
          callback(null, null);
        }
      },
      flush: (callback) => {
        if (isLast) {
          // For the last file, preserve ID3v1 tag and output remaining data
          callback(null, buffer);
          return;
        }

        // For non-last files, strip ID3v1 tag if present
        if (buffer.byteLength >= ID3v1TagLength) {
          if (
            buffer[buffer.length - ID3v1TagLength] === ID3v1[0] &&
            buffer[buffer.length - ID3v1TagLength + 1] === ID3v1[1] &&
            buffer[buffer.length - ID3v1TagLength + 2] === ID3v1[2]
          ) {
            buffer = buffer.subarray(0, buffer.length - ID3v1TagLength);
          }
        }

        // Output only complete frames, keep remainder for frame integrity
        const { frames } = this.findCompleteFrames(buffer);

        if (frames.length > 0) {
          callback(null, frames);
        } else {
          // If no complete frames, output remaining data to avoid data loss
          // This might cause minor artifacts but prevents silent failures
          callback(null, buffer);
        }
      },
    });
  }
}
