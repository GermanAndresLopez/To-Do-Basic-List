"use client";

import { useMutation } from "convex/react";
import { AnimatePresence, motion } from "motion/react";
import { useRef, useState } from "react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { DocumentViewer } from "@/components/DocumentViewer";
import { StatusBadge } from "@/components/StatusBadge";
import {
  DownloadIcon,
  EyeIcon,
  PaperclipIcon,
  ReturnIcon,
  CheckIcon,
} from "@/components/icons";
import { downloadFile, fileKind, formatFileSize } from "@/lib/downloadFile";
import { playCheckSound } from "@/lib/sound";

const ACCEPT = ".doc,.docx,.xls,.xlsx,.pdf";

type Attachment = {
  _id: Id<"attachments">;
  fileName: string;
  size: number;
  url: string | null;
};

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
  const reopen = useMutation(api.deliverables.reopen);

  const fileInput = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [corrections, setCorrections] = useState("");
  const [reviewing, setReviewing] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [confirm, setConfirm] = useState<
    "aprobar" | "devolver" | "reabrir" | null
  >(null);

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
    setConfirm(null);
    if (!adminToken) return;
    setReviewing(true);
    setError(null);
    try {
      await approve({ token: adminToken, subtaskId });
      playCheckSound();
      // The reviewer keeps a copy of every deliverable they sign off on.
      if (attachment?.url) {
        await downloadFile(attachment.url, attachment.fileName);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo aprobar");
    } finally {
      setReviewing(false);
    }
  }

  async function handleSendBack() {
    setConfirm(null);
    if (!adminToken) return;
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

  async function handleReopen() {
    setConfirm(null);
    if (!adminToken) return;
    setReviewing(true);
    setError(null);
    try {
      await reopen({ token: adminToken, subtaskId });
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo reabrir");
    } finally {
      setReviewing(false);
    }
  }

  const canUpload = !isAdmin && status !== "aprobado";
  const showReviewPanel = isAdmin && attachment && status === "revision";
  const canReopen = isAdmin && status === "aprobado";

  return (
    <div className="mt-2 flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-1.5">
        {status && <StatusBadge status={status} size="sm" />}

        {attachment && (
          <span className="inline-flex max-w-full items-center gap-1 rounded-full border border-border-strong bg-surface py-0.5 pl-2 pr-0.5 text-[11px]">
            <PaperclipIcon className="h-3 w-3 shrink-0 text-ink-tertiary" />
            <span className="truncate font-medium text-ink">
              {attachment.fileName}
            </span>
            <span className="shrink-0 text-ink-tertiary">
              {formatFileSize(attachment.size)}
            </span>
            <button
              type="button"
              onClick={() => setViewerOpen(true)}
              aria-label="Ver documento"
              title="Ver documento"
              className="shrink-0 rounded-full p-1 text-ink-secondary transition-colors duration-150 hover:bg-surface-hover hover:text-accent active:scale-90"
            >
              <EyeIcon className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() =>
                attachment.url &&
                downloadFile(attachment.url, attachment.fileName)
              }
              aria-label="Descargar documento"
              title="Descargar"
              className="shrink-0 rounded-full p-1 text-ink-secondary transition-colors duration-150 hover:bg-surface-hover hover:text-accent active:scale-90"
            >
              <DownloadIcon className="h-3.5 w-3.5" />
            </button>
          </span>
        )}

        {canReopen && (
          <button
            type="button"
            onClick={() => setConfirm("reabrir")}
            disabled={reviewing}
            className="inline-flex items-center gap-1 rounded-full border border-border-strong bg-surface px-2.5 py-1 text-[11px] font-medium text-ink-secondary transition-[transform,background-color] duration-150 ease-out hover:bg-surface-hover active:scale-[0.97] disabled:opacity-50"
          >
            <ReturnIcon className="h-3 w-3" />
            Reabrir
          </button>
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
              className="inline-flex items-center gap-1 rounded-full border border-border-strong bg-surface px-2.5 py-1 text-[11px] font-medium text-ink-secondary transition-[transform,background-color] duration-150 ease-out hover:bg-surface-hover active:scale-[0.97] disabled:opacity-50"
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
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
            className="overflow-hidden"
          >
            <div className="rounded-lg border-l-[3px] border-danger bg-danger-bg px-3 py-2">
              <p className="text-[11px] font-bold uppercase tracking-wide text-danger">
                Correcciones del administrador
              </p>
              <p className="mt-0.5 text-[12px] leading-relaxed text-ink">
                {feedback}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {showReviewPanel && (
        <div className="rounded-xl border border-border-strong bg-surface p-3">
          <p className="text-[11px] font-bold uppercase tracking-wide text-ink-tertiary">
            Revisión del administrador
          </p>

          <button
            type="button"
            onClick={() => setViewerOpen(true)}
            className="mt-2 inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-accent/30 bg-accent/5 px-3 py-2 text-[13px] font-semibold text-accent transition-[transform,background-color] duration-150 ease-out hover:bg-accent/10 active:scale-[0.98]"
          >
            <EyeIcon className="h-4 w-4" />
            Abrir {fileKind(attachment.fileName)} para revisar
          </button>

          <textarea
            value={corrections}
            onChange={(e) => setCorrections(e.target.value)}
            placeholder="Correcciones para el responsable (obligatorio si vas a devolver)"
            rows={2}
            className="mt-2 w-full resize-y rounded-lg border border-border bg-surface px-2.5 py-2 text-[12px] leading-relaxed text-ink outline-none transition-shadow duration-150 placeholder:text-ink-tertiary focus:border-accent focus:ring-2 focus:ring-accent/15"
          />

          <div className="mt-2 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setConfirm("devolver")}
              disabled={reviewing || !corrections.trim()}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-danger/30 bg-danger-bg px-3 py-2.5 text-[13px] font-semibold text-danger transition-[transform,opacity] duration-150 ease-out hover:bg-danger/15 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40"
            >
              <ReturnIcon className="h-4 w-4" />
              Devolver
            </button>
            <button
              type="button"
              onClick={() => setConfirm("aprobar")}
              disabled={reviewing}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-success px-3 py-2.5 text-[13px] font-semibold text-white transition-[transform,opacity] duration-150 ease-out hover:opacity-90 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50"
            >
              <CheckIcon className="h-4 w-4" />
              Aprobar
            </button>
          </div>

          {!corrections.trim() && (
            <p className="mt-1.5 text-[11px] text-ink-tertiary">
              Para devolver, escribe primero las correcciones.
            </p>
          )}
        </div>
      )}

      {error && <p className="text-[11px] font-medium text-danger">{error}</p>}

      {attachment && (
        <DocumentViewer
          open={viewerOpen}
          fileName={attachment.fileName}
          size={attachment.size}
          url={attachment.url}
          onClose={() => setViewerOpen(false)}
        />
      )}

      <ConfirmDialog
        open={confirm === "aprobar"}
        title="Aprobar entregable"
        description="La subtarea quedará marcada como completada y el archivo se descargará en tu equipo. Podrás reabrirla después si hace falta."
        confirmLabel="Aprobar"
        destructive={false}
        onConfirm={handleApprove}
        onCancel={() => setConfirm(null)}
      />

      <ConfirmDialog
        open={confirm === "devolver"}
        title="Devolver entregable"
        description={`El responsable verá la etiqueta de retroalimentación con tus correcciones: "${corrections.trim()}"`}
        confirmLabel="Devolver"
        onConfirm={handleSendBack}
        onCancel={() => setConfirm(null)}
      />

      <ConfirmDialog
        open={confirm === "reabrir"}
        title="Reabrir entregable"
        description="Volverá a quedar en revisión y dejará de contar como completado. El archivo entregado se conserva."
        confirmLabel="Reabrir"
        destructive={false}
        onConfirm={handleReopen}
        onCancel={() => setConfirm(null)}
      />
    </div>
  );
}
