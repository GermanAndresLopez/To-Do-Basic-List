import { v } from "convex/values";
import { Doc, Id } from "./_generated/dataModel";
import { mutation, query, QueryCtx } from "./_generated/server";
import { requireAdmin } from "./admin";

/** Subtasks plus the deliverable currently under review, if any. */
async function subtasksWithAttachments(ctx: QueryCtx, taskId: Id<"tasks">) {
  const subtasks = await ctx.db
    .query("subtasks")
    .withIndex("by_task", (q) => q.eq("taskId", taskId))
    .order("asc")
    .collect();

  return Promise.all(
    subtasks.map(async (subtask) => {
      const attachment = await ctx.db
        .query("attachments")
        .withIndex("by_subtask", (q) => q.eq("subtaskId", subtask._id))
        .filter((q) => q.eq(q.field("active"), true))
        .unique();

      return {
        ...subtask,
        attachment: attachment
          ? {
              _id: attachment._id,
              fileName: attachment.fileName,
              size: attachment.size,
              url: await ctx.storage.getUrl(attachment.storageId),
            }
          : null,
      };
    })
  );
}

export type SubtaskWithAttachment = Doc<"subtasks"> & {
  attachment: {
    _id: Id<"attachments">;
    fileName: string;
    size: number;
    url: string | null;
  } | null;
};

export const listByProject = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, { projectId }) => {
    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_project", (q) => q.eq("projectId", projectId))
      .order("asc")
      .collect();

    return Promise.all(
      tasks.map(async (task) => {
        const subtasks = await subtasksWithAttachments(ctx, task._id);
        return {
          ...task,
          subtasks,
          totalSubtasks: subtasks.length,
          completedSubtasks: subtasks.filter((s) => s.completed).length,
          pendingReview: subtasks.filter((s) => s.status === "revision").length,
        };
      })
    );
  },
});

/** Look up a single task by its per-project number, e.g. Entregable 1. */
export const getByNumber = query({
  args: { projectId: v.id("projects"), number: v.number() },
  handler: async (ctx, { projectId, number }) => {
    const task = await ctx.db
      .query("tasks")
      .withIndex("by_project_number", (q) =>
        q.eq("projectId", projectId).eq("number", number)
      )
      .unique();
    if (!task) return null;

    const subtasks = await subtasksWithAttachments(ctx, task._id);

    return {
      ...task,
      subtasks,
      totalSubtasks: subtasks.length,
      completedSubtasks: subtasks.filter((s) => s.completed).length,
      pendingReview: subtasks.filter((s) => s.status === "revision").length,
    };
  },
});

export const create = mutation({
  args: {
    token: v.string(),
    projectId: v.id("projects"),
    groupId: v.id("groups"),
    name: v.string(),
  },
  handler: async (ctx, { token, projectId, groupId, name }) => {
    await requireAdmin(ctx, token);

    const trimmed = name.trim();
    if (!trimmed) throw new Error("El nombre no puede estar vacío");

    // Numbers restart inside each group and stay stable when a deliverable is
    // deleted, so continue past the highest ever used here rather than
    // counting rows.
    const siblings = await ctx.db
      .query("tasks")
      .withIndex("by_group", (q) => q.eq("groupId", groupId))
      .collect();
    const highest = siblings.reduce(
      (max, task) => Math.max(max, task.number ?? 0),
      0
    );

    return await ctx.db.insert("tasks", {
      projectId,
      groupId,
      name: trimmed,
      number: highest + 1,
    });
  },
});

/** One-off migration: move loose deliverables into a group. */
export const assignToGroup = mutation({
  args: {
    token: v.string(),
    groupId: v.id("groups"),
    taskIds: v.array(v.id("tasks")),
  },
  handler: async (ctx, { token, groupId, taskIds }) => {
    await requireAdmin(ctx, token);
    for (const taskId of taskIds) {
      await ctx.db.patch(taskId, { groupId });
    }
    return { moved: taskIds.length };
  },
});

export const rename = mutation({
  args: { token: v.string(), taskId: v.id("tasks"), name: v.string() },
  handler: async (ctx, { token, taskId, name }) => {
    await requireAdmin(ctx, token);
    const trimmed = name.trim();
    if (!trimmed) throw new Error("El nombre no puede estar vacío");
    await ctx.db.patch(taskId, { name: trimmed });
  },
});

export const remove = mutation({
  args: { token: v.string(), taskId: v.id("tasks") },
  handler: async (ctx, { token, taskId }) => {
    await requireAdmin(ctx, token);
    const subtasks = await ctx.db
      .query("subtasks")
      .withIndex("by_task", (q) => q.eq("taskId", taskId))
      .collect();
    for (const subtask of subtasks) {
      await ctx.db.delete(subtask._id);
    }
    await ctx.db.delete(taskId);
  },
});
