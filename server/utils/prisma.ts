import { PrismaNeon } from '@prisma/adapter-neon';
import { PrismaClient } from '../../generated/client';

// Lazy initialization to avoid global scope async I/O in Cloudflare Workers
// Cloudflare Workers disallow async operations in global scope, so we must
// initialize Prisma only when called inside a handler
let prismaInstance: PrismaClient | null = null;
let adapterInstance: PrismaNeon | null = null;

function getPrismaClient(): PrismaClient {
  // Only initialize when actually called (inside a handler, not at module load)
  if (!prismaInstance) {
    if (!adapterInstance) {
      adapterInstance = new PrismaNeon({
        connectionString: process.env.DATABASE_URL || '',
      });
    }
    
    prismaInstance = new PrismaClient({ adapter: adapterInstance });
  }
  
  return prismaInstance;
}

// Export a Proxy that lazily initializes Prisma when accessed
// This ensures no async I/O happens at module load time
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const client = getPrismaClient();
    const value = (client as any)[prop];
    // If it's a method, bind it to the client to preserve 'this' context
    return typeof value === 'function' ? value.bind(client) : value;
  },
});
