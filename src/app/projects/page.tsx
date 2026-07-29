"use client";

import { useMutation, useQuery } from "convex/react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { FormEvent, useState } from "react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { ProgressBar } from "@/components/ProgressBar";
import { FolderIcon, PlusIcon, TrashIcon } from "@/components/icons";

export default function ProjectsPage() {
  const projects = useQuery(api.projects.list);
  const createProject = useMutation(api.projects.create);
  const removeProject = useMutation(api.projects.remove);
  const [title, setTitle] = useState("");
  const [pendingDeleteId, setPendingDeleteId] =
    useState<Id<"projects"> | null>(null);

  const pendingProject = projects?.find((p) => p._id === pendingDeleteId);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;
    setTitle("");
    await createProject({ title: trimmed });
  }

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-4 py-10 sm:px-6">
      <header>
        <h1 className="text-[28px] font-bold leading-tight tracking-[-0.02em] text-ink sm:text-[32px]">
          Mis proyectos
        </h1>
        <p className="mt-1 text-[15px] text-ink-secondary">
          Organiza tus entregables y sigue el avance de cada uno.
        </p>
      </header>

      <form onSubmit={handleCreate} className="flex gap-2">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Nombre del proyecto"
          className="flex-1 rounded-xl border border-border bg-surface px-4 py-3 text-[15px] text-ink outline-none transition-shadow duration-150 placeholder:text-ink-tertiary focus:border-accent focus:ring-4 focus:ring-accent/15"
        />
        <button
          type="submit"
          disabled={!title.trim()}
          className="flex shrink-0 items-center gap-1.5 rounded-xl bg-accent px-4 py-3 text-[15px] font-medium text-white transition-[transform,background-color,opacity] duration-150 ease-out hover:bg-accent-hover active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40"
        >
          <PlusIcon className="h-4 w-4" />
          <span className="hidden sm:inline">Crear</span>
        </button>
      </form>

      <ul className="flex flex-col gap-3">
        <AnimatePresence initial={false} mode="popLayout">
          {projects?.length === 0 && (
            <motion.li
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border px-6 py-14 text-center"
            >
              <FolderIcon className="h-8 w-8 text-ink-tertiary" />
              <p className="text-[15px] leading-relaxed text-ink-secondary">
                Todavía no tienes proyectos.
                <br />
                Crea el primero arriba para empezar.
              </p>
            </motion.li>
          )}
          {projects?.map((project) => (
            <motion.li
              key={project._id}
              layout
              initial={{ opacity: 0, y: 8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{
                opacity: 0,
                scale: 0.96,
                transition: { duration: 0.15, ease: [0.4, 0, 1, 1] },
              }}
              transition={{ type: "spring", duration: 0.4, bounce: 0.1 }}
            >
              <div className="group relative rounded-2xl border border-border bg-surface shadow-sm transition-[box-shadow,border-color] duration-200 hover:border-border-strong hover:shadow-md">
                <Link
                  href={`/projects/${project._id}`}
                  className="block p-4 pr-12 sm:p-5 sm:pr-14"
                >
                  <h2 className="text-[16px] font-semibold leading-tight text-ink">
                    {project.title}
                  </h2>
                  <p className="mt-1 text-[13px] text-ink-tertiary">
                    {project.taskCount} tarea
                    {project.taskCount === 1 ? "" : "s"}
                  </p>
                  <div className="mt-3">
                    <ProgressBar
                      completed={project.completedSubtasks}
                      total={project.totalSubtasks}
                    />
                  </div>
                </Link>
                <button
                  onClick={() => setPendingDeleteId(project._id)}
                  aria-label="Eliminar proyecto"
                  className="absolute right-3 top-3 rounded-full p-1.5 text-ink-tertiary transition-colors duration-150 hover:bg-danger-bg hover:text-danger active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 sm:right-4 sm:top-4"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>

      <ConfirmDialog
        open={pendingProject !== undefined}
        title="Eliminar proyecto"
        description={
          pendingProject
            ? `Se eliminará "${pendingProject.title}" junto con sus ${pendingProject.taskCount} entregable${
                pendingProject.taskCount === 1 ? "" : "s"
              } y todas sus subtareas. Esta acción no se puede deshacer.`
            : undefined
        }
        onConfirm={() => {
          if (pendingDeleteId) removeProject({ projectId: pendingDeleteId });
          setPendingDeleteId(null);
        }}
        onCancel={() => setPendingDeleteId(null)}
      />
    </main>
  );
}
