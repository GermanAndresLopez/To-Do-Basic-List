"use client";

import { useMutation, useQuery } from "convex/react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { FormEvent, useState } from "react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { ProgressBar } from "@/components/ProgressBar";
import { TaskCard } from "@/components/TaskCard";
import { ChevronLeftIcon, PlusIcon } from "@/components/icons";

export default function ProjectPage() {
  const params = useParams<{ projectId: string }>();
  const projectId = params.projectId as Id<"projects">;

  const project = useQuery(api.projects.get, { projectId });
  const tasks = useQuery(api.tasks.listByProject, { projectId });
  const createTask = useMutation(api.tasks.create);
  const [taskName, setTaskName] = useState("");

  async function handleAddTask(e: FormEvent) {
    e.preventDefault();
    const trimmed = taskName.trim();
    if (!trimmed) return;
    setTaskName("");
    await createTask({ projectId, name: trimmed });
  }

  const totalSubtasks =
    tasks?.reduce((sum, t) => sum + t.totalSubtasks, 0) ?? 0;
  const completedSubtasks =
    tasks?.reduce((sum, t) => sum + t.completedSubtasks, 0) ?? 0;

  if (project === undefined || tasks === undefined) {
    return (
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
        <div className="flex flex-col gap-3">
          <div className="h-4 w-28 animate-pulse rounded-full bg-surface-hover" />
          <div className="h-8 w-2/3 animate-pulse rounded-lg bg-surface-hover" />
          <div className="mt-2 h-20 animate-pulse rounded-2xl bg-surface-hover" />
        </div>
      </main>
    );
  }

  if (project === null) {
    return (
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8 text-center sm:px-6">
        <p className="text-[15px] text-ink-secondary">
          Proyecto no encontrado.
        </p>
        <Link
          href="/projects"
          className="mt-3 inline-flex items-center gap-1 text-[14px] font-medium text-accent"
        >
          <ChevronLeftIcon className="h-3.5 w-3.5" />
          Volver
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10">
      <div>
        <Link
          href="/projects"
          className="inline-flex items-center gap-0.5 text-[14px] font-medium text-ink-secondary transition-colors duration-150 hover:text-ink"
        >
          <ChevronLeftIcon className="h-3.5 w-3.5" />
          Proyectos
        </Link>
        <h1 className="mt-2 text-[26px] font-bold leading-tight tracking-[-0.02em] text-ink sm:text-[30px]">
          {project.title}
        </h1>

        <div className="mt-4 rounded-2xl border border-border bg-surface p-4">
          <div className="flex items-baseline justify-between">
            <span className="text-[13px] font-medium text-ink-secondary">
              Avance general
            </span>
            <span className="text-[13px] tabular-nums text-ink-tertiary">
              {completedSubtasks}/{totalSubtasks}
            </span>
          </div>
          <div className="mt-2">
            <ProgressBar completed={completedSubtasks} total={totalSubtasks} />
          </div>
        </div>
      </div>

      <form onSubmit={handleAddTask} className="flex gap-2">
        <input
          value={taskName}
          onChange={(e) => setTaskName(e.target.value)}
          placeholder="Nueva tarea / entregable"
          className="flex-1 rounded-xl border border-border bg-surface px-4 py-3 text-[15px] text-ink outline-none transition-shadow duration-150 placeholder:text-ink-tertiary focus:border-accent focus:ring-4 focus:ring-accent/15"
        />
        <button
          type="submit"
          disabled={!taskName.trim()}
          className="flex shrink-0 items-center gap-1.5 rounded-xl bg-accent px-4 py-3 text-[15px] font-medium text-white transition-[transform,background-color,opacity] duration-150 ease-out hover:bg-accent-hover active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40"
        >
          <PlusIcon className="h-4 w-4" />
          <span className="hidden sm:inline">Añadir</span>
        </button>
      </form>

      <ul className="flex flex-col gap-3">
        <AnimatePresence initial={false} mode="popLayout">
          {tasks.length === 0 && (
            <motion.li
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="rounded-2xl border border-dashed border-border px-6 py-14 text-center text-[15px] text-ink-secondary"
            >
              Todavía no hay tareas. Añade la primera arriba.
            </motion.li>
          )}
          {tasks.map((task, index) => (
            <TaskCard key={task._id} task={task} colorIndex={index} />
          ))}
        </AnimatePresence>
      </ul>
    </main>
  );
}
