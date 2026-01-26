# Cloudflare Workers Deployment Guide

This guide covers deploying the aether-backend to Cloudflare Workers with Neon PostgreSQL.

## Prerequisites

1. Cloudflare account (free tier works)
2. Neon PostgreSQL database (free tier works)
3. Node.js and npm installed

## Configuration Summary

The following changes have been made to support Cloudflare Workers deployment:

### 1. Nitro Configuration (`nitro.config.ts`)
- Added `preset: 'cloudflare_module'` for Cloudflare Workers
- Enabled `deployConfig: true` to auto-generate Wrangler config
- Enabled `nodeCompat: true` for Node.js compatibility layer
- Scheduled tasks configured for Cloudflare Cron Triggers

### 2. Prisma Configuration
- Updated `prisma/schema.prisma` with `engineType = "client"` for edge compatibility
- Updated `server/utils/prisma.ts` to use `@prisma/adapter-neon` instead of `@prisma/adapter-pg`
- Uses Neon's serverless driver which works natively with Cloudflare Workers

### 3. Dependencies Added
- `wrangler` - Cloudflare Workers CLI
- `@prisma/adapter-neon` - Prisma adapter for Neon PostgreSQL
- `@neondatabase/serverless` - Neon's serverless database driver

### 4. Wrangler Configuration (`wrangler.toml`)
- Worker name: `aether-backend`
- Compatibility date: `2025-03-05`
- Node.js compatibility enabled
- Cron triggers configured for scheduled tasks

## Installation Steps

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Generate Prisma client:**
   ```bash
   npx prisma generate
   ```

3. **Login to Cloudflare:**
   ```bash
   npx wrangler login
   ```

4. **Set up Cloudflare environment variables:**
   
   **Option A: Via Cloudflare Dashboard (Recommended)**
   1. Go to Cloudflare Dashboard > Workers & Pages > Your Worker
   2. Navigate to Settings > Variables
   3. Add the following variables:
      - `DATABASE_URL` - Your Neon PostgreSQL connection string
      - `CRYPTO_SECRET`
      - `TMDB_API_KEY`
      - `TRAKT_CLIENT_ID`
      - `TRAKT_SECRET_ID`
      - `CAPTCHA` (optional, set to "true" or "false")
      - `CAPTCHA_CLIENT_KEY` (optional)
      - `META_NAME` (optional)
      - `META_DESCRIPTION` (optional)
   
   **Option B: Via Wrangler CLI (for secrets)**
   ```bash
   wrangler secret put DATABASE_URL
   # Paste your Neon PostgreSQL connection string when prompted
   
   wrangler secret put CRYPTO_SECRET
   wrangler secret put TMDB_API_KEY
   wrangler secret put TRAKT_CLIENT_ID
   wrangler secret put TRAKT_SECRET_ID
   ```
   
   **Note:** Your Neon `DATABASE_URL` should look like:
   ```
   postgresql://user:password@ep-xxx.us-east-2.aws.neon.tech/dbname?sslmode=require
   ```
   
   **Important:** Variables set in the Cloudflare dashboard are automatically available as `process.env.VARIABLE_NAME` in your Worker code.

5. **Build the project:**
   ```bash
   npm run build
   ```

6. **Deploy to Cloudflare:**
   
   **Important:** Deploy as a Cloudflare Worker (not Cloudflare Pages). Use Wrangler directly:
   ```bash
   npm run deploy:cloudflare
   ```
   
   Or use Wrangler directly:
   ```bash
   npx wrangler deploy
   ```
   
   **Note:** If you see a warning about local config differing from remote config, this is normal:
   - Nitro generates `.output/server/wrangler.json` during build
   - Your environment variables are set in the Cloudflare dashboard
   - Wrangler will use the generated config for deployment, but dashboard variables are still available
   - The warning is informational and won't prevent deployment
   
   **Note:** If you're using Cloudflare Pages, you need to configure it to use Wrangler for deployment, or deploy as a Worker instead. The `cloudflare_module` preset builds for Workers, not Pages' Node.js runtime.

## Local Development

