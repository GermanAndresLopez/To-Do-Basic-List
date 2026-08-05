import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { mutation, query, QueryCtx } from "./_generated/server";
import { requireAdmin } from "./admin";

/** Subtasks of a deliverable plus the file currently attached to each. */
async function subtasksOf(ctx: QueryCtx, taskId: Id<"tasks">) {
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

/**
 * The whole tree for a project: each group with its deliverables, their
 * subtasks and progress. Deliverables created before groups existed are
 * reported apart so they never disappear from the page.
 */
export const listByProject = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, { projectId }) => {
    const groups = await ctx.db
      .query("groups")
      .withIndex("by_project", (q) => q.eq("projectId", projectId))
      .collect();
    groups.sort((a, b) => a.position - b.position);

    const allTasks = await ctx.db
      .query("tasks")
      .withIndex("by_project", (q) => q.eq("projectId", projectId))
      .order("asc")
      .collect();

    async function decorate(taskList: typeof allTasks) {
      return Promise.all(
        taskList.map(async (task) => {
          const subtasks = await subtasksOf(ctx, task._id);
          return {
            ...task,
            subtasks,
            totalSubtasks: subtasks.length,
            completedSubtasks: subtasks.filter((s) => s.completed).length,
            pendingReview: subtasks.filter((s) => s.status === "revision")
              .length,
          };
        })
      );
    }

    const grouped = await Promise.all(
      groups.map(async (group) => {
        const tasks = await decorate(
          allTasks.filter((task) => task.groupId === group._id)
        );
        return {
          ...group,
          tasks,
          totalSubtasks: tasks.reduce((n, t) => n + t.totalSubtasks, 0),
          completedSubtasks: tasks.reduce((n, t) => n + t.completedSubtasks, 0),
          pendingReview: tasks.reduce((n, t) => n + t.pendingReview, 0),
        };
      })
    );

    const ungrouped = await decorate(allTasks.filter((task) => !task.groupId));

    return { groups: grouped, ungrouped };
  },
});

export const create = mutation({
  args: { token: v.string(), projectId: v.id("projects"), name: v.string() },
  handler: async (ctx, { token, projectId, name }) => {
    await requireAdmin(ctx, token);

    const trimmed = name.trim();
    if (!trimmed) throw new Error("El nombre no puede estar vacío");

    const siblings = await ctx.db
      .query("groups")
      .withIndex("by_project", (q) => q.eq("projectId", projectId))
      .collect();
    const position = siblings.reduce(
      (max, group) => Math.max(max, group.position),
      0
    );

    return await ctx.db.insert("groups", {
      projectId,
      name: trimmed,
      position: position + 1,
    });
  },
});

export const rename = mutation({
  args: { token: v.string(), groupId: v.id("groups"), name: v.string() },
  handler: async (ctx, { token, groupId, name }) => {
    await requireAdmin(ctx, token);
    const trimmed = name.trim();
    if (!trimmed) throw new Error("El nombre no puede estar vacío");
    await ctx.db.patch(groupId, { name: trimmed });
  },
});

export const remove = mutation({
  args: { token: v.string(), groupId: v.id("groups") },
  handler: async (ctx, { token, groupId }) => {
    await requireAdmin(ctx, token);

    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_group", (q) => q.eq("groupId", groupId))
      .collect();

    for (const task of tasks) {
      const subtasks = await ctx.db
        .query("subtasks")
        .withIndex("by_task", (q) => q.eq("taskId", task._id))
        .collect();
      for (const subtask of subtasks) {
        const attachments = await ctx.db
          .query("attachments")
          .withIndex("by_subtask", (q) => q.eq("subtaskId", subtask._id))
          .collect();
        for (const attachment of attachments) {
          await ctx.storage.delete(attachment.storageId);
          await ctx.db.delete(attachment._id);
        }
        await ctx.db.delete(subtask._id);
      }
      await ctx.db.delete(task._id);
    }

    await ctx.db.delete(groupId);
  },
});
