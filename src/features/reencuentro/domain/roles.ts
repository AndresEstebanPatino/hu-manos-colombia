// Roles privilegiados con auth verificada (coinciden con la tabla reencuentro_roles).
// La captura es anónima; estos roles requieren login real (email/password).

export type RolPrivilegiado = "COORDINADOR" | "HOSPITAL" | "ALBERGUE";

export function esCoordinador(roles: RolPrivilegiado[]): boolean {
  return roles.includes("COORDINADOR");
}

export function tieneRolPrivilegiado(roles: RolPrivilegiado[]): boolean {
  return roles.length > 0;
}
