// Tipo compartido para inyectar marcadores de PERSONAS (módulo reencuentro) en el
// mapa de necesidades sin acoplar el componente al dominio de reencuentro.
export interface PersonaMarker {
  id: string;
  lat: number;
  lng: number;
  nombre: string;
  tipo: "BUSCADA" | "ENCONTRADA";
  ubicacion?: string;
}
