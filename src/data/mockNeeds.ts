import { Necesidad } from "../types/need";

export const INITIAL_MOCK_NEEDS: Necesidad[] = [
  {
    id: "need-001",
    tipo: "RECURSO",
    categoria: "BEBES_LACTANCIA",
    titulo: "Urgente: Nodriza / Leche materna para bebé de 7 meses",
    descripcion: "Bebé de 7 meses rescatado en albergue temporal necesita fórmula láctea etapa 2 o nodriza voluntaria. La madre se encuentra incapacitada temporalmente.",
    ubicacion: "Cancha Barrio Boston, Pereira (Risaralda)",
    contacto_whatsapp: "+573105550192",
    meta_cantidad: 1,
    progreso_actual: 0,
    completado: false,
    creado_en: new Date(Date.now() - 1000 * 60 * 25).toISOString(), // Hace 25 min
    unidad_medida: "lactante / kit"
  },
  {
    id: "need-002",
    tipo: "VOLUNTARIO",
    categoria: "MANO_DE_OBRA",
    titulo: "Se solicitan 10 voluntarios para mover escombros y limpiar vía",
    descripcion: "Por deslizamiento de tierra se requiere apoyo con palas, carretillas y botas para despejar la vía principal de acceso a la vereda.",
    ubicacion: "Vereda El Tablazo, Manizales (Caldas)",
    contacto_whatsapp: "+573124449811",
    meta_cantidad: 10,
    progreso_actual: 4,
    completado: false,
    creado_en: new Date(Date.now() - 1000 * 60 * 50).toISOString(), // Hace 50 min
    unidad_medida: "voluntarios"
  },
  {
    id: "need-003",
    tipo: "RECURSO",
    categoria: "ROPA_COBIJAS",
    titulo: "Cobijas térmicas y colchonetas para 15 familias en albergue",
    descripcion: "Familias damnificadas por creciente del río requieren cobijas limpias, aislantes y colchonetas sencillas para pasar la noche.",
    ubicacion: "Coliseo Municipal, Quibdó (Chocó)",
    contacto_whatsapp: "+573158882030",
    meta_cantidad: 15,
    progreso_actual: 8,
    completado: false,
    creado_en: new Date(Date.now() - 1000 * 60 * 120).toISOString(), // Hace 2 horas
    unidad_medida: "kits de descanso"
  },
  {
    id: "need-004",
    tipo: "RECURSO",
    categoria: "ALIMENTOS",
    titulo: "Mercados no perecederos y agua potable empacada",
    descripcion: "Requerimos agua embotellada, arroz, enlatados y granos para la olla comunitaria del barrio afectada por lluvias intensas.",
    ubicacion: "Comedor Comunitario Barrio Siloé, Cali (Valle del Cauca)",
    contacto_whatsapp: "+573001112233",
    meta_cantidad: 50,
    progreso_actual: 32,
    completado: false,
    creado_en: new Date(Date.now() - 1000 * 60 * 240).toISOString(), // Hace 4 horas
    unidad_medida: "mercados / paquetes"
  },
  {
    id: "need-005",
    tipo: "VOLUNTARIO",
    categoria: "SALUD",
    titulo: "Enfermero(a) o Paramédico para curaciones básicas",
    descripcion: "Apoyo con botiquín y elementos de primeros auxilios para atender raspones y contusiones menores en damnificados.",
    ubicacion: "Salón Comunal Barrio Kennedy, Bogotá D.C.",
    contacto_whatsapp: "+573187779900",
    meta_cantidad: 3,
    progreso_actual: 3,
    completado: true,
    creado_en: new Date(Date.now() - 1000 * 60 * 600).toISOString(), // Hace 10 horas
    unidad_medida: "personal médico"
  },
  {
    id: "need-006",
    tipo: "RECURSO",
    categoria: "BEBES_LACTANCIA",
    titulo: "Pañales etapa 1 y 2 + Toallitas húmedas para 8 bebés",
    descripcion: "Madres en refugio temporal necesitan pañales desechables talla P y M urgentemente.",
    ubicacion: "Parroquia San José, Mocoa (Putumayo)",
    contacto_whatsapp: "+573113334455",
    meta_cantidad: 8,
    progreso_actual: 8,
    completado: true,
    creado_en: new Date(Date.now() - 1000 * 60 * 1440).toISOString(), // Hace 24 horas
    unidad_medida: "paquetes pañales"
  }
];
