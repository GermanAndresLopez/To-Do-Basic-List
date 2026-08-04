import { v } from "convex/values";
import { mutation, query, QueryCtx, MutationCtx } from "./_generated/server";

const SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours

/**
 * Credentials live in Convex environment variables so they can be rotated
 * without a code change. They fall back to admin/admin for first-time setup.
 */
function expectedCredentials() {
  return {
    user: process.env.ADMIN_USER ?? "admin",
    password: process.env.ADMIN_PASSWORD ?? "admin",
  };
}

/** Throws unless the caller holds a live admin session. */
export async function requireAdmin(
  ctx: QueryCtx | MutationCtx,
  token: string | null
) {
  if (!token) throw new Error("Se requiere sesión de administrador");
  const session = await ctx.db
    .query("adminSessions")
    .withIndex("by_token", (q) => q.eq("token", token))
    .unique();
  if (!session || session.expiresAt < Date.now()) {
    throw new Error("La sesión de administrador expiró, vuelve a entrar");
  }
  return session;
}

export const login = mutation({
  args: { user: v.string(), password: v.string() },
  handler: async (ctx, { user, password }) => {
    const expected = expectedCredentials();
    if (user.trim() !== expected.user || password !== expected.password) {
      throw new Error("Usuario o contraseña incorrectos");
    }

    // Opportunistically drop sessions that are already dead.
    const stale = await ctx.db.query("adminSessions").collect();
    for (const session of stale) {
      if (session.expiresAt < Date.now()) await ctx.db.delete(session._id);
    }

    const token = crypto.randomUUID() + crypto.randomUUID();
    await ctx.db.insert("adminSessions", {
      token,
      expiresAt: Date.now() + SESSION_TTL_MS,
    });
    return { token };
  },
});

export const isValid = query({
  args: { token: v.union(v.string(), v.null()) },
  handler: async (ctx, { token }) => {
    if (!token) return false;
    const session = await ctx.db
      .query("adminSessions")
      .withIndex("by_token", (q) => q.eq("token", token))
      .unique();
    return !!session && session.expiresAt >= Date.now();
  },
});

export const logout = mutation({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const session = await ctx.db
      .query("adminSessions")
      .withIndex("by_token", (q) => q.eq("token", token))
      .unique();
    if (session) await ctx.db.delete(session._id);
  },
});
