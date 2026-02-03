import { scopedLogger } from '../../utils/logger';

const log = scopedLogger('metrics-weekly-endpoint');

// Check if we're running in Cloudflare Workers
const isCloudflareWorkers = typeof globalThis.caches !== 'undefined' && typeof process?.versions?.node === 'undefined';

let isInitialized = false;

async function ensureMetricsInitialized() {
  if (isCloudflareWorkers) return;
  
  if (!isInitialized) {
    log.info('Initializing metrics from weekly endpoint...', { evt: 'init_start' });
    const { initializeAllMetrics } = await import('../../utils/metrics');
    await initializeAllMetrics();
    isInitialized = true;
    log.info('Metrics initialized from weekly endpoint', { evt: 'init_complete' });
  }
}

export default defineEventHandler(async event => {
  // Metrics not available in Cloudflare Workers
  if (isCloudflareWorkers) {
    return { message: 'Metrics not available in Cloudflare Workers environment' };
  }
  
  try {
    await ensureMetricsInitialized();
    // Lazy import to avoid loading prom-client in Workers
    const { getRegistry } = await import('../../utils/metrics');
    // Get the weekly registry
    const weeklyRegistry = getRegistry('weekly');

    const metrics = await weeklyRegistry.metrics();
    event.node.res.setHeader('Content-Type', weeklyRegistry.contentType);
    return metrics;
  } catch (error) {
    log.error('Error in weekly metrics endpoint:', {
      evt: 'metrics_error',
      error: error instanceof Error ? error.message : String(error),
    });
    throw createError({
      statusCode: 500,
      message: error instanceof Error ? error.message : 'Failed to collect weekly metrics',
    });
  }
}); 