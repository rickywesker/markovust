import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY environment variables');
}

// 10s timeout for data queries — skip auth requests to preserve token refresh
const fetchWithTimeout = (url, options = {}) => {
  if (url.includes('/auth/')) return fetch(url, options);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  // Compose signals: if the caller already has one, forward its abort to ours
  if (options.signal) {
    if (options.signal.aborted) controller.abort();
    else options.signal.addEventListener('abort', () => controller.abort(), { once: true });
  }

  return fetch(url, { ...options, signal: controller.signal })
    .finally(() => clearTimeout(timeoutId));
};

// In-memory mutex to replace navigator.locks (prevents deadlock while still
// serializing token refreshes so concurrent refreshes don't corrupt the session)
const inMemoryLock = (() => {
  const locks = new Map();
  return (name, _timeout, fn) => {
    const prev = locks.get(name) || Promise.resolve();
    const next = prev.then(fn, fn);
    locks.set(name, next.catch(() => {}));
    return next;
  };
})();

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { lock: inMemoryLock },
  global: { fetch: fetchWithTimeout },
});
