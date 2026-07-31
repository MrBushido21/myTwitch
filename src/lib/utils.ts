import { writeFile, mkdir } from 'fs/promises';
import { join, extname } from 'path';
import { randomUUID } from 'crypto';

export const saveImageAndReturnFilename = async (file: any) => {
    const uploadDir = join(process.cwd(), 'upload');
    await mkdir(uploadDir, { recursive: true }); // создаст папку, если её нет

    const filename = `${randomUUID()}${extname(file.originalname)}`;
    await writeFile(join(uploadDir, filename), file.buffer);
    return filename
}