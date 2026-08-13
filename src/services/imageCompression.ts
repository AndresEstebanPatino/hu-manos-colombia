import * as ImageManipulator from "expo-image-manipulator";
import * as FileSystem from "expo-file-system";
import { decode } from "base64-arraybuffer";
import { supabase, isSupabaseConfigured } from "../lib/supabase";

/**
 * Nombre exacto del bucket de Supabase Storage para fotos de necesidades
 */
export const SUPABASE_STORAGE_BUCKET = "necesidades-fotos";

/**
 * Optimiza y comprime una imagen antes de subirla a Supabase Storage:
 * - Redimensiona el ancho a un máximo de 1080px (manteniendo el aspect ratio)
 * - Comprime la calidad al 75% (0.75) en formato JPEG
 * Esto reduce drásticamente el tamaño del archivo (de ~5MB-10MB a ~150KB-300KB).
 */
export const compressImageForUpload = async (uri: string): Promise<string> => {
  if (!uri || uri.startsWith("http://") || uri.startsWith("https://")) {
    return uri;
  }
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

/**
 * Función UNIFICADA y ROBUSTA para subir imágenes a Supabase Storage en Android (APK), iOS y Web.
 * Lee la imagen con expo-file-system + base64-arraybuffer para evitar el fallo de fetch(fileUri) en APK Android.
 */
export const uploadImageToSupabaseStorage = async (rawUri: string): Promise<string | null> => {
  if (!rawUri || !isSupabaseConfigured()) return null;

  // Si la URI ya es una URL remota de Supabase/HTTP, retornarla directamente
  if (rawUri.startsWith("http://") || rawUri.startsWith("https://")) {
    return rawUri;
  }

  try {
    // 1. Comprimir la imagen local
    const compressedUri = await compressImageForUpload(rawUri);

    // 2. Leer archivo local en Base64 para evitar fetch(fileUri) Network request failed en Android APK
    const base64Data = await FileSystem.readAsStringAsync(compressedUri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    const arrayBuffer = decode(base64Data);
    const filename = `need-${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;

    // 3. Subir a Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(SUPABASE_STORAGE_BUCKET)
      .upload(filename, arrayBuffer, {
        contentType: "image/jpeg",
        upsert: true,
      });

    if (uploadError) {
      console.error("❌ Error de Supabase Storage:", uploadError);
      throw new Error(`Error de Storage [${uploadError.name}]: ${uploadError.message}`);
    }

    // 4. Obtener URL pública
    const { data: publicUrlData } = supabase.storage
      .from(SUPABASE_STORAGE_BUCKET)
      .getPublicUrl(uploadData.path);

    return publicUrlData.publicUrl;
  } catch (err: any) {
    console.error("❌ Error detallado al subir imagen a Supabase:", err);
    throw err;
  }
};
