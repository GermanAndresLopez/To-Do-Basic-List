import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAdmin } from "./admin";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const projects = await ctx.db.query("projects").order("desc").collect();
    return Promise.all(
      projects.map(async (project) => {
        const tasks = await ctx.db
          .query("tasks")
          .withIndex("by_project", (q) => q.eq("projectId", project._id))
          .collect();

        let totalSubtasks = 0;
        let completedSubtasks = 0;
        for (const task of tasks) {
          const subtasks = await ctx.db
            .query("subtasks")
            .withIndex("by_task", (q) => q.eq("taskId", task._id))
            .collect();
          totalSubtasks += subtasks.length;
          completedSubtasks += subtasks.filter((s) => s.completed).length;
        }

        return {
          ...project,
          taskCount: tasks.length,
          totalSubtasks,
          completedSubtasks,
        };
      })
    );
  },
});

export const get = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, { projectId }) => {
    return await ctx.db.get(projectId);
  },
});

export const create = mutation({
  args: { token: v.string(), title: v.string() },
  handler: async (ctx, { token, title }) => {
    await requireAdmin(ctx, token);
    const trimmed = title.trim();
    if (!trimmed) throw new Error("El título no puede estar vacío");
    return await ctx.db.insert("projects", { title: trimmed });
  },
});

export const remove = mutation({
  args: { token: v.string(), projectId: v.id("projects") },
  handler: async (ctx, { token, projectId }) => {
    await requireAdmin(ctx, token);

    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_project", (q) => q.eq("projectId", projectId))
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

    const groups = await ctx.db
      .query("groups")
      .withIndex("by_project", (q) => q.eq("projectId", projectId))
      .collect();
    for (const group of groups) {
      await ctx.db.delete(group._id);
    }

    await ctx.db.delete(projectId);
  },
});
