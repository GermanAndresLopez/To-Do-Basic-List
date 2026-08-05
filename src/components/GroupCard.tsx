"use client";

import { useMutation } from "convex/react";
import { AnimatePresence, motion } from "motion/react";
import { FormEvent, useState } from "react";
import { api } from "../../convex/_generated/api";
import { Doc, Id } from "../../convex/_generated/dataModel";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { ProgressBar } from "@/components/ProgressBar";
import { PendingCountBadge, ReviewDot } from "@/components/StatusBadge";
import { TaskCard } from "@/components/TaskCard";
import {
  CheckIcon,
  ChevronDownIcon,
  PencilIcon,
  PlusIcon,
} from "@/components/icons";

type SubtaskWithAttachment = Doc<"subtasks"> & {
  attachment: {
    _id: Id<"attachments">;
    fileName: string;
    size: number;
    url: string | null;
  } | null;
};

export type TaskInGroup = Doc<"tasks"> & {
  subtasks: SubtaskWithAttachment[];
  totalSubtasks: number;
  completedSubtasks: number;
  pendingReview: number;
};

export type GroupWithTasks = Doc<"groups"> & {
  tasks: TaskInGroup[];
  totalSubtasks: number;
  completedSubtasks: number;
  pendingReview: number;
};

export function GroupCard({
  group,
  projectId,
  isAdmin,
  adminToken,
}: {
  group: GroupWithTasks;
  projectId: Id<"projects">;
  isAdmin: boolean;
  adminToken: string | null;
}) {
  const createTask = useMutation(api.tasks.create);
  const renameGroup = useMutation(api.groups.rename);
  const removeGroup = useMutation(api.groups.remove);

  const [expanded, setExpanded] = useState(true);
  const [editingRequested, setIsEditing] = useState(false);
  const [taskName, setTaskName] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  const isEditing = isAdmin && editingRequested;

  async function handleAddTask(e: FormEvent) {
    e.preventDefault();
    const trimmed = taskName.trim();
    if (!trimmed || !adminToken) return;
    setTaskName("");
    await createTask({
      token: adminToken,
      projectId,
      groupId: group._id,
      name: trimmed,
    });
  }

  function handleRename(value: string) {
    const trimmed = value.trim();
    if (adminToken && trimmed && trimmed !== group.name) {
      renameGroup({ token: adminToken, groupId: group._id, name: trimmed });
    }
  }

  return (
    <section className="rounded-2xl border border-border bg-surface/60 p-3 shadow-sm sm:p-4">
      <div className="flex items-start gap-2">
        {isEditing ? (
          <input
            defaultValue={group.name}
            autoFocus
            onBlur={(e) => handleRename(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.currentTarget.blur();
            }}
            className="flex-1 rounded-md border border-border-strong bg-surface px-2 py-1 text-[17px] font-bold text-ink outline-none focus:border-accent"
          />
        ) : (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
            className="flex flex-1 items-center gap-2 text-left"
          >
            <ReviewDot pending={group.pendingReview > 0} size={9} />
            <h2 className="text-[17px] font-bold tracking-[-0.01em] text-ink">
              {group.name}
            </h2>
            <span className="text-[13px] tabular-nums text-ink-tertiary">
              {group.tasks.length} entregable
              {group.tasks.length === 1 ? "" : "s"}
            </span>
            {isAdmin && <PendingCountBadge count={group.pendingReview} />}
            <ChevronDownIcon
              className={`ml-auto h-4 w-4 shrink-0 text-ink-tertiary transition-transform duration-200 ${
                expanded ? "rotate-180" : ""
              }`}
            />
          </button>
        )}

        {isAdmin && (
          <button
            type="button"
            onClick={() => {
              if (isEditing) setIsEditing(false);
              else {
                setIsEditing(true);
                setExpanded(true);
              }
            }}
            aria-label={isEditing ? "Terminar edición" : "Editar desembolso"}
            className="shrink-0 rounded-full p-1.5 text-ink-tertiary transition-colors duration-150 hover:bg-surface hover:text-ink active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
          >
            {isEditing ? (
              <CheckIcon className="h-4 w-4" />
            ) : (
              <PencilIcon className="h-4 w-4" />
            )}
          </button>
        )}
      </div>

      {isEditing && (
        <button
          type="button"
          onClick={() => setConfirmDelete(true)}
          className="mt-2 text-[13px] font-medium text-danger transition-opacity duration-150 hover:opacity-80"
        >
          Eliminar desembolso
        </button>
      )}

      {group.totalSubtasks > 0 && (
        <div className="mt-2.5">
          <ProgressBar
            completed={group.completedSubtasks}
            total={group.totalSubtasks}
          />
        </div>
      )}

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
            className="overflow-hidden"
          >
            <ul className="mt-3 flex flex-col gap-2.5">
              <AnimatePresence initial={false} mode="popLayout">
                {group.tasks.length === 0 && (
                  <motion.li
                    key="empty"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-[14px] text-ink-secondary"
                  >
                    Todavía no hay entregables en este desembolso.
                  </motion.li>
                )}
                {group.tasks.map((task, index) => (
                  <TaskCard
                    key={task._id}
                    task={task}
                    colorIndex={index}
                    isAdmin={isAdmin}
                    adminToken={adminToken}
                  />
                ))}
              </AnimatePresence>
            </ul>

            {isAdmin && (
              <form onSubmit={handleAddTask} className="mt-2.5 flex gap-2">
                <input
                  value={taskName}
                  onChange={(e) => setTaskName(e.target.value)}
                  placeholder="Nuevo entregable"
                  className="flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-[14px] text-ink outline-none transition-shadow duration-150 placeholder:text-ink-tertiary focus:border-accent focus:ring-2 focus:ring-accent/15"
                />
                <button
                  type="submit"
                  disabled={!taskName.trim()}
                  className="flex shrink-0 items-center gap-1.5 rounded-lg bg-accent px-3 py-2 text-[14px] font-medium text-white transition-[transform,background-color,opacity] duration-150 ease-out hover:bg-accent-hover active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40"
                >
                  <PlusIcon className="h-4 w-4" />
                  <span className="hidden sm:inline">Añadir</span>
                </button>
              </form>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <ConfirmDialog
        open={confirmDelete}
        title="Eliminar desembolso"
        description={`Se eliminará "${group.name}" con sus ${group.tasks.length} entregable${
          group.tasks.length === 1 ? "" : "s"
        }, todas sus subtareas y los archivos entregados. Esta acción no se puede deshacer.`}
        onConfirm={() => {
          setConfirmDelete(false);
          if (adminToken) removeGroup({ token: adminToken, groupId: group._id });
        }}
        onCancel={() => setConfirmDelete(false)}
      />
    </section>
  );
}
