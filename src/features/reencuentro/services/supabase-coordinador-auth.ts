import { supabase } from "../../../lib/supabase";
import { CoordinadorAuthPort, RolPrivilegiado } from "../domain";

/** Adaptador real del puerto de auth+roles del coordinador contra Supabase. */
export class SupabaseCoordinadorAuth implements CoordinadorAuthPort {
  async signInWithPassword(
    email: string,
    password: string
  ): Promise<{ userId: string; email: string | null }> {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
    if (!data.user) throw new Error("No se obtuvo el usuario tras el login.");
    return { userId: data.user.id, email: data.user.email ?? null };
  }

  async obtenerRoles(userId: string): Promise<RolPrivilegiado[]> {
    const { data, error } = await supabase
      .from("reencuentro_roles")
      .select("rol")
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return ((data ?? []) as { rol: RolPrivilegiado }[]).map((r) => r.rol);
  }
}
