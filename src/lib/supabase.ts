import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || "https://xrxuzvvvorxukyoeqibg.supabase.co";
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "sb_publishable_5PQ8ugmExZQulip3fmD3eA_hRMLoNqH";

export const isSupabaseConfigured = (): boolean => {
  return (
    Boolean(supabaseUrl) &&
    supabaseUrl !== "https://placeholder-supabase-url.supabase.co" &&
    Boolean(supabaseAnonKey)
  );
};

// Adaptador de almacenamiento seguro contra SSR (Server-Side Rendering / Node.js)
const SafeStorageAdapter = {
  getItem: (key: string) => {
    if (typeof window === "undefined") {
      return Promise.resolve(null);
    }
    return AsyncStorage.getItem(key);
  },
  setItem: (key: string, value: string) => {
    if (typeof window === "undefined") {
      return Promise.resolve();
    }
    return AsyncStorage.setItem(key, value);
  },
  removeItem: (key: string) => {
    if (typeof window === "undefined") {
      return Promise.resolve();
    }
    return AsyncStorage.removeItem(key);
  },
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: SafeStorageAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
