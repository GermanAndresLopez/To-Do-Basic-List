import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAdmin } from "./admin";

const ALLOWED_EXTENSIONS = [
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
  ".pdf",
] as const;

function assertAllowedFile(fileName: string) {
  const lower = fileName.toLowerCase();
  if (!ALLOWED_EXTENSIONS.some((ext) => lower.endsWith(ext))) {
    throw new Error(
      "Solo se aceptan archivos Word (.doc, .docx), Excel (.xls, .xlsx) o PDF"
    );
  }
}

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => await ctx.storage.generateUploadUrl(),
});

/** Records an uploaded file against a subtask and sends it for review. */
export const attach = mutation({
  args: {
    subtaskId: v.id("subtasks"),
    storageId: v.id("_storage"),
    fileName: v.string(),
    contentType: v.string(),
    size: v.number(),
  },
  handler: async (ctx, args) => {
    assertAllowedFile(args.fileName);

    const subtask = await ctx.db.get(args.subtaskId);
    if (!subtask) throw new Error("Subtarea no encontrada");

    // Previous uploads stay as history but stop being the current one.
    const previous = await ctx.db
      .query("attachments")
      .withIndex("by_subtask", (q) => q.eq("subtaskId", args.subtaskId))
      .collect();
    for (const attachment of previous) {
      if (attachment.active) {
        await ctx.db.patch(attachment._id, { active: false });
      }
    }

    const attachmentId = await ctx.db.insert("attachments", {
      subtaskId: args.subtaskId,
      storageId: args.storageId,
      fileName: args.fileName,
      contentType: args.contentType,
      size: args.size,
      active: true,
    });

    await ctx.db.patch(args.subtaskId, {
      status: "revision",
      completed: false,
      feedback: undefined,
    });

    return attachmentId;
  },
});

export const fileUrl = query({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, { storageId }) => await ctx.storage.getUrl(storageId),
});

export const approve = mutation({
  args: { token: v.string(), subtaskId: v.id("subtasks") },
  handler: async (ctx, { token, subtaskId }) => {
    await requireAdmin(ctx, token);

    const subtask = await ctx.db.get(subtaskId);
    if (!subtask) throw new Error("Subtarea no encontrada");

    await ctx.db.patch(subtaskId, {
      status: "aprobado",
      completed: true,
      feedback: undefined,
    });
  },
});

export const sendBack = mutation({
  args: {
    token: v.string(),
    subtaskId: v.id("subtasks"),
    feedback: v.string(),
  },
  handler: async (ctx, { token, subtaskId, feedback }) => {
    await requireAdmin(ctx, token);

    const trimmed = feedback.trim();
    if (!trimmed) {
      throw new Error("Escribe las correcciones antes de devolver");
    }

    const subtask = await ctx.db.get(subtaskId);
    if (!subtask) throw new Error("Subtarea no encontrada");

    await ctx.db.patch(subtaskId, {
      status: "devuelto",
      completed: false,
      feedback: trimmed,
    });
  },
});

/** Clears a subtask's review state and discards its uploaded files. */
export const reset = mutation({
  args: { token: v.string(), subtaskId: v.id("subtasks") },
  handler: async (ctx, { token, subtaskId }) => {
    await requireAdmin(ctx, token);

    const attachments = await ctx.db
      .query("attachments")
      .withIndex("by_subtask", (q) => q.eq("subtaskId", subtaskId))
      .collect();
    for (const attachment of attachments) {
      await ctx.storage.delete(attachment.storageId);
      await ctx.db.delete(attachment._id);
    }

    await ctx.db.patch(subtaskId, {
      status: undefined,
      feedback: undefined,
      completed: false,
    });
  },
});
