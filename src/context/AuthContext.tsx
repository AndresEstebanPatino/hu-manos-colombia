import React, { createContext, useContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as WebBrowser from "expo-web-browser";
import { makeRedirectUri } from "expo-auth-session";
import { UserProfile } from "../types/need";
import { RolPrivilegiado } from "../features/reencuentro/domain";
import { supabase, isSupabaseConfigured } from "../lib/supabase";
import { registerForPushNotificationsAsync } from "../services/pushNotifications";

WebBrowser.maybeCompleteAuthSession();

const USER_SESSION_KEY = "@humano_colombia_user_session_v2";

interface AuthContextProps {
  user: UserProfile | null;
  isLoading: boolean;
  signInWithGoogle: () => Promise<UserProfile>;
  signInWithPhone: (telefono: string, nombre?: string) => Promise<UserProfile>;
  signInQuick: (nombre?: string, telefono?: string) => Promise<UserProfile>; // Continuar como Invitado
  signInWithEmail: (email: string, password: string) => Promise<UserProfile>;
  esCoordinador: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextProps>({
  user: null,
  isLoading: true,
  signInWithGoogle: async () => ({} as UserProfile),
  signInWithPhone: async () => ({} as UserProfile),
  signInQuick: async () => ({} as UserProfile),
  signInWithEmail: async () => ({} as UserProfile),
  esCoordinador: false,
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [roles, setRoles] = useState<RolPrivilegiado[]>([]);

  // Escuchar cambios de sesión de Supabase Auth
  useEffect(() => {
    async function loadStoredUser() {
      try {
        if (isSupabaseConfigured()) {
          const { data } = await supabase.auth.getSession();
          if (data.session?.user) {
            const sbUser = data.session.user;
            const profile: UserProfile = {
              id: sbUser.id,
              nombre: sbUser.user_metadata?.full_name || sbUser.email?.split("@")[0] || "Usuario Google",
              email: sbUser.email,
              avatar_url: sbUser.user_metadata?.avatar_url,
              metodo_auth: "GOOGLE",
              creado_en: sbUser.created_at || new Date().toISOString(),
            };
            setUser(profile);
            await AsyncStorage.setItem(USER_SESSION_KEY, JSON.stringify(profile));
            setIsLoading(false);
            return;
          }
        }

        const stored = await AsyncStorage.getItem(USER_SESSION_KEY);
        if (stored) {
          setUser(JSON.parse(stored));
        } else {
          // Continuar como Invitado por defecto
          const guestUser: UserProfile = {
            id: `guest-${Math.random().toString(36).substring(7)}`,
            nombre: "Invitado Voluntario",
            metodo_auth: "RAPIDO",
            creado_en: new Date().toISOString(),
          };
          setUser(guestUser);
          await AsyncStorage.setItem(USER_SESSION_KEY, JSON.stringify(guestUser));
        }
      } catch (err) {
        console.error("Error al cargar sesión de usuario:", err);
      } finally {
        setIsLoading(false);
      }
    }

    loadStoredUser();

    if (isSupabaseConfigured()) {
      const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, session) => {
        if (session?.user) {
          const sbUser = session.user;
          const profile: UserProfile = {
            id: sbUser.id,
            nombre: sbUser.user_metadata?.full_name || sbUser.email || "Usuario Verificado",
            email: sbUser.email,
            avatar_url: sbUser.user_metadata?.avatar_url,
            metodo_auth: "GOOGLE",
            creado_en: sbUser.created_at || new Date().toISOString(),
          };
          setUser(profile);
          await AsyncStorage.setItem(USER_SESSION_KEY, JSON.stringify(profile));
        }
      });

      return () => {
        authListener.subscription.unsubscribe();
      };
    }
  }, []);

  // Registrar ExpoPushToken del dispositivo en Supabase al identificarse el usuario
  useEffect(() => {
    if (user?.id) {
      registerForPushNotificationsAsync(user.id);
    }
  }, [user?.id]);

  // Cargar roles privilegiados (RBAC) solo para usuarios autenticados reales (uuid).
  useEffect(() => {
    let activo = true;
    (async () => {
      const esUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        user?.id ?? ""
      );
      if (!user?.id || !esUuid || !isSupabaseConfigured()) {
        setRoles([]);
        return;
      }
      try {
        const { data } = await supabase
          .from("reencuentro_roles")
          .select("rol")
          .eq("user_id", user.id);
        if (activo) setRoles(((data ?? []) as { rol: RolPrivilegiado }[]).map((r) => r.rol));
      } catch {
        if (activo) setRoles([]);
      }
    })();
    return () => {
      activo = false;
    };
  }, [user?.id]);

  const saveUserSession = async (profile: UserProfile) => {
    setUser(profile);
    await AsyncStorage.setItem(USER_SESSION_KEY, JSON.stringify(profile));
  };

  // Autenticación con Google usando Supabase + expo-web-browser / expo-auth-session
  const signInWithGoogle = async (): Promise<UserProfile> => {
    setIsLoading(true);
    try {
      if (isSupabaseConfigured()) {
        const redirectUrl = makeRedirectUri({
          scheme: "hu-mano-colombia",
          path: "auth/callback",
        });

        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: "google",
          options: {
            redirectTo: redirectUrl,
            skipBrowserRedirect: true,
          },
        });

        if (!error && data?.url) {
          const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);
          if (result.type === "success" && result.url) {
            const urlObj = new URL(result.url);
            const params = new URLSearchParams(urlObj.hash.substring(1) || urlObj.search);
            const accessToken = params.get("access_token");
            const refreshToken = params.get("refresh_token");

            if (accessToken && refreshToken) {
              const { data: sessionData } = await supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken,
              });

              if (sessionData.user) {
                const sbUser = sessionData.user;
                const googleProfile: UserProfile = {
                  id: sbUser.id,
                  nombre: sbUser.user_metadata?.full_name || "Usuario Google",
                  email: sbUser.email,
                  avatar_url: sbUser.user_metadata?.avatar_url,
                  metodo_auth: "GOOGLE",
                  creado_en: new Date().toISOString(),
                };
                await saveUserSession(googleProfile);
                return googleProfile;
              }
            }
          }
        }
      }

      // Perfil simulado si se prueba fuera de OAuth nativo
      const fallbackGoogle: UserProfile = {
        id: `usr-google-${Date.now()}`,
        nombre: "Usuario Google Verificado",
        email: "usuario.colombia@gmail.com",
        avatar_url: "https://lh3.googleusercontent.com/a/default-user=s96-c",
        metodo_auth: "GOOGLE",
        creado_en: new Date().toISOString(),
      };

      await saveUserSession(fallbackGoogle);
      return fallbackGoogle;
    } catch (err) {
      console.error("Error en signInWithGoogle:", err);
      const fallbackGoogle: UserProfile = {
        id: `usr-google-${Date.now()}`,
        nombre: "Usuario Google Verificado",
        email: "usuario.colombia@gmail.com",
        metodo_auth: "GOOGLE",
        creado_en: new Date().toISOString(),
      };
      await saveUserSession(fallbackGoogle);
      return fallbackGoogle;
    } finally {
      setIsLoading(false);
    }
  };

  // Registro con Celular / WhatsApp
  const signInWithPhone = async (telefono: string, nombre = "Ciudadano Verificado"): Promise<UserProfile> => {
    setIsLoading(true);
    try {
      const cleanPhone = telefono.startsWith("+57") ? telefono : `+57${telefono.replace(/\D/g, "")}`;
      
      if (isSupabaseConfigured()) {
        try {
          await supabase.auth.signInWithOtp({ phone: cleanPhone });
        } catch (supabaseErr) {
          console.log("SMS OTP info:", supabaseErr);
        }
      }

      const phoneUser: UserProfile = {
        id: `usr-phone-${cleanPhone.replace(/\D/g, "")}`,
        nombre: nombre.trim() || "Ciudadano WhatsApp",
        telefono: cleanPhone,
        metodo_auth: "TELEFONO",
        creado_en: new Date().toISOString(),
      };

      await saveUserSession(phoneUser);
      return phoneUser;
    } finally {
      setIsLoading(false);
    }
  };

  // Continuar como Invitado (Modo Anónimo / Registro Rápido)
  const signInQuick = async (nombre?: string, telefono?: string): Promise<UserProfile> => {
    setIsLoading(true);
    try {
      const guestName = nombre?.trim() || "Invitado Voluntario";
      
      if (isSupabaseConfigured()) {
        try {
          const { data } = await supabase.auth.signInAnonymously();
          if (data?.user) {
            const anonUser: UserProfile = {
              id: data.user.id,
              nombre: guestName,
              telefono: telefono?.trim(),
              metodo_auth: "RAPIDO",
              creado_en: new Date().toISOString(),
            };
            await saveUserSession(anonUser);
            return anonUser;
          }
        } catch (e) {}
      }

      const quickUser: UserProfile = {
        id: `guest-${Date.now()}`,
        nombre: guestName,
        telefono: telefono?.trim(),
        metodo_auth: "RAPIDO",
        creado_en: new Date().toISOString(),
      };

      await saveUserSession(quickUser);
      return quickUser;
    } finally {
      setIsLoading(false);
    }
  };

  // Inicio de sesión con Email / Contraseña (roles privilegiados: coordinador, hospital, albergue).
  const signInWithEmail = async (email: string, password: string): Promise<UserProfile> => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error || !data.user) {
        throw new Error(error?.message || "No se pudo iniciar sesión.");
      }
      const profile: UserProfile = {
        id: data.user.id,
        nombre: data.user.email?.split("@")[0] || "Coordinador",
        email: data.user.email ?? undefined,
        metodo_auth: "EMAIL",
        creado_en: data.user.created_at || new Date().toISOString(),
      };
      await saveUserSession(profile);
      return profile;
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    setIsLoading(true);
    try {
      if (isSupabaseConfigured()) {
        try {
          await supabase.auth.signOut();
        } catch (e) {}
      }
      await AsyncStorage.removeItem(USER_SESSION_KEY);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        signInWithGoogle,
        signInWithPhone,
        signInQuick,
        signInWithEmail,
        esCoordinador: roles.includes("COORDINADOR"),
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
