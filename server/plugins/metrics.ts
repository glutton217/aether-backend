import { defineNitroPlugin } from '#imports';
import { scopedLogger } from '../utils/logger';

const log = scopedLogger('metrics-plugin');

// Check if we're running in Cloudflare Workers
const isCloudflareWorkers = typeof globalThis.caches !== 'undefined' && typeof process?.versions?.node === 'undefined';

export default defineNitroPlugin(async () => {
  // Skip metrics initialization on Cloudflare Workers
  // Cloudflare Workers don't support filesystem operations used by metrics
  // and async I/O in plugins runs in global scope which is disallowed
  if (isCloudflareWorkers) {
    log.info('Skipping metrics initialization on Cloudflare Workers');
    return;
  }
  
  try {
    log.info('Initializing metrics at startup...');
    // Lazy import to avoid loading prom-client at module level
    const { initializeAllMetrics } = await import('../utils/metrics');
    await initializeAllMetrics();
    log.info('Metrics initialized.');
  } catch (error) {
    log.error('Failed to initialize metrics at startup', {
      error: error instanceof Error ? error.message : String(error),
    });
  }
});


