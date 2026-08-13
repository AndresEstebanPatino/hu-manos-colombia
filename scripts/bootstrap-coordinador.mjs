// Crea el PRIMER COORDINADOR de forma programática (Auth Admin API + rol RBAC).
// Necesita la SERVICE_ROLE key (secreta) — se pasa por variable de entorno, NUNCA se commitea.
//
// Uso (PowerShell):
//   $env:SUPABASE_URL="https://xrxuzvvvorxukyoeqibg.supabase.co"
//   $env:SUPABASE_SERVICE_ROLE_KEY="<service_role key de Settings > API>"
//   $env:COORD_EMAIL="coordinador@tu-dominio.com"
//   $env:COORD_PASSWORD="una-clave-fuerte"
//   npm run bootstrap:coord
//
// Uso (bash):
//   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... COORD_EMAIL=... COORD_PASSWORD=... npm run bootstrap:coord

import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const email = process.env.COORD_EMAIL;
const password = process.env.COORD_PASSWORD;

if (!url || !serviceKey || !email || !password) {
  console.error(
    "Faltan variables de entorno: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, COORD_EMAIL, COORD_PASSWORD"
  );
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data, error } = await admin.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
});

if (error) {
  console.error("Error creando el usuario:", error.message);
  process.exit(1);
}

const userId = data.user.id;

const { error: rolError } = await admin
  .from("reencuentro_roles")
  .insert({ user_id: userId, rol: "COORDINADOR" });

if (rolError) {
  console.error(
    `Usuario creado (uid: ${userId}) pero falló asignar el rol: ${rolError.message}`
  );
  process.exit(1);
}

console.log(`✓ COORDINADOR creado: ${email} (uid: ${userId})`);
