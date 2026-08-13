// Onboarding de "coordinador de zona": registro estructurado pero simple.
//
// Decisión de producto: cualquiera puede descargar la app y consultar la lista
// pública sin cuenta. Para operar como COORDINADOR se hace un registro guiado que
// crea una SOLICITUD en estado PENDIENTE — el rol NO se concede automáticamente;
// un admin lo aprueba (human-in-the-loop, evita auto-escalada de privilegios).

/** Datos que un aspirante a coordinador de zona envía en el registro. */
export interface SignupCoordinadorInput {
  nombreCompleto: string;
  email: string;
  password: string;
  /** Teléfono/WhatsApp de contacto y verificación. */
  telefono: string;
  /** Municipio o localidad que va a coordinar (p. ej. en Chocó). */
  zona: string;
  /** Entidad, albergue u hospital al que pertenece (opcional). */
  organizacion?: string;
}

/** Errores de validación por campo. Objeto vacío = input válido. */
export type ErroresSignup = Partial<Record<keyof SignupCoordinadorInput, string>>;

/** Estado de una solicitud de coordinador (la revisa/aprueba un admin). */
export type EstadoSolicitudCoordinador = "PENDIENTE" | "APROBADA" | "RECHAZADA";

/**
 * Puerto de onboarding. `registrar` crea la cuenta y la solicitud de rol en estado
 * PENDIENTE; la implementación real (Supabase) vive en services/.
 */
export interface CoordinadorOnboardingPort {
  registrar(
    input: SignupCoordinadorInput
  ): Promise<{ userId: string; estado: EstadoSolicitudCoordinador }>;
}

/** Validación de email simple y robusta (sin regex frágil, segura en Hermes). */
export function emailValido(email: string): boolean {
  const at = email.indexOf("@");
  if (at <= 0) return false; // debe haber algo antes de "@"
  if (email.indexOf("@", at + 1) !== -1) return false; // un solo "@"
  const dominio = email.slice(at + 1);
  const punto = dominio.indexOf(".");
  return punto > 0 && punto < dominio.length - 1; // dominio con punto interno
}

/** Cuenta solo los dígitos de un teléfono (ignora +, espacios, guiones). */
function contarDigitos(telefono: string): number {
  let n = 0;
  for (const ch of telefono) if (ch >= "0" && ch <= "9") n++;
  return n;
}

/**
 * Valida el registro de coordinador. Devuelve errores por campo (vacío = ok).
 * No hace llamadas de red: es pura y testeable.
 */
export function validarSignupCoordinador(input: SignupCoordinadorInput): ErroresSignup {
  const e: ErroresSignup = {};
  if ((input.nombreCompleto ?? "").trim().length < 3)
    e.nombreCompleto = "Ingresa tu nombre completo (mínimo 3 caracteres).";
  if (!emailValido((input.email ?? "").trim()))
    e.email = "Ingresa un correo electrónico válido.";
  if ((input.password ?? "").length < 8)
    e.password = "La contraseña debe tener al menos 8 caracteres.";
  if (contarDigitos(input.telefono ?? "") < 7)
    e.telefono = "Ingresa un teléfono de contacto válido.";
  if ((input.zona ?? "").trim().length < 2)
    e.zona = "Indica la zona que vas a coordinar.";
  return e;
}

/** true si el input no tiene errores de validación. */
export function signupEsValido(input: SignupCoordinadorInput): boolean {
  return Object.keys(validarSignupCoordinador(input)).length === 0;
}

/** Solicitud tal como la ve el tablero del coordinador (para revisar/aprobar). */
export interface SolicitudCoordinador {
  id: string;
  userId: string;
  nombreCompleto: string;
  email: string;
  telefono: string;
  zona: string;
  organizacion?: string;
  estado: EstadoSolicitudCoordinador;
  creadoEn: string;
}

/** Consulta de solicitudes para el tablero (solo coordinador, por RLS). */
export interface SolicitudesQueryPort {
  /** Solicitudes en estado PENDIENTE, ordenadas por antigüedad. */
  listarPendientes(): Promise<SolicitudCoordinador[]>;
}

/**
 * Aprobación/rechazo de solicitudes (camino 'b'). La aprobación es ATÓMICA:
 * otorga rol COORDINADOR + marca APROBADA + audita, en una sola transacción
 * (RPC SECURITY DEFINER). Solo un COORDINADOR autenticado puede invocarla.
 */
export interface CoordinadorAprobacionPort {
  aprobar(solicitudId: string): Promise<void>;
  rechazar(solicitudId: string, motivo: string): Promise<void>;
}