To test locally with Wrangler:

```bash
npm run preview:cloudflare
```

This will:
1. Build the project
2. Start Wrangler dev server
3. Allow you to test Cloudflare Workers locally

## Scheduled Tasks (Cron Jobs)

The following scheduled tasks are configured:

- **Daily**: `0 0 * * *` - Clears daily metrics at midnight
- **Weekly**: `0 0 * * 0` - Clears weekly metrics every Sunday at midnight  
- **Monthly**: `0 0 1 * *` - Clears monthly metrics on the 1st of each month at midnight

These are automatically converted to Cloudflare Cron Triggers and will invoke the respective task handlers.

## Database Connection

The application uses Neon's serverless driver (`@neondatabase/serverless`) which:
- Works natively with Cloudflare Workers (no TCP connections needed)
- Uses WebSocket/HTTP protocols compatible with serverless environments
- Handles connection pooling automatically
- Works perfectly with Cloudflare Workers free tier

## Cloudflare Pages vs Workers

**Important:** This configuration deploys to **Cloudflare Workers**, not Cloudflare Pages. 

- **Cloudflare Workers**: Use `wrangler deploy` (recommended for this setup)
- **Cloudflare Pages**: Uses a different runtime and requires different configuration

If you're deploying via Cloudflare Pages dashboard:
1. Set **Build command**: `npm run build`
2. Set **Deploy command**: `npx wrangler deploy` (or leave empty and deploy manually)
3. Or better: Deploy directly as a Worker using `wrangler deploy` from your CI/CD or locally

## Troubleshooting

### Deployment Errors

**Error: `ERR_UNSUPPORTED_ESM_URL_SCHEME: Received protocol 'cloudflare:'`**

This means Cloudflare Pages is trying to run the Node.js server output. Solution:
- Deploy as a **Cloudflare Worker** using `wrangler deploy`, not through Cloudflare Pages
- Or configure Cloudflare Pages to use Wrangler for deployment instead of running Node.js

**Error: `Disallowed operation called within global scope`**

This error occurs when code tries to perform async I/O (like database connections) at module load time. Solution:
- Prisma client has been updated to use lazy initialization - it only connects when called inside a handler
- Ensure you're using the latest version of `server/utils/prisma.ts` with the Proxy-based lazy loading
- Make sure no other code performs async operations at module load time

### Build Errors

If you encounter build errors:
1. Ensure Prisma client is generated: `npx prisma generate`
2. Check that all dependencies are installed: `npm install`
3. Verify Node.js version compatibility (Node 18+ recommended)

### Database Connection Issues

- Verify your `DATABASE_URL` secret is set correctly
- Ensure your Neon database allows connections from Cloudflare IPs
- Check that SSL mode is enabled (`?sslmode=require`)

### Cron Trigger Issues

- Verify cron patterns in `wrangler.toml` match `nitro.config.ts`
- Check Cloudflare dashboard for cron trigger status
- Test locally using: `npx wrangler dev --test-scheduled`

### Configuration Warnings

**Warning: "The local configuration being used differs from the remote configuration"**

This warning is **normal and expected** when:
- You set environment variables in the Cloudflare dashboard
- Nitro generates a `wrangler.json` file during build
- The generated config doesn't include dashboard variables

**Solution:** This is just informational. Your dashboard variables will still be available at runtime. The deployment will work correctly. If you want to suppress the warning, you can:
- Use `wrangler deploy --config .output/server/wrangler.json` to use only the generated config
- Or ignore the warning - it doesn't affect functionality

## Additional Resources

- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- [Nitro Cloudflare Preset](https://nitro.unjs.io/deploy/providers/cloudflare)
- [Neon Serverless Driver](https://neon.tech/docs/serverless/serverless-driver)
- [Prisma Cloudflare Workers Guide](https://www.prisma.io/docs/guides/cloudflare-workers)

## Notes

- Cloudflare Workers free tier has a 10-second CPU time limit per request
- Ensure database queries complete within execution limits
- Consider optimizing long-running queries for serverless environments
- The `@prisma/adapter-pg` package is kept for local development compatibility
