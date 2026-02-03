import { z } from 'zod';
import { scopedLogger } from '~/utils/logger';

const log = scopedLogger('metrics-providers');

// Check if we're running in Cloudflare Workers
const isCloudflareWorkers = typeof globalThis.caches !== 'undefined' && typeof process?.versions?.node === 'undefined';

let isInitialized = false;

async function ensureMetricsInitialized() {
  if (isCloudflareWorkers) return;
  
  if (!isInitialized) {
    log.info('Initializing metrics from providers endpoint...', { evt: 'init_start' });
    const { setupMetrics } = await import('~/utils/metrics');
    await setupMetrics();
    isInitialized = true;
    log.info('Metrics initialized from providers endpoint', { evt: 'init_complete' });
  }
}

const metricsProviderSchema = z.object({
  tmdbId: z.string(),
  type: z.string(),
  title: z.string(),
  seasonId: z.string().optional(),
  episodeId: z.string().optional(),
  status: z.string(),
  providerId: z.string(),
  embedId: z.string().optional(),
  errorMessage: z.string().optional(),
  fullError: z.string().optional(),
});

const metricsProviderInputSchema = z.object({
  items: z.array(metricsProviderSchema).max(10).min(1),
  tool: z.string().optional(),
  batchId: z.string().optional(),
});

export default defineEventHandler(async event => {
  // Metrics not available in Cloudflare Workers
  if (isCloudflareWorkers) {
    return { message: 'Metrics not available in Cloudflare Workers environment' };
  }
  
  // Handle both POST and PUT methods
  if (event.method !== 'POST' && event.method !== 'PUT') {
    throw createError({
      statusCode: 405,
      message: 'Method not allowed',
    });
  }

  try {
    await ensureMetricsInitialized();

    const body = await readBody(event);
    const validatedBody = metricsProviderInputSchema.parse(body);

    const hostname = event.node.req.headers.origin?.slice(0, 255) ?? '<UNKNOWN>';

    // Lazy import to avoid loading prom-client at module level
    const { recordProviderMetrics } = await import('~/utils/metrics');
    // Use the simplified recordProviderMetrics function to handle all metrics recording
    recordProviderMetrics(validatedBody.items, hostname, validatedBody.tool);

    return true;
  } catch (error) {
    log.error('Failed to process metrics', {
      evt: 'metrics_error',
      error: error instanceof Error ? error.message : String(error),
    });
    throw createError({
      statusCode: error instanceof Error && error.message === 'metrics not initialized' ? 503 : 400,
      message: error instanceof Error ? error.message : 'Failed to process metrics',
    });
  }
});
