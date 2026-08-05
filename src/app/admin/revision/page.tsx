"use client";

import { useQuery } from "convex/react";
import { motion } from "motion/react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { api } from "../../../../convex/_generated/api";
import { DocumentViewer } from "@/components/DocumentViewer";
import { StatusBadge } from "@/components/StatusBadge";
import {
  ChevronLeftIcon,
  DownloadIcon,
  EyeIcon,
  HistoryIcon,
} from "@/components/icons";
import { downloadFile, fileKind, formatFileSize } from "@/lib/downloadFile";
import { PERSON_CHIP_CLASS, parseSubtaskName } from "@/lib/subtaskFormat";
import { useAdminSession } from "@/lib/useAdminSession";

type Filter = "todos" | "revision" | "aprobado" | "devuelto";

const FILTERS: { value: Filter; label: string }[] = [
  { value: "todos", label: "Todos" },
  { value: "revision", label: "En revisión" },
  { value: "devuelto", label: "Devueltos" },
  { value: "aprobado", label: "Aprobados" },
];

function formatDate(timestamp: number) {
  return new Intl.DateTimeFormat("es-CO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(timestamp));
}

export default function RevisionPage() {
  const { isAdmin, token, checking } = useAdminSession();
  const history = useQuery(
    api.deliverables.history,
    isAdmin && token ? { token } : "skip"
  );

  const [filter, setFilter] = useState<Filter>("todos");
  const [viewing, setViewing] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (!history) return [];
    if (filter === "todos") return history;
    return history.filter((entry) => entry.subtaskStatus === filter);
  }, [history, filter]);

  const openEntry = filtered.find((entry) => entry._id === viewing) ?? null;

  if (checking) {
    return (
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6">
        <div className="h-24 animate-pulse rounded-2xl bg-surface-hover" />
      </main>
    );
  }

  if (!isAdmin) {
    return (
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-16 text-center sm:px-6">
        <p className="text-[15px] text-ink-secondary">
          Esta ventana es solo para el administrador.
        </p>
        <Link
          href="/admin"
          className="mt-3 inline-flex items-center gap-1 text-[14px] font-medium text-accent"
        >
          Iniciar sesión
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-5 px-4 py-8 sm:px-6 sm:py-10">
      <div>
        <Link
          href="/projects"
          className="inline-flex items-center gap-0.5 text-[14px] font-medium text-ink-secondary transition-colors duration-150 hover:text-ink"
        >
          <ChevronLeftIcon className="h-3.5 w-3.5" />
          Proyectos
        </Link>
        <h1 className="mt-2 flex items-center gap-2 text-[26px] font-bold leading-tight tracking-[-0.02em] text-ink sm:text-[30px]">
          <HistoryIcon className="h-6 w-6 text-accent" />
          Revisión
        </h1>
        <p className="mt-1 text-[15px] text-ink-secondary">
          Historial de todos los documentos entregados, incluidas las versiones
          reemplazadas.
        </p>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {FILTERS.map((option) => {
          const count =
            option.value === "todos"
              ? (history?.length ?? 0)
              : (history?.filter((e) => e.subtaskStatus === option.value)
                  .length ?? 0);
          const active = filter === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => setFilter(option.value)}
              className={`rounded-full px-3 py-1.5 text-[13px] font-medium transition-colors duration-150 active:scale-[0.97] ${
                active
                  ? "bg-ink text-white"
                  : "border border-border bg-surface text-ink-secondary hover:bg-surface-hover"
              }`}
            >
              {option.label}
              <span className={active ? "text-white/60" : "text-ink-tertiary"}>
                {" "}
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {history === undefined ? (
        <div className="flex flex-col gap-3">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-24 animate-pulse rounded-2xl bg-surface-hover"
            />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border px-6 py-14 text-center text-[15px] text-ink-secondary">
          {history.length === 0
            ? "Todavía no se ha entregado ningún documento."
            : "No hay documentos con este estado."}
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {filtered.map((entry, index) => {
            const { text, people } = parseSubtaskName(entry.subtaskName);
            return (
              <motion.li
                key={entry._id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.25,
                  delay: Math.min(index * 0.03, 0.2),
                  ease: [0.23, 1, 0.32, 1],
                }}
                className="rounded-2xl border border-border bg-surface p-4 shadow-sm"
              >
                <div className="flex flex-wrap items-center gap-1.5">
                  {entry.subtaskStatus && (
                    <StatusBadge status={entry.subtaskStatus} size="sm" />
                  )}
                  {!entry.isCurrent && (
                    <span className="rounded-full bg-surface-hover px-2 py-0.5 text-[11px] font-semibold text-ink-tertiary">
                      Versión reemplazada
                    </span>
                  )}
                  <span className="ml-auto text-[12px] tabular-nums text-ink-tertiary">
                    {formatDate(entry.uploadedAt)}
                  </span>
                </div>

                <p className="mt-2 text-[12px] font-semibold uppercase tracking-wide text-ink-tertiary">
                  {entry.taskNumber !== undefined
                    ? `Entregable ${entry.taskNumber}`
                    : entry.taskName}
                </p>
                <p className="mt-0.5 text-[14px] font-medium leading-snug text-ink">
                  {text}
                </p>

                {people.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {people.map((person) => (
                      <span key={person} className={PERSON_CHIP_CLASS}>
                        {person}
                      </span>
                    ))}
                  </div>
                )}

                <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-medium text-ink">
                      {entry.fileName}
                    </span>
                    <span className="text-[11px] text-ink-tertiary">
                      {fileKind(entry.fileName)} ·{" "}
                      {formatFileSize(entry.size)}
                    </span>
                  </span>

                  <button
                    type="button"
                    onClick={() => setViewing(entry._id)}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-border-strong px-3 py-1.5 text-[12px] font-medium text-ink-secondary transition-[transform,background-color] duration-150 ease-out hover:bg-surface-hover active:scale-[0.97]"
                  >
                    <EyeIcon className="h-3.5 w-3.5" />
                    Ver
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      entry.url && downloadFile(entry.url, entry.fileName)
                    }
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-[12px] font-medium text-white transition-[transform,background-color] duration-150 ease-out hover:bg-accent-hover active:scale-[0.97]"
                  >
                    <DownloadIcon className="h-3.5 w-3.5" />
                    Descargar
                  </button>
                </div>
              </motion.li>
            );
          })}
        </ul>
      )}

      {openEntry && (
        <DocumentViewer
          open
          fileName={openEntry.fileName}
          contentType={openEntry.contentType}
          size={openEntry.size}
          url={openEntry.url}
          subtitle={
            openEntry.taskNumber !== undefined
              ? `Entregable ${openEntry.taskNumber}`
              : undefined
          }
          onClose={() => setViewing(null)}
        />
      )}
    </main>
  );
}
