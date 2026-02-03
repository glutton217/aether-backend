import { defineTask } from '#imports';
import { scopedLogger } from '../../../utils/logger';

const logger = scopedLogger('tasks:clear-metrics:daily');

// Check if we're running in Cloudflare Workers
const isCloudflareWorkers = typeof globalThis.caches !== 'undefined' && typeof process?.versions?.node === 'undefined';

export default defineTask({
  meta: {
    name: "jobs:clear-metrics:daily",
    description: "Clear daily metrics at midnight",
  },
  async run() {
    // Skip in Cloudflare Workers
    if (isCloudflareWorkers) {
      return { result: { status: "skipped", message: "Metrics not available in Cloudflare Workers" } };
    }
    
    logger.info("Clearing daily metrics");
    const startTime = Date.now();
    
    try {
      // Lazy import to avoid loading prom-client at module level
      const { setupMetrics } = await import('../../../utils/metrics');
      // Clear and reinitialize daily metrics
      await setupMetrics('daily', true);
      
      const executionTime = Date.now() - startTime;
      logger.info(`Daily metrics cleared in ${executionTime}ms`);
      
      return { 
        result: {
          status: "success",
          message: "Successfully cleared daily metrics",
          executionTimeMs: executionTime,
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      logger.error("Error clearing daily metrics:", { error: error.message });
      return { 
        result: {
          status: "error",
          message: error.message || "An error occurred clearing daily metrics",
          executionTimeMs: Date.now() - startTime,
          timestamp: new Date().toISOString()
        }
      };
    }
  },
}); 