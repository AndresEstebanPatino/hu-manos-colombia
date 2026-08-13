import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  process.env.EXPO_PUBLIC_SUPABASE_URL ||
  "https://xrxuzvvvorxukyoeqibg.supabase.co";

const supabaseAnonKey =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhyeHV6dnZ2b3J4dWt5b2VxaWJnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjMyNjU4MzIsImV4cCI6MjAzODg0MTgzMn0.placeholder";

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
    try {
      return AsyncStorage.getItem(key);
    } catch (e) {
      return Promise.resolve(null);
    }
  },
  setItem: (key: string, value: string) => {
    if (typeof window === "undefined") {
      return Promise.resolve();
    }
    try {
      return AsyncStorage.setItem(key, value);
    } catch (e) {
      return Promise.resolve();
    }
  },
  removeItem: (key: string) => {
    if (typeof window === "undefined") {
      return Promise.resolve();
    }
    try {
      return AsyncStorage.removeItem(key);
    } catch (e) {
      return Promise.resolve();
    }
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
