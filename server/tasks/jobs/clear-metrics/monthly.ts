import { defineTask } from '#imports';
import { scopedLogger } from '../../../utils/logger';

// Check if we're running in Cloudflare Workers
const isCloudflareWorkers = typeof globalThis.caches !== 'undefined' && typeof process?.versions?.node === 'undefined';

const logger = scopedLogger('tasks:clear-metrics:monthly');

export default defineTask({
  meta: {
    name: "jobs:clear-metrics:monthly",
    description: "Clear monthly metrics on the 1st of each month at midnight",
  },
  async run() {
    // Skip in Cloudflare Workers
    if (isCloudflareWorkers) {
      return { result: { status: "skipped", message: "Metrics not available in Cloudflare Workers" } };
    }
    
    logger.info("Clearing monthly metrics");
    const startTime = Date.now();
    
    try {
      // Lazy import to avoid loading prom-client at module level
      const { setupMetrics } = await import('../../../utils/metrics');
      // Clear and reinitialize monthly metrics
      await setupMetrics('monthly', true);
      
      const executionTime = Date.now() - startTime;
      logger.info(`Monthly metrics cleared in ${executionTime}ms`);
      
      return { 
        result: {
          status: "success",
          message: "Successfully cleared monthly metrics",
          executionTimeMs: executionTime,
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      logger.error("Error clearing monthly metrics:", { error: error.message });
      return { 
        result: {
          status: "error",
          message: error.message || "An error occurred clearing monthly metrics",
          executionTimeMs: Date.now() - startTime,
          timestamp: new Date().toISOString()
        }
      };
    }
  },
}); 