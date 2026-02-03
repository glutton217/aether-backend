import { defineNitroPlugin } from '#imports';
import { initializeAllMetrics } from '../utils/metrics';
import { scopedLogger } from '../utils/logger';

const log = scopedLogger('metrics-plugin');

export default defineNitroPlugin(async () => {
  // Skip metrics initialization on Cloudflare Workers
  // Cloudflare Workers don't support filesystem operations used by metrics
  // and async I/O in plugins runs in global scope which is disallowed
  if (process.env.CLOUDFLARE_WORKER || typeof globalThis.caches !== 'undefined') {
    log.info('Skipping metrics initialization on Cloudflare Workers');
    return;
  }
  
  try {
    log.info('Initializing metrics at startup...');
    await initializeAllMetrics();
    log.info('Metrics initialized.');
  } catch (error) {
    log.error('Failed to initialize metrics at startup', {
      error: error instanceof Error ? error.message : String(error),
    });
  }
});


