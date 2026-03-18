import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY environment variables');
}

// Add 10s timeout to data queries — skip auth requests to avoid breaking navigator.locks
const fetchWithTimeout = (url, options = {}) => {
  const isAuth = url.includes('/auth/');
  const tag = url.split('/rest/v1/')[1]?.split('?')[0] || (isAuth ? 'auth' : url.slice(-40));
  const t0 = performance.now();
  console.log(`[fetch] → ${tag} (hasSignal=${!!options.signal}, isAuth=${isAuth})`);

  if (isAuth) return fetch(url, options).then(r => { console.log(`[fetch] ← ${tag} ${r.status} in ${(performance.now()-t0).toFixed(0)}ms`); return r; });

  const controller = new AbortController();
  const timeoutId = setTimeout(() => { console.warn(`[fetch] ⏰ ${tag} TIMEOUT 10s`); controller.abort(); }, 10000);
  // Always apply our timeout signal, even if options.signal exists
  return fetch(url, { ...options, signal: controller.signal })
    .then(r => { console.log(`[fetch] ← ${tag} ${r.status} in ${(performance.now()-t0).toFixed(0)}ms`); return r; })
    .catch(err => { console.error(`[fetch] ✗ ${tag} FAILED in ${(performance.now()-t0).toFixed(0)}ms:`, err.message); throw err; })
    .finally(() => clearTimeout(timeoutId));
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Bypass navigator.locks to prevent deadlock that hangs getSession() and all queries
    lock: (_name, _timeout, fn) => fn(),
  },
  global: { fetch: fetchWithTimeout },
});
