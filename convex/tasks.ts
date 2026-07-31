import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

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
        const subtasks = await ctx.db
          .query("subtasks")
          .withIndex("by_task", (q) => q.eq("taskId", task._id))
          .order("asc")
          .collect();
        return {
          ...task,
          subtasks,
          totalSubtasks: subtasks.length,
          completedSubtasks: subtasks.filter((s) => s.completed).length,
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

    const subtasks = await ctx.db
      .query("subtasks")
      .withIndex("by_task", (q) => q.eq("taskId", task._id))
      .order("asc")
      .collect();

    return {
      ...task,
      subtasks,
      totalSubtasks: subtasks.length,
      completedSubtasks: subtasks.filter((s) => s.completed).length,
    };
  },
});

export const create = mutation({
  args: { projectId: v.id("projects"), name: v.string() },
  handler: async (ctx, { projectId, name }) => {
    const trimmed = name.trim();
    if (!trimmed) throw new Error("El nombre no puede estar vacío");

    // Numbers stay stable when a task is deleted, so continue past the
    // highest one ever used in this project rather than counting rows.
    const siblings = await ctx.db
      .query("tasks")
      .withIndex("by_project", (q) => q.eq("projectId", projectId))
      .collect();
    const highest = siblings.reduce(
      (max, task) => Math.max(max, task.number ?? 0),
      0
    );

    return await ctx.db.insert("tasks", {
      projectId,
      name: trimmed,
      number: highest + 1,
    });
  },
});

/** One-off migration: give every pre-existing task a number. */
export const backfillNumbers = mutation({
  args: {},
  handler: async (ctx) => {
    const projects = await ctx.db.query("projects").collect();
    let updated = 0;

    for (const project of projects) {
      const tasks = await ctx.db
        .query("tasks")
        .withIndex("by_project", (q) => q.eq("projectId", project._id))
        .order("asc")
        .collect();

      let next = tasks.reduce(
        (max, task) => Math.max(max, task.number ?? 0),
        0
      );

      for (const task of tasks) {
        if (task.number === undefined) {
          next += 1;
          await ctx.db.patch(task._id, { number: next });
          updated += 1;
        }
      }
    }

    return { updated };
  },
});

export const rename = mutation({
  args: { taskId: v.id("tasks"), name: v.string() },
  handler: async (ctx, { taskId, name }) => {
    const trimmed = name.trim();
    if (!trimmed) throw new Error("El nombre no puede estar vacío");
    await ctx.db.patch(taskId, { name: trimmed });
  },
});

export const remove = mutation({
  args: { taskId: v.id("tasks") },
  handler: async (ctx, { taskId }) => {
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
