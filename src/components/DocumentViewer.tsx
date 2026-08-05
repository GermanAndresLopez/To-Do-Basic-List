"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { CloseIcon, DownloadIcon } from "@/components/icons";
import {
  downloadFile,
  fileKind,
  formatFileSize,
  isPdf,
} from "@/lib/downloadFile";

type ViewerProps = {
  fileName: string;
  contentType?: string;
  size?: number;
  url: string | null;
  subtitle?: string;
  onClose: () => void;
};

/**
 * Mounted only while the viewer is open, so per-document state (such as having
 * opted into the Office viewer) starts fresh for every file.
 */
function ViewerPanel({
  fileName,
  contentType,
  size,
  url,
  subtitle,
  onClose,
}: ViewerProps) {
  const [useOfficeViewer, setUseOfficeViewer] = useState(false);
  const [officeReady, setOfficeReady] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const pdf = isPdf(fileName, contentType);
  const kind = fileKind(fileName);

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
    >
      <div
        className="absolute inset-0 bg-ink/50 backdrop-blur-[2px]"
        onClick={onClose}
      />

      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label={`Vista previa de ${fileName}`}
        initial={{ opacity: 0, scale: 0.97, y: 6 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.98 }}
        transition={{ type: "spring", duration: 0.35, bounce: 0.12 }}
        className="relative flex h-full max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-surface shadow-2xl"
      >
        <header className="flex shrink-0 items-start gap-2 border-b border-border px-4 py-3">
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-[15px] font-semibold text-ink">
              {fileName}
            </h2>
            <p className="mt-0.5 text-[12px] text-ink-tertiary">
              {kind}
              {size !== undefined && ` · ${formatFileSize(size)}`}
              {subtitle && ` · ${subtitle}`}
            </p>
          </div>

          <button
            type="button"
            onClick={() => url && downloadFile(url, fileName)}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-accent px-3 py-2 text-[13px] font-medium text-white transition-[transform,background-color] duration-150 ease-out hover:bg-accent-hover active:scale-[0.97]"
          >
            <DownloadIcon className="h-4 w-4" />
            <span className="hidden sm:inline">Descargar</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="shrink-0 rounded-lg p-2 text-ink-tertiary transition-colors duration-150 hover:bg-surface-hover hover:text-ink active:scale-90"
          >
            <CloseIcon className="h-4 w-4" />
          </button>
        </header>

        <div className="min-h-0 flex-1 bg-canvas">
          {!url ? (
            <div className="flex h-full items-center justify-center px-6 text-center text-[14px] text-ink-secondary">
              El archivo ya no está disponible.
            </div>
          ) : pdf ? (
            <object data={url} type="application/pdf" className="h-full w-full">
              <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
                <p className="text-[14px] text-ink-secondary">
                  Tu navegador no puede mostrar PDF incrustados.
                </p>
                <button
                  type="button"
                  onClick={() => downloadFile(url, fileName)}
                  className="rounded-lg bg-accent px-4 py-2.5 text-[14px] font-medium text-white"
                >
                  Descargar para revisarlo
                </button>
              </div>
            </object>
          ) : useOfficeViewer ? (
            <div className="relative h-full w-full">
              <iframe
                title={`Vista previa de ${fileName}`}
                src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url)}`}
                onLoad={() => setOfficeReady(true)}
                className="h-full w-full border-0"
              />
              {/* Microsoft's renderer can take a while; say so instead of
                  leaving the reviewer looking at a blank frame. */}
              {!officeReady && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-canvas px-6 text-center">
                  <span className="h-6 w-6 animate-spin rounded-full border-2 border-border-strong border-t-accent" />
                  <p className="text-[14px] font-medium text-ink">
                    Abriendo con el visor de Office…
                  </p>
                  <p className="max-w-xs text-[12px] leading-relaxed text-ink-tertiary">
                    Puede tardar bastante: el documento se envía a los
                    servidores de Microsoft para convertirlo. Si tienes prisa,
                    descárgalo.
                  </p>
                  <button
                    type="button"
                    onClick={() => downloadFile(url, fileName)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border-strong px-3 py-2 text-[13px] font-medium text-ink-secondary transition-colors duration-150 hover:bg-surface-hover active:scale-[0.97]"
                  >
                    <DownloadIcon className="h-4 w-4" />
                    Descargar
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
              <p className="max-w-sm text-[14px] leading-relaxed text-ink-secondary">
                Los archivos de {kind} no se pueden mostrar directamente en el
                navegador. Descárgalo para revisarlo sin conexión, o ábrelo con
                el visor web de Office.
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                <button
                  type="button"
                  onClick={() => downloadFile(url, fileName)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2.5 text-[14px] font-medium text-white transition-transform duration-150 ease-out active:scale-[0.97]"
                >
                  <DownloadIcon className="h-4 w-4" />
                  Descargar
                </button>
                <button
                  type="button"
                  onClick={() => setUseOfficeViewer(true)}
                  className="rounded-lg border border-border-strong px-4 py-2.5 text-[14px] font-medium text-ink-secondary transition-colors duration-150 hover:bg-surface-hover active:scale-[0.97]"
                >
                  Abrir con visor de Office
                </button>
              </div>
              <p className="max-w-sm text-[11px] leading-relaxed text-ink-tertiary">
                El visor de Office envía el archivo a Microsoft para mostrarlo,
                y suele tardar. Descargarlo es más rápido.
              </p>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

export function DocumentViewer({
  open,
  ...props
}: ViewerProps & { open: boolean }) {
  return (
    <AnimatePresence>{open && <ViewerPanel {...props} />}</AnimatePresence>
  );
}
