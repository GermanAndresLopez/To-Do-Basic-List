"use client";

import { useMutation, useQuery } from "convex/react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { FormEvent, useState } from "react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { GroupCard } from "@/components/GroupCard";
import { ProgressBar } from "@/components/ProgressBar";
import { TaskCard } from "@/components/TaskCard";
import { ChevronLeftIcon, PlusIcon } from "@/components/icons";
import { useAdminSession } from "@/lib/useAdminSession";

export default function ProjectPage() {
  const params = useParams<{ projectId: string }>();
  const projectId = params.projectId as Id<"projects">;

  const project = useQuery(api.projects.get, { projectId });
  const tree = useQuery(api.groups.listByProject, { projectId });
  const createGroup = useMutation(api.groups.create);
  const { isAdmin, token: adminToken } = useAdminSession();
  const [groupName, setGroupName] = useState("");

  async function handleAddGroup(e: FormEvent) {
    e.preventDefault();
    const trimmed = groupName.trim();
    if (!trimmed || !adminToken) return;
    setGroupName("");
    await createGroup({ token: adminToken, projectId, name: trimmed });
  }

  const allTasks = tree
    ? [...tree.groups.flatMap((g) => g.tasks), ...tree.ungrouped]
    : [];
  const totalSubtasks = allTasks.reduce((n, t) => n + t.totalSubtasks, 0);
  const completedSubtasks = allTasks.reduce(
    (n, t) => n + t.completedSubtasks,
    0
  );

  if (project === undefined || tree === undefined) {
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
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-5 px-4 py-8 sm:px-6 sm:py-10">
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

      <div className="flex flex-col gap-3">
        <AnimatePresence initial={false} mode="popLayout">
          {tree.groups.length === 0 && tree.ungrouped.length === 0 && (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="rounded-2xl border border-dashed border-border px-6 py-14 text-center text-[15px] text-ink-secondary"
            >
              Todavía no hay desembolsos.
              {isAdmin && " Crea el primero abajo."}
            </motion.div>
          )}

          {tree.groups.map((group) => (
            <motion.div
              key={group._id}
              layout
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97 }}
              transition={{ type: "spring", duration: 0.4, bounce: 0.1 }}
            >
              <GroupCard
                group={group}
                projectId={projectId}
                isAdmin={isAdmin}
                adminToken={adminToken}
              />
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Deliverables from before disbursements existed, if any survive. */}
        {tree.ungrouped.length > 0 && (
          <section className="rounded-2xl border border-dashed border-border p-3 sm:p-4">
            <h2 className="text-[15px] font-semibold text-ink-secondary">
              Sin desembolso asignado
            </h2>
            <ul className="mt-3 flex flex-col gap-2.5">
              {tree.ungrouped.map((task, index) => (
                <TaskCard
                  key={task._id}
                  task={task}
                  colorIndex={index}
                  isAdmin={isAdmin}
                  adminToken={adminToken}
                />
              ))}
            </ul>
          </section>
        )}
      </div>

      {isAdmin && (
        <form onSubmit={handleAddGroup} className="flex gap-2">
          <input
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            placeholder="Nuevo desembolso"
            className="flex-1 rounded-xl border border-border bg-surface px-4 py-3 text-[15px] text-ink outline-none transition-shadow duration-150 placeholder:text-ink-tertiary focus:border-accent focus:ring-4 focus:ring-accent/15"
          />
          <button
            type="submit"
            disabled={!groupName.trim()}
            className="flex shrink-0 items-center gap-1.5 rounded-xl bg-accent px-4 py-3 text-[15px] font-medium text-white transition-[transform,background-color,opacity] duration-150 ease-out hover:bg-accent-hover active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40"
          >
            <PlusIcon className="h-4 w-4" />
            <span className="hidden sm:inline">Crear</span>
          </button>
        </form>
      )}
    </main>
  );
}
