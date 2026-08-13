import { supabase } from "../../../lib/supabase";
import {
  CoordinadorOnboardingPort,
  EstadoSolicitudCoordinador,
  SignupCoordinadorInput,
  validarSignupCoordinador,
} from "../domain";

/**
 * Onboarding de coordinador contra Supabase.
 *
 * `registrar` crea la cuenta (auth.signUp) e inserta la SOLICITUD en estado
 * PENDIENTE con la sesion del propio aspirante (la RLS exige user_id = auth.uid()).
 * El rol COORDINADOR NO se concede aqui: lo aprueba un coordinador (camino 'b') o
 * el dueno via service_role (camino 'a').
 *
 * Requiere que el proyecto tenga deshabilitada la confirmacion por email para que
 * exista sesion tras el signUp (ver la migracion 20260813000001).
 */
export class SupabaseCoordinadorOnboarding implements CoordinadorOnboardingPort {
  async registrar(
    input: SignupCoordinadorInput
  ): Promise<{ userId: string; estado: EstadoSolicitudCoordinador }> {
    const errores = validarSignupCoordinador(input);
    if (Object.keys(errores).length > 0) {
      throw new Error("Datos de registro inválidos: " + Object.values(errores).join(" "));
    }

    const email = input.email.trim();
    const { data, error: authError } = await supabase.auth.signUp({
      email,
      password: input.password,
    });
    if (authError) throw new Error(authError.message);
    const userId = data.user?.id;
    if (!userId) throw new Error("No se pudo crear la cuenta (¿confirmación por email activa?).");

    const { error: insertError } = await supabase
      .from("reencuentro_solicitudes_coordinador")
      .insert({
        user_id: userId,
        nombre_completo: input.nombreCompleto.trim(),
        email,
        telefono: input.telefono.trim(),
        zona: input.zona.trim(),
        organizacion: input.organizacion?.trim() ?? null,
        estado: "PENDIENTE",
      });
    if (insertError) throw new Error(insertError.message);

    return { userId, estado: "PENDIENTE" };
  }
}
