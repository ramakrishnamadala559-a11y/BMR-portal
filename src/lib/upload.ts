import fs from 'fs/promises';
import path from 'path';

/**
 * Decodes a base64 encoded data URI image and saves it to public/uploads/
 * Returns the public URL path to serve the image statically.
 */
export async function saveBase64Image(base64Data: string, prefix: string = 'file'): Promise<string> {
  // Always return the base64 data URI directly to store it in the database.
  // This prevents 404 image errors on Vercel (ephemeral disk storage) and makes uploads portable between local development and production.
  return base64Data;
}
