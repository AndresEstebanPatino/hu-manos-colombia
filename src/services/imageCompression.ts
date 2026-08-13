import * as ImageManipulator from "expo-image-manipulator";

/**
 * Nombre exacto del bucket de Supabase Storage para fotos de necesidades
 */
export const SUPABASE_STORAGE_BUCKET = "necesidades-fotos";

/**
 * Optimiza y comprime una imagen antes de subirla a Supabase Storage:
 * - Redimensiona el ancho a un máximo de 1080px (manteniendo el aspect ratio)
 * - Comprime la calidad al 75% (0.75) en formato JPEG
 * Esto reduce drásticamente el tamaño del archivo (de ~5MB-10MB a ~150KB-300KB),
 * ahorrando almacenamiento y ancho de banda (egress) en el plan de Supabase.
 */
export const compressImageForUpload = async (uri: string): Promise<string> => {
  try {
    const manipResult = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: 1080 } }],
      { compress: 0.75, format: ImageManipulator.SaveFormat.JPEG }
    );
    return manipResult.uri;
  } catch (err) {
    console.warn("No se pudo comprimir la imagen con ImageManipulator, usando URI original:", err);
    return uri;
  }
};
