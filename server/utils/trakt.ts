import Trakt from 'trakt.tv';

// Lazy initialization to avoid global scope I/O in Cloudflare Workers
let trakt: Trakt | null = null;
let initialized = false;

function getTraktClient(): Trakt | null {
  if (!initialized) {
    initialized = true;
    const traktKeys = useRuntimeConfig().trakt;
    
    if (traktKeys?.clientId && traktKeys?.clientSecret) {
      const options = {
        client_id: traktKeys.clientId,
        client_secret: traktKeys.clientSecret,
      };
      trakt = new Trakt(options);
    }
  }
  return trakt;
}

// Export a proxy that lazily initializes the client
export default new Proxy({} as Trakt, {
  get(_target, prop) {
    const client = getTraktClient();
    if (!client) return undefined;
    const value = (client as any)[prop];
    return typeof value === 'function' ? value.bind(client) : value;
  },
});
