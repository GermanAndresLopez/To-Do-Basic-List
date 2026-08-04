"use client";

import { useMutation } from "convex/react";
import { AnimatePresence, motion } from "motion/react";
import { FormEvent, useEffect, useState } from "react";
import { api } from "../../convex/_generated/api";
import { Doc, Id } from "../../convex/_generated/dataModel";
import { Checkbox } from "@/components/Checkbox";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { ProgressBar } from "@/components/ProgressBar";
import {
  ChevronDownIcon,
  CheckIcon,
  PencilIcon,
  PlusIcon,
  TrashIcon,
} from "@/components/icons";
import { SubtaskDeliverable } from "@/components/SubtaskDeliverable";
import { getTaskColor } from "@/lib/taskColors";
import { getPersonColor, parseSubtaskName } from "@/lib/subtaskFormat";
import { playCelebrationSound, playCheckSound } from "@/lib/sound";
import { useJustCompleted } from "@/lib/useJustCompleted";

type SubtaskWithAttachment = Doc<"subtasks"> & {
  attachment: {
    _id: Id<"attachments">;
    fileName: string;
    size: number;
    syncStatus: string;
    syncFolder?: "Revision" | "Finales";
    url: string | null;
  } | null;
};

type TaskWithSubtasks = Doc<"tasks"> & {
  subtasks: SubtaskWithAttachment[];
  totalSubtasks: number;
  completedSubtasks: number;
};

