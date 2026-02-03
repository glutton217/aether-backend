import { scopedLogger } from '../../utils/logger';

const log = scopedLogger('metrics-endpoint');

// Check if we're running in Cloudflare Workers
const isCloudflareWorkers = typeof globalThis.caches !== 'undefined' && typeof process?.versions?.node === 'undefined';

let isInitialized = false;

async function ensureMetricsInitialized() {
  if (isCloudflareWorkers) return; // Skip in Workers
  
  if (!isInitialized) {
    log.info('Initializing metrics from endpoint...', { evt: 'init_start' });
    const { initializeAllMetrics } = await import('../../utils/metrics');
    await initializeAllMetrics();
    isInitialized = true;
    log.info('Metrics initialized from endpoint', { evt: 'init_complete' });
  }
}

export default defineEventHandler(async event => {
  // Metrics not available in Cloudflare Workers
  if (isCloudflareWorkers) {
    return { message: 'Metrics not available in Cloudflare Workers environment' };
  }
  
  try {
    await ensureMetricsInitialized();
    // Lazy import prom-client to avoid loading in Workers
    const { register } = await import('prom-client');
    // Use the default registry (all-time metrics)
    const metrics = await register.metrics();
    event.node.res.setHeader('Content-Type', register.contentType);
    return metrics;
  } catch (error) {
    log.error('Error in metrics endpoint:', {
      evt: 'metrics_error',
      error: error instanceof Error ? error.message : String(error),
    });
    throw createError({
      statusCode: 500,
      message: error instanceof Error ? error.message : 'Failed to collect metrics',
    });
  }
});
