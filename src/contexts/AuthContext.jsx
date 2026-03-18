import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let resolved = false;
    const t0 = performance.now();
    console.log('[Auth] starting getSession...');

    // Timeout fallback: if getSession() hangs (navigator.locks deadlock), force loading to false
    const timeout = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        console.warn(`[Auth] TIMEOUT after ${(performance.now() - t0).toFixed(0)}ms — forcing loading=false`);
        setLoading(false);
      }
    }, 5000);

    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log(`[Auth] getSession resolved in ${(performance.now() - t0).toFixed(0)}ms, user=${!!session?.user}`);
      if (!resolved) {
        resolved = true;
        clearTimeout(timeout);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    }).catch((err) => {
      console.error(`[Auth] getSession FAILED in ${(performance.now() - t0).toFixed(0)}ms:`, err);
      if (!resolved) {
        resolved = true;
        clearTimeout(timeout);
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log(`[Auth] onAuthStateChange: ${event} at ${(performance.now() - t0).toFixed(0)}ms`);
        setUser(session?.user ?? null);
        if (!resolved) {
          resolved = true;
          clearTimeout(timeout);
          setLoading(false);
        }
        if (event === 'SIGNED_IN' && session?.user) {
          const { data } = await supabase.from('profiles').select('id').eq('id', session.user.id).single();
          if (!data) {
            await supabase.from('profiles').insert({ id: session.user.id });
          }
        }
      }
    );

    return () => {
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, []);

  const signIn = (email, password) =>
    supabase.auth.signInWithPassword({ email, password });

  const signUp = (email, password) =>
    supabase.auth.signUp({ email, password });

  const signOut = () => supabase.auth.signOut();

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
