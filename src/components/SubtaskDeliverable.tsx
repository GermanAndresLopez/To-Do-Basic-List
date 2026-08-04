"use client";

import { useMutation } from "convex/react";
import { AnimatePresence, motion } from "motion/react";
import { useRef, useState } from "react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { PaperclipIcon } from "@/components/icons";
import { playCheckSound } from "@/lib/sound";

const ACCEPT = ".doc,.docx,.xls,.xlsx,.pdf";

type Attachment = {
  _id: Id<"attachments">;
  fileName: string;
  size: number;
  syncStatus: string;
  syncFolder?: "Revision" | "Finales";
  url: string | null;
};

const STATUS_STYLES = {
  revision: { label: "En revisión", bg: "#FFF4E8", text: "#B4560B" },
  aprobado: { label: "Aprobado", bg: "#EAFBF1", text: "#0C8F63" },
  devuelto: { label: "Retroalimentación", bg: "#FFE9E7", text: "#C0281F" },
} as const;

export function StatusBadge({ status }: { status: keyof typeof STATUS_STYLES }) {
  const style = STATUS_STYLES[status];
  return (
    <span
      className="rounded-full px-2 py-0.5 text-[11px] font-semibold"
      style={{ backgroundColor: style.bg, color: style.text }}
    >
      {style.label}
    </span>
  );
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function SubtaskDeliverable({
  subtaskId,
  status,
  feedback,
  attachment,
  isAdmin,
  adminToken,
}: {
  subtaskId: Id<"subtasks">;
  status?: "revision" | "aprobado" | "devuelto";
  feedback?: string;
  attachment: Attachment | null;
  isAdmin: boolean;
  adminToken: string | null;
}) {
  const generateUploadUrl = useMutation(api.deliverables.generateUploadUrl);
  const attach = useMutation(api.deliverables.attach);
  const approve = useMutation(api.deliverables.approve);
  const sendBack = useMutation(api.deliverables.sendBack);

  const fileInput = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [corrections, setCorrections] = useState("");
  const [reviewing, setReviewing] = useState(false);

  async function handleFile(file: File) {
    setError(null);
    setUploading(true);
    try {
      const uploadUrl = await generateUploadUrl();
      const result = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type || "application/octet-stream" },
        body: file,
      });
      if (!result.ok) throw new Error("No se pudo subir el archivo");
      const { storageId } = await result.json();

      await attach({
        subtaskId,
        storageId,
        fileName: file.name,
        contentType: file.type || "application/octet-stream",
        size: file.size,
      });
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "No se pudo adjuntar el entregable"
      );
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  async function handleApprove() {
    if (!adminToken) return;
    setReviewing(true);
    setError(null);
    try {
      await approve({ token: adminToken, subtaskId });
      playCheckSound();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo aprobar");
    } finally {
      setReviewing(false);
    }
  }

  async function handleSendBack() {
    if (!adminToken) return;
    if (!corrections.trim()) {
      setError("Escribe las correcciones antes de devolver");
      return;
    }
    setReviewing(true);
    setError(null);
    try {
      await sendBack({ token: adminToken, subtaskId, feedback: corrections });
      setCorrections("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo devolver");
    } finally {
      setReviewing(false);
    }
  }

  const canUpload = !isAdmin && status !== "aprobado";

  return (
    <div className="mt-1.5 flex flex-col gap-1.5">
      <div className="flex flex-wrap items-center gap-2">
        {status && <StatusBadge status={status} />}

        {attachment && (
          <a
            href={attachment.url ?? "#"}
            target="_blank"
            rel="noreferrer"
            className="inline-flex max-w-full items-center gap-1 rounded-full bg-surface px-2 py-0.5 text-[11px] font-medium text-accent transition-colors duration-150 hover:bg-surface-hover"
          >
            <PaperclipIcon className="h-3 w-3 shrink-0" />
            <span className="truncate">{attachment.fileName}</span>
            <span className="shrink-0 text-ink-tertiary">
              ({formatSize(attachment.size)})
            </span>
          </a>
        )}

        {attachment?.syncStatus === "sin_configurar" && (
          <span className="text-[11px] text-ink-tertiary">
            SharePoint sin configurar
          </span>
        )}
        {attachment?.syncStatus === "error" && (
          <span className="text-[11px] text-danger">Error al sincronizar</span>
        )}
        {attachment?.syncStatus === "enviado" && attachment.syncFolder && (
          <span className="text-[11px] text-ink-tertiary">
            En SharePoint / {attachment.syncFolder}
          </span>
        )}

        {canUpload && (
          <>
            <input
              ref={fileInput}
              type="file"
              accept={ACCEPT}
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
              }}
            />
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              disabled={uploading}
              className="inline-flex items-center gap-1 rounded-full border border-border-strong bg-surface px-2.5 py-0.5 text-[11px] font-medium text-ink-secondary transition-[transform,background-color] duration-150 ease-out hover:bg-surface-hover active:scale-[0.97] disabled:opacity-50"
            >
              <PaperclipIcon className="h-3 w-3" />
              {uploading
                ? "Subiendo..."
                : attachment
                  ? "Reemplazar"
                  : "Adjuntar"}
            </button>
          </>
        )}
      </div>

      <AnimatePresence initial={false}>
        {feedback && status === "devuelto" && (
          <motion.p
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
            className="overflow-hidden rounded-lg bg-danger-bg px-2.5 py-1.5 text-[12px] leading-relaxed text-ink"
          >
            <span className="font-semibold">Correcciones:</span> {feedback}
          </motion.p>
        )}
      </AnimatePresence>

      {isAdmin && attachment && status === "revision" && (
        <div className="flex flex-col gap-1.5 rounded-lg border border-border-strong/60 bg-surface p-2">
          <textarea
            value={corrections}
            onChange={(e) => setCorrections(e.target.value)}
            placeholder="Correcciones para el responsable (requerido para devolver)"
            rows={2}
            className="w-full resize-y rounded-md border border-border bg-surface px-2 py-1.5 text-[12px] text-ink outline-none placeholder:text-ink-tertiary focus:border-accent"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleApprove}
              disabled={reviewing}
              className="rounded-lg bg-success px-3 py-1.5 text-[12px] font-semibold text-white transition-[transform,opacity] duration-150 ease-out hover:opacity-90 active:scale-[0.97] disabled:opacity-50"
            >
              Aprobar
            </button>
            <button
              type="button"
              onClick={handleSendBack}
              disabled={reviewing}
              className="rounded-lg bg-danger px-3 py-1.5 text-[12px] font-semibold text-white transition-[transform,opacity] duration-150 ease-out hover:opacity-90 active:scale-[0.97] disabled:opacity-50"
            >
              Devolver
            </button>
          </div>
        </div>
      )}

      {error && <p className="text-[11px] text-danger">{error}</p>}
    </div>
  );
}
