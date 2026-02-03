import { defineTask } from '#imports';
import { scopedLogger } from '../../../utils/logger';

// Check if we're running in Cloudflare Workers
const isCloudflareWorkers = typeof globalThis.caches !== 'undefined' && typeof process?.versions?.node === 'undefined';

const logger = scopedLogger('tasks:clear-metrics:weekly');

export default defineTask({
  meta: {
    name: "jobs:clear-metrics:weekly",
    description: "Clear weekly metrics every Sunday at midnight",
  },
  async run() {
    // Skip in Cloudflare Workers
    if (isCloudflareWorkers) {
      return { result: { status: "skipped", message: "Metrics not available in Cloudflare Workers" } };
    }
    
    logger.info("Clearing weekly metrics");
    const startTime = Date.now();
    
    try {
      // Lazy import to avoid loading prom-client at module level
      const { setupMetrics } = await import('../../../utils/metrics');
      // Clear and reinitialize weekly metrics
      await setupMetrics('weekly', true);
      
      const executionTime = Date.now() - startTime;
      logger.info(`Weekly metrics cleared in ${executionTime}ms`);
      
      return { 
        result: {
          status: "success",
          message: "Successfully cleared weekly metrics",
          executionTimeMs: executionTime,
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      logger.error("Error clearing weekly metrics:", { error: error.message });
      return { 
        result: {
          status: "error",
          message: error.message || "An error occurred clearing weekly metrics",
          executionTimeMs: Date.now() - startTime,
          timestamp: new Date().toISOString()
        }
      };
    }
  },
}); 