export function TaskCard({
  task,
  colorIndex,
  isAdmin,
  adminToken,
}: {
  task: TaskWithSubtasks;
  colorIndex: number;
  isAdmin: boolean;
  adminToken: string | null;
}) {
  const toggleSubtask = useMutation(api.subtasks.toggle);
  const removeSubtask = useMutation(api.subtasks.remove);
  const renameSubtask = useMutation(api.subtasks.rename);
  const createSubtask = useMutation(api.subtasks.create);
  const renameTask = useMutation(api.tasks.rename);
  const removeTask = useMutation(api.tasks.remove);

  const [expanded, setExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [subtaskText, setSubtaskText] = useState("");
  const [subtaskResponsible, setSubtaskResponsible] = useState("");
  const [confirmDeleteTask, setConfirmDeleteTask] = useState(false);
  const [pendingDeleteSubtaskId, setPendingDeleteSubtaskId] =
    useState<Id<"subtasks"> | null>(null);

  const isComplete =
    task.totalSubtasks > 0 && task.completedSubtasks === task.totalSubtasks;
  const justCompleted = useJustCompleted(isComplete, 2400);
  const color = getTaskColor(colorIndex);
  const showContent = expanded || isEditing;

  useEffect(() => {
    if (justCompleted) playCelebrationSound();
  }, [justCompleted]);

  async function handleAddSubtask(e: FormEvent) {
    e.preventDefault();
    const trimmedText = subtaskText.trim();
    if (!trimmedText) return;
    const trimmedResponsible = subtaskResponsible.trim();
    const name = trimmedResponsible
      ? `${trimmedText} — ${trimmedResponsible}`
      : trimmedText;
    setSubtaskText("");
    setSubtaskResponsible("");
    await createSubtask({ taskId: task._id, name });
  }

  function handleToggleSubtask(subtask: Doc<"subtasks">) {
    if (!subtask.completed) playCheckSound();
    toggleSubtask({ subtaskId: subtask._id });
  }

  function handleRenameTask(value: string) {
    const trimmed = value.trim();
    if (trimmed && trimmed !== task.name) {
      renameTask({ taskId: task._id, name: trimmed });
    }
  }

  function handleRenameSubtask(subtask: Doc<"subtasks">, value: string) {
    const trimmed = value.trim();
    if (trimmed && trimmed !== subtask.name) {
      renameSubtask({ subtaskId: subtask._id, name: trimmed });
    }
  }

  const pendingSubtask = task.subtasks.find(
    (s) => s._id === pendingDeleteSubtaskId
  );

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{
        opacity: 0,
        scale: 0.96,
        transition: { duration: 0.15, ease: [0.4, 0, 1, 1] },
      }}
      transition={{ type: "spring", duration: 0.4, bounce: 0.1 }}
      className="rounded-2xl border p-4 shadow-sm sm:p-5"
      style={{ backgroundColor: color.bg, borderColor: color.border }}
    >
      <div className="flex items-start gap-2">
        {isEditing ? (
          <div className="flex flex-1 items-start gap-3">
            <span
              className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: color.dot }}
            />
            <input
              defaultValue={task.name}
              autoFocus
              onBlur={(e) => handleRenameTask(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") e.currentTarget.blur();
              }}
              className="flex-1 rounded-md border border-border-strong bg-surface px-2 py-1 text-[15px] font-semibold text-ink outline-none focus:border-accent"
            />
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
            className="flex flex-1 items-start gap-3 text-left"
          >
            <span
              className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: color.dot }}
            />
            <span className="flex-1">
              <h3 className="text-[15px] font-semibold leading-tight text-ink">
                {task.name}
              </h3>
              {task.totalSubtasks > 0 && (
                <p
                  className={`mt-0.5 text-[13px] ${
                    isComplete
                      ? "font-medium text-success"
                      : "text-ink-tertiary"
                  }`}
                >
                  {isComplete
                    ? "🎉 ¡Completado!"
                    : `${task.completedSubtasks} de ${task.totalSubtasks}`}
                </p>
              )}
            </span>
            <ChevronDownIcon
              className={`mt-1 h-4 w-4 shrink-0 text-ink-tertiary transition-transform duration-200 ${
                expanded ? "rotate-180" : ""
              }`}
            />
          </button>
        )}
        <button
          type="button"
          onClick={() => {
            if (isEditing) {
              setIsEditing(false);
            } else {
              setIsEditing(true);
              setExpanded(true);
            }
          }}
          aria-label={isEditing ? "Terminar edición" : "Editar entregable"}
          className="shrink-0 rounded-full p-1.5 text-ink-tertiary transition-colors duration-150 hover:bg-surface hover:text-ink active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
        >
          {isEditing ? (
            <CheckIcon className="h-4 w-4" />
          ) : (
            <PencilIcon className="h-4 w-4" />
          )}
        </button>
      </div>

      {isEditing && (
        <button
          type="button"
          onClick={() => setConfirmDeleteTask(true)}
          className="mt-2 text-[13px] font-medium text-danger transition-opacity duration-150 hover:opacity-80"
        >
          Eliminar entregable
        </button>
      )}

      {task.totalSubtasks > 0 && (
        <div className="mt-3">
          <ProgressBar
            completed={task.completedSubtasks}
            total={task.totalSubtasks}
          />
        </div>
      )}

      <AnimatePresence initial={false}>
        {showContent && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
            className="overflow-hidden"
          >
            <ul className="mt-2 flex flex-col">
              <AnimatePresence initial={false} mode="popLayout">
                {task.subtasks.map((subtask) => {
                  const { text, people } = parseSubtaskName(subtask.name);
                  return (
                    <motion.li
                      key={subtask._id}
                      layout
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
                      className="overflow-hidden"
                    >
                      <div className="flex items-start gap-3 py-1.5">
                        <div className="pt-0.5">
                          <Checkbox
                            checked={subtask.completed}
                            onToggle={() => handleToggleSubtask(subtask)}
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          {isEditing ? (
                            <input
                              defaultValue={subtask.name}
                              onBlur={(e) =>
                                handleRenameSubtask(subtask, e.target.value)
                              }
                              onKeyDown={(e) => {
                                if (e.key === "Enter") e.currentTarget.blur();
                              }}
                              className="w-full rounded-md border border-border-strong bg-surface px-2 py-1 text-[14px] text-ink outline-none focus:border-accent"
                            />
                          ) : (
                            <>
                              <span
                                className={`text-[14px] transition-colors duration-200 ${
                                  subtask.completed
                                    ? "text-ink-tertiary line-through"
                                    : "text-ink"
                                }`}
                              >
                                {text}
                              </span>
                              {people.length > 0 && (
                                <div className="mt-1 flex flex-wrap gap-1">
                                  {people.map((person) => {
                                    const personColor = getPersonColor(person);
                                    return (
                                      <span
                                        key={person}
                                        className="rounded-full px-2 py-0.5 text-[11px] font-semibold"
                                        style={{
                                          backgroundColor: personColor.bg,
                                          color: personColor.text,
                                        }}
                                      >
                                        {person}
                                      </span>
                                    );
                                  })}
                                </div>
                              )}
                              <SubtaskDeliverable
                                subtaskId={subtask._id}
                                status={subtask.status}
                                feedback={subtask.feedback}
                                attachment={subtask.attachment}
                                isAdmin={isAdmin}
                                adminToken={adminToken}
                              />
                            </>
                          )}
                        </div>
                        {isEditing && (
                          <button
                            type="button"
                            onClick={() =>
                              setPendingDeleteSubtaskId(subtask._id)
                            }
                            aria-label="Eliminar subtarea"
                            className="shrink-0 rounded-full p-1.5 text-ink-tertiary transition-colors duration-150 hover:bg-danger-bg hover:text-danger active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
                          >
                            <TrashIcon className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </motion.li>
                  );
                })}
              </AnimatePresence>
            </ul>

            <form
              onSubmit={handleAddSubtask}
              className="mt-1 flex flex-col gap-1.5 border-t border-border-strong/60 pt-2"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-[22px] w-[22px] shrink-0 items-center justify-center text-ink-tertiary">
                  <PlusIcon className="h-4 w-4" />
                </span>
                <input
                  value={subtaskText}
                  onChange={(e) => setSubtaskText(e.target.value)}
                  placeholder="Añadir subtarea"
                  className="flex-1 bg-transparent py-1.5 text-[14px] text-ink outline-none placeholder:text-ink-tertiary"
                />
              </div>
              <div className="pl-[34px]">
                <input
                  value={subtaskResponsible}
                  onChange={(e) => setSubtaskResponsible(e.target.value)}
                  placeholder="Responsable(s) — opcional"
                  className="w-full rounded-full bg-surface px-3 py-1 text-[12px] text-ink-secondary outline-none transition-shadow duration-150 placeholder:text-ink-tertiary focus:ring-2 focus:ring-accent/20"
                />
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <ConfirmDialog
        open={confirmDeleteTask}
        title="Eliminar entregable"
        description={`Se eliminará "${task.name}" y sus ${task.totalSubtasks} subtarea${
          task.totalSubtasks === 1 ? "" : "s"
        }. Esta acción no se puede deshacer.`}
        onConfirm={() => {
          setConfirmDeleteTask(false);
          removeTask({ taskId: task._id });
        }}
        onCancel={() => setConfirmDeleteTask(false)}
      />

      <ConfirmDialog
        open={pendingSubtask !== undefined}
        title="Eliminar subtarea"
        description={
          pendingSubtask
            ? `Se eliminará "${parseSubtaskName(pendingSubtask.name).text}". Esta acción no se puede deshacer.`
            : undefined
        }
        onConfirm={() => {
          if (pendingDeleteSubtaskId) {
            removeSubtask({ subtaskId: pendingDeleteSubtaskId });
          }
          setPendingDeleteSubtaskId(null);
        }}
        onCancel={() => setPendingDeleteSubtaskId(null)}
      />
    </motion.li>
  );
}
