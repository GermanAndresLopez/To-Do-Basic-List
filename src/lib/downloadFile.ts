"use client";

/**
 * Convex serves files from another origin, where the `download` attribute is
 * ignored, so the blob is pulled down first to force a real save dialog.
 */
export async function downloadFile(url: string, fileName: string) {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error("No se pudo descargar");
    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(objectUrl);
  } catch {
    window.open(url, "_blank", "noopener");
  }
}

export function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function isPdf(fileName: string, contentType?: string) {
  return (
    contentType === "application/pdf" || fileName.toLowerCase().endsWith(".pdf")
  );
}

export function fileKind(fileName: string): "PDF" | "Word" | "Excel" | "Archivo" {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".pdf")) return "PDF";
  if (lower.endsWith(".doc") || lower.endsWith(".docx")) return "Word";
  if (lower.endsWith(".xls") || lower.endsWith(".xlsx")) return "Excel";
  return "Archivo";
}
