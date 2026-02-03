import { z } from 'zod';
import { scopedLogger } from '~/utils/logger';

const log = scopedLogger('metrics-captcha');

// Check if we're running in Cloudflare Workers
const isCloudflareWorkers = typeof globalThis.caches !== 'undefined' && typeof process?.versions?.node === 'undefined';

let isInitialized = false;

async function ensureMetricsInitialized() {
  if (isCloudflareWorkers) return;
  
  if (!isInitialized) {
    log.info('Initializing metrics from captcha endpoint...', { evt: 'init_start' });
    const { setupMetrics } = await import('~/utils/metrics');
    await setupMetrics();
    isInitialized = true;
    log.info('Metrics initialized from captcha endpoint', { evt: 'init_complete' });
  }
}

export default defineEventHandler(async event => {
  // Metrics not available in Cloudflare Workers
  if (isCloudflareWorkers) {
    return { message: 'Metrics not available in Cloudflare Workers environment' };
  }
  
  try {
    await ensureMetricsInitialized();

    const body = await readBody(event);
    const validatedBody = z
      .object({
        success: z.boolean(),
      })
      .parse(body);

    // Lazy import to avoid loading prom-client at module level
    const { recordCaptchaMetrics } = await import('~/utils/metrics');
    recordCaptchaMetrics(validatedBody.success);

    return true;
  } catch (error) {
    log.error('Failed to process captcha metrics', {
      evt: 'metrics_error',
      error: error instanceof Error ? error.message : String(error),
    });
    throw createError({
      statusCode: error instanceof Error && error.message === 'metrics not initialized' ? 503 : 400,
      message: error instanceof Error ? error.message : 'Failed to process metrics',
    });
  }
});
