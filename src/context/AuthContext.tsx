import React, { createContext, useContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import { UserProfile } from "../types/need";
import { supabase, isSupabaseConfigured } from "../lib/supabase";
import { registerForPushNotificationsAsync } from "../services/pushNotifications";

WebBrowser.maybeCompleteAuthSession();

const USER_SESSION_KEY = "@humano_colombia_user_session_v2";

interface AuthContextProps {
  user: UserProfile | null;
  isLoading: boolean;
  signInWithGoogle: () => Promise<UserProfile>;
  signInWithPhone: (telefono: string, nombre?: string) => Promise<UserProfile>;
  signInQuick: (nombre?: string, telefono?: string) => Promise<UserProfile>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextProps>({
  user: null,
  isLoading: true,
  signInWithGoogle: async () => ({} as UserProfile),
  signInWithPhone: async () => ({} as UserProfile),
  signInQuick: async () => ({} as UserProfile),
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Procesa URLs de retorno OAuth (Deep Linking) y realiza el intercambio de sesión
  const handleAuthRedirectUrl = async (url: string) => {
    if (!url || !isSupabaseConfigured()) return;

    try {
      const parsed = Linking.parse(url);
      const queryParams = parsed.queryParams;

      // 1. Flujo PKCE con código de autorización
      if (queryParams?.code) {
        const { data, error } = await supabase.auth.exchangeCodeForSession(queryParams.code as string);
        if (!error && data?.user) {
          const sbUser = data.user;
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
          return;
        }
      }

      // 2. Flujo Implícito con access_token y refresh_token
      let accessToken = queryParams?.access_token as string | undefined;
      let refreshToken = queryParams?.refresh_token as string | undefined;

      if (!accessToken && url.includes("#")) {
        const hash = url.split("#")[1];
        const params = new URLSearchParams(hash);
        accessToken = params.get("access_token") || undefined;
        refreshToken = params.get("refresh_token") || undefined;
      }

      if (accessToken && refreshToken) {
        const { data: sessionData, error: sessionErr } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (!sessionErr && sessionData?.user) {
          const sbUser = sessionData.user;
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
        }
      }
    } catch (err) {
      console.error("Error al procesar URL de respuesta OAuth:", err);
    }
  };

  // Escuchar cambios de sesión de Supabase Auth + Listener de Deep Links
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
          setUser(null);
        }
      } catch (err) {
        console.error("Error al cargar sesión de usuario:", err);
      } finally {
        setIsLoading(false);
      }
    }

    loadStoredUser();

    // 1. Escuchar URLs entrantes por Deep Linking al abrir la app desde el navegador
    const linkingSubscription = Linking.addEventListener("url", (event) => {
      handleAuthRedirectUrl(event.url);
    });

    // Capturar si la app fue abierta inicialmente desde un enlace OAuth
    Linking.getInitialURL().then((initialUrl) => {
      if (initialUrl) {
        handleAuthRedirectUrl(initialUrl);
      }
    });

    // 2. Suscripción a cambios del estado de Supabase Auth
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
        linkingSubscription.remove();
        authListener.subscription.unsubscribe();
      };
    }

    return () => {
      linkingSubscription.remove();
    };
  }, []);

  // Registrar ExpoPushToken del dispositivo en Supabase al identificarse el usuario
  useEffect(() => {
    if (user?.id) {
      registerForPushNotificationsAsync(user.id);
    }
  }, [user?.id]);

  const saveUserSession = async (profile: UserProfile) => {
    setUser(profile);
    await AsyncStorage.setItem(USER_SESSION_KEY, JSON.stringify(profile));
  };

  // Autenticación con Google usando Supabase + expo-linking + expo-web-browser
  const signInWithGoogle = async (): Promise<UserProfile> => {
    setIsLoading(true);
    try {
      if (!isSupabaseConfigured()) {
        throw new Error("Supabase no está configurado. Verifica las variables de entorno.");
      }

      // Generar URL de redirección dinámica utilizando expo-linking
      const redirectUrl = Linking.createURL("auth/callback");

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: true,
        },
      });

      if (error || !data?.url) {
        console.error("Error al obtener URL de OAuth:", error);
        throw new Error(error?.message || "No se pudo iniciar el flujo de autenticación con Google.");
      }

      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);

      if (result.type !== "success" || !result.url) {
        // El usuario canceló el flujo o algo impidió completarlo
        throw new Error("El inicio de sesión con Google fue cancelado.");
      }

      // Procesar la URL de retorno con los tokens de OAuth
      await handleAuthRedirectUrl(result.url);

      // Verificar que la sesión se estableció correctamente en Supabase
      const updatedSession = await supabase.auth.getSession();
      if (!updatedSession.data?.session?.user) {
        throw new Error("No se pudo establecer la sesión con Google. Intenta de nuevo.");
      }

      const sbUser = updatedSession.data.session.user;
      const googleProfile: UserProfile = {
        id: sbUser.id,
        nombre: sbUser.user_metadata?.full_name || sbUser.email?.split("@")[0] || "Usuario Google",
        email: sbUser.email,
        avatar_url: sbUser.user_metadata?.avatar_url,
        metodo_auth: "GOOGLE",
        creado_en: sbUser.created_at || new Date().toISOString(),
      };
      await saveUserSession(googleProfile);
      return googleProfile;
    } catch (err) {
      console.error("Error en signInWithGoogle:", err);
      // Propagar el error para que AuthModal pueda mostrarlo al usuario
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const signInWithPhone = async (telefono: string, nombre = "Ciudadano Verificado"): Promise<UserProfile> => {
    setIsLoading(true);
    try {
      const cleanPhone = telefono.startsWith("+57") ? telefono : `+57${telefono.replace(/\D/g, "")}`;

      let userId = `usr-phone-${cleanPhone.replace(/\D/g, "")}`;

      if (isSupabaseConfigured()) {
        try {
          const { data: sessionData } = await supabase.auth.getSession();
          if (sessionData?.session?.user) {
            userId = sessionData.session.user.id;
          } else {
            const { data: anonData } = await supabase.auth.signInAnonymously();
            if (anonData?.user) {
              userId = anonData.user.id;
            }
          }
        } catch (supabaseErr) {
          console.log("SMS OTP info:", supabaseErr);
        }
      }

      const phoneUser: UserProfile = {
        id: userId,
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
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
