import { v } from "convex/values";
import { internal } from "./_generated/api";
import { Doc } from "./_generated/dataModel";
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
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
      syncStatus: "pendiente",
    });

    await ctx.db.patch(args.subtaskId, {
      status: "revision",
      completed: false,
      feedback: undefined,
    });

    await ctx.scheduler.runAfter(0, internal.sharepoint.upload, {
      attachmentId,
      folder: "Revision",
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

    const attachment = await ctx.db
      .query("attachments")
      .withIndex("by_subtask", (q) => q.eq("subtaskId", subtaskId))
      .filter((q) => q.eq(q.field("active"), true))
      .unique();

    if (attachment) {
      await ctx.scheduler.runAfter(0, internal.sharepoint.upload, {
        attachmentId: attachment._id,
        folder: "Finales",
      });
    }
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

// --- helpers used by the SharePoint action -------------------------------

export const getAttachment = internalQuery({
  args: { attachmentId: v.id("attachments") },
  handler: async (ctx, { attachmentId }): Promise<Doc<"attachments"> | null> =>
    await ctx.db.get(attachmentId),
});

export const recordSync = internalMutation({
  args: {
    attachmentId: v.id("attachments"),
    syncStatus: v.union(
      v.literal("pendiente"),
      v.literal("enviado"),
      v.literal("error"),
      v.literal("sin_configurar")
    ),
    syncFolder: v.optional(
      v.union(v.literal("Revision"), v.literal("Finales"))
    ),
    syncError: v.optional(v.string()),
  },
  handler: async (ctx, { attachmentId, syncStatus, syncFolder, syncError }) => {
    await ctx.db.patch(attachmentId, { syncStatus, syncFolder, syncError });
  },
});
