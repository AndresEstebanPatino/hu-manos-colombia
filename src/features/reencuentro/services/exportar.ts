import { Platform, Share } from "react-native";

/**
 * Exporta un texto (p. ej. el documento PFIF). En web dispara una descarga de
 * archivo; en nativo abre el diálogo de compartir con el contenido. Best-effort.
 */
export function exportarTexto(
  contenido: string,
  nombreArchivo = "export.txt",
  tipoMime = "text/plain"
): void {
  if (Platform.OS === "web" && typeof document !== "undefined") {
    const blob = new Blob([contenido], { type: tipoMime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = nombreArchivo;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } else {
    void Share.share({ message: contenido, title: nombreArchivo });
  }
}

/** Exporta el documento PFIF (descarga .xml en web / compartir en nativo). */
export function exportarPfif(xml: string): void {
  exportarTexto(xml, "personas-buscadas.pfif.xml", "application/xml");
}
