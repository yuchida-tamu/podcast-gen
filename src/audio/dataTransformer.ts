import fs from 'fs';
import { Transform, TransformCallback } from 'stream';
import { pipeline } from 'stream/promises';

export class AudioDataTransformer {
  constructor() {
  }

  async concatenate(inputFiles: string[], outputFile: string) {
    // 1. Create the main output stream
    const outputStream = fs.createWriteStream(outputFile);
    //2. Loop through each input file with index (we need the index later)
    for (let i = 0; i < inputFiles.length; i++) {
      const inputStream = fs.createReadStream(inputFiles[i]);

      const isFirst = i === 0;
      const isLast = i === inputFiles.length - 1;
      const transform = this.createStripperTransform(isFirst, isLast);

      await pipeline(inputStream, transform, outputStream, {
        end: false,
      });
    }

    // Manually close the output stream
    outputStream.end();

    return new Promise<void>((resolve, reject) => {
      outputStream.on('finish', resolve);
      outputStream.on('error', reject);
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
        encoding: BufferEncoding,
        callback: TransformCallback
      ) => {
        buffer = Buffer.concat([buffer, chunk]);
        if (!headerStripped && buffer.byteLength >= ID3v2TagLength) {
          if (
            buffer[0] === ID3v2[0] &&
            buffer[1] === ID3v2[1] &&
            buffer[2] === ID3v2[2]
          ) {
            // Found ID3v2 tag!
            const size =
              (buffer[6] << 21) |
              (buffer[7] << 14) |
              (buffer[8] << 7) |
              buffer[9];
            const totalTagSize = size + 10; // +10 for the header itself

            if (buffer.length >= totalTagSize) {
              buffer = buffer.slice(totalTagSize);
              headerStripped = true;
            }
          } else {
            // no tag found
            headerStripped = true;
          }
        }

        if (headerStripped) {
          callback(null, buffer);
          buffer = Buffer.alloc(0);
        }
      },
      flush: (callback) => {
        if (isLast) {
          callback(null, buffer);
          return;
        }

        if (buffer.byteLength < ID3v1TagLength) {
          callback(null, buffer);
          return;
        }

        if (
          buffer[buffer.length - ID3v1TagLength] === ID3v1[0] &&
          buffer[buffer.length - ID3v1TagLength + 1] === ID3v1[1] &&
          buffer[buffer.length - ID3v1TagLength + 2] === ID3v1[2]
        ) {
          buffer = buffer.slice(0, buffer.length - ID3v1TagLength);
        }

        callback(null, buffer);
      },
    });
  }
}
