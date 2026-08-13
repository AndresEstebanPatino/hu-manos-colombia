import { CoordinadorAuthPort, RolPrivilegiado, esCoordinador } from "../domain";

export interface SesionCoordinador {
  userId: string;
  email: string | null;
  roles: RolPrivilegiado[];
  esCoordinador: boolean;
}

/**
 * Inicia sesión con email/contraseña y resuelve los roles del usuario.
 * La UI/AuthContext consume esto; el puerto se implementa contra Supabase.
 */
export async function iniciarSesionCoordinador(
  email: string,
  password: string,
  port: CoordinadorAuthPort
): Promise<SesionCoordinador> {
  const { userId, email: mail } = await port.signInWithPassword(email, password);
  const roles = await port.obtenerRoles(userId);
  return { userId, email: mail, roles, esCoordinador: esCoordinador(roles) };
}
