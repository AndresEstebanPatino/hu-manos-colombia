/**
 * Genera un id de cliente (UUID v4) como clave de idempotencia de sync.
 * Suficiente para el MVP; swappable por expo-crypto.randomUUID() más adelante.
 */
export function generarIdCliente(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
