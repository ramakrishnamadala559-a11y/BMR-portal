import fs from 'fs/promises';
import path from 'path';

/**
 * Decodes a base64 encoded data URI image and saves it to public/uploads/
 * Returns the public URL path to serve the image statically.
 */
export async function saveBase64Image(base64Data: string, prefix: string = 'file'): Promise<string> {
  if (!base64Data || !base64Data.startsWith('data:image/')) {
    return base64Data; // Return as-is if it's already a URL or empty
  }

  try {
    const matches = base64Data.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      return base64Data;
    }

    const fileType = matches[1];
    const extension = fileType.split('/')[1] || 'png';
    const buffer = Buffer.from(matches[2], 'base64');

    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    
    // Ensure the uploads directory exists
    await fs.mkdir(uploadsDir, { recursive: true });

    const fileName = `${prefix}-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}.${extension}`;
    const filePath = path.join(uploadsDir, fileName);

    await fs.writeFile(filePath, buffer);

    return `/uploads/${fileName}`;
  } catch (error) {
    console.error('Error saving base64 image:', error);
    return base64Data;
  }
}
