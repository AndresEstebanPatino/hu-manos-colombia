import * as ImagePicker from "expo-image-picker";
import { uploadImageToSupabaseStorage } from "../../../services/imageCompression";

/**
 * Elige una foto (galería o cámara), la sube comprimida a Supabase Storage y
 * devuelve la URL pública. Reutiliza la compresión/subida del app base. Best-effort:
 * devuelve null si se cancela, no hay permiso o falla.
 */
export async function elegirYSubirFoto(
  fuente: "CAMARA" | "GALERIA" = "GALERIA"
): Promise<string | null> {
  try {
    if (fuente === "CAMARA") {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") return null;
    } else {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") return null;
    }
    const result =
      fuente === "CAMARA"
        ? await ImagePicker.launchCameraAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            quality: 0.8,
          })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            quality: 0.8,
          });
    if (result.canceled || !result.assets?.[0]?.uri) return null;
    return await uploadImageToSupabaseStorage(result.assets[0].uri);
  } catch {
    return null;
  }
}
