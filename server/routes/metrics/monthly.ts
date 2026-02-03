import { scopedLogger } from '../../utils/logger';

const log = scopedLogger('metrics-monthly-endpoint');

// Check if we're running in Cloudflare Workers
const isCloudflareWorkers = typeof globalThis.caches !== 'undefined' && typeof process?.versions?.node === 'undefined';

let isInitialized = false;

async function ensureMetricsInitialized() {
  if (isCloudflareWorkers) return;
  
  if (!isInitialized) {
    log.info('Initializing metrics from monthly endpoint...', { evt: 'init_start' });
    const { initializeAllMetrics } = await import('../../utils/metrics');
    await initializeAllMetrics();
    isInitialized = true;
    log.info('Metrics initialized from monthly endpoint', { evt: 'init_complete' });
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
    // Get the monthly registry
    const monthlyRegistry = getRegistry('monthly');

    const metrics = await monthlyRegistry.metrics();
    event.node.res.setHeader('Content-Type', monthlyRegistry.contentType);
    return metrics;
  } catch (error) {
    log.error('Error in monthly metrics endpoint:', {
      evt: 'metrics_error',
      error: error instanceof Error ? error.message : String(error),
    });
    throw createError({
      statusCode: 500,
      message: error instanceof Error ? error.message : 'Failed to collect monthly metrics',
    });
  }
}); 