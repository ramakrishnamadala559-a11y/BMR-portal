import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

// If DATABASE_URL is not set (e.g. running scripts or incorrect shell context),
// load it directly from the local .env file fallback
if (!process.env.DATABASE_URL) {
  try {
    const envPath = path.resolve(process.cwd(), '.env');
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf8');
      const match = envContent.match(/^DATABASE_URL\s*=\s*["']?([^"'\r\n]+)["']?/m);
      if (match && match[1]) {
        process.env.DATABASE_URL = match[1];
      }
    } else {
      // Try parent directory fallback if running from a subdirectory
      const parentEnvPath = path.resolve(process.cwd(), '..', '.env');
      if (fs.existsSync(parentEnvPath)) {
        const envContent = fs.readFileSync(parentEnvPath, 'utf8');
        const match = envContent.match(/^DATABASE_URL\s*=\s*["']?([^"'\r\n]+)["']?/m);
        if (match && match[1]) {
          process.env.DATABASE_URL = match[1];
        }
      }
    }
  } catch (err) {
    console.error('Error loading fallback .env file:', err);
  }
}

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const db =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db;
export default db;
