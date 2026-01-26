import { config } from 'dotenv';
config();
import { version } from './server/utils/config';
//https://nitro.unjs.io/config
export default defineNitroConfig({
  srcDir: 'server',
  preset: 'cloudflare_module',
  // Cloudflare requires a recent compatibility date for Workers features.
  compatibilityDate: '2025-03-05',
  cloudflare: {
    // Generate Wrangler config during build
    deployConfig: true,
    // Enable Node compatibility layer where needed
    nodeCompat: true,
    // Don't override dashboard settings - use wrangler.toml as base
    wrangler: {
      // Variables are set in Cloudflare dashboard, not in config file
      // This prevents conflicts between local config and dashboard settings
    },
  },
  experimental: {
    asyncContext: true,
    tasks: true,
  },
  scheduledTasks: {
    // Daily cron jobs (midnight)
    '0 0 * * *': ['jobs:clear-metrics:daily'],
    // Weekly cron jobs (Sunday midnight)
    '0 0 * * 0': ['jobs:clear-metrics:weekly'],
    // Monthly cron jobs (1st of month at midnight)
    '0 0 1 * *': ['jobs:clear-metrics:monthly']
  },
  runtimeConfig: {
    public: {
      meta: {
        name: process.env.META_NAME || '',
        description: process.env.META_DESCRIPTION || '',
        version: version || '',
        captcha: (process.env.CAPTCHA === 'true').toString(),
        captchaClientKey: process.env.CAPTCHA_CLIENT_KEY || '',
      },
    },
    cryptoSecret: process.env.CRYPTO_SECRET,
    tmdbApiKey: process.env.TMDB_API_KEY,
    trakt: {
      clientId: process.env.TRAKT_CLIENT_ID,
      clientSecret: process.env.TRAKT_SECRET_ID,
    },
  },
});
