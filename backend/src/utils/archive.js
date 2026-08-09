import archiver from 'archiver';
import fs from 'node:fs';

export function createZipArchive(sourceDir, outputStream) {
  return new Promise((resolve, reject) => {
    const archive = archiver('zip', { zlib: { level: 9 } });
    outputStream.on('close', resolve);
    outputStream.on('error', reject);
    archive.on('error', reject);
    archive.pipe(outputStream);
    archive.directory(sourceDir, false);
    void archive.finalize();
  });
}
