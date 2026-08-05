"use client";

import { useMutation } from "convex/react";
import Link from "next/link";
import { api } from "../../convex/_generated/api";
import {
  ClipboardCheckIcon,
  HistoryIcon,
  ShieldIcon,
} from "@/components/icons";
import { useAdminSession } from "@/lib/useAdminSession";

export function Header() {
  const { isAdmin, token, signOut } = useAdminSession();
  const logout = useMutation(api.admin.logout);

  async function handleSignOut() {
    if (token) await logout({ token });
    signOut();
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-canvas/75 backdrop-blur-xl backdrop-saturate-150">
      <div className="mx-auto flex h-14 max-w-2xl items-center justify-between gap-3 px-4 sm:px-6">
        <Link href="/projects" className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-[9px] bg-accent text-white">
            <ClipboardCheckIcon className="h-4 w-4" />
          </span>
          <span className="text-[15px] font-semibold tracking-tight text-ink">
            Entregables
          </span>
        </Link>

        {isAdmin ? (
          <div className="flex items-center gap-1">
            <Link
              href="/admin/revision"
              className="inline-flex items-center gap-1.5 rounded-full bg-accent/10 px-2.5 py-1 text-[12px] font-semibold text-accent transition-colors duration-150 hover:bg-accent/15 active:scale-[0.97]"
            >
              <HistoryIcon className="h-3.5 w-3.5" />
              Revisión
            </Link>
            <span
              title="Sesión de administrador activa"
              className="hidden items-center gap-1 rounded-full px-2 py-1 text-[12px] font-medium text-ink-tertiary sm:inline-flex"
            >
              <ShieldIcon className="h-3.5 w-3.5" />
              Admin
            </span>
            <button
              onClick={handleSignOut}
              className="rounded-full px-2.5 py-1 text-[12px] font-medium text-ink-secondary transition-colors duration-150 hover:bg-surface-hover active:scale-[0.97]"
            >
              Salir
            </button>
          </div>
        ) : (
          <Link
            href="/admin"
            className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[12px] font-medium text-ink-secondary transition-colors duration-150 hover:bg-surface-hover"
          >
            <ShieldIcon className="h-3.5 w-3.5" />
            Admin
          </Link>
        )}
      </div>
    </header>
  );
}
