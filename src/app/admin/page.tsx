"use client";

import { useMutation } from "convex/react";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { api } from "../../../convex/_generated/api";
import { useAdminSession } from "@/lib/useAdminSession";

export default function AdminLoginPage() {
  const login = useMutation(api.admin.login);
  const { isAdmin, signIn, signOut } = useAdminSession();
  const router = useRouter();

  const [user, setUser] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const { token } = await login({ user, password });
      signIn(token);
      router.push("/projects");
    } catch {
      setError("Usuario o contraseña incorrectos");
    } finally {
      setBusy(false);
    }
  }

  if (isAdmin) {
    return (
      <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-4 px-4 py-16">
        <div className="rounded-2xl border border-border bg-surface p-6 text-center">
          <p className="text-[15px] text-ink">
            Ya tienes sesión de administrador.
          </p>
          <div className="mt-4 flex justify-center gap-2">
            <button
              onClick={() => router.push("/projects")}
              className="rounded-lg bg-accent px-4 py-2.5 text-[14px] font-medium text-white transition-transform duration-150 ease-out hover:bg-accent-hover active:scale-[0.97]"
            >
              Ir a los proyectos
            </button>
            <button
              onClick={signOut}
              className="rounded-lg px-4 py-2.5 text-[14px] font-medium text-ink-secondary transition-colors duration-150 hover:bg-surface-hover active:scale-[0.97]"
            >
              Cerrar sesión
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-4 px-4 py-16">
      <div className="rounded-2xl border border-border bg-surface p-6">
        <h1 className="text-[20px] font-bold tracking-[-0.02em] text-ink">
          Acceso de administrador
        </h1>
        <p className="mt-1 text-[14px] text-ink-secondary">
          Necesario para revisar, aprobar o devolver entregables.
        </p>

        <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-3">
          <input
            value={user}
            onChange={(e) => setUser(e.target.value)}
            placeholder="Usuario"
            autoComplete="username"
            className="rounded-xl border border-border bg-surface px-4 py-3 text-[15px] text-ink outline-none transition-shadow duration-150 placeholder:text-ink-tertiary focus:border-accent focus:ring-4 focus:ring-accent/15"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Contraseña"
            autoComplete="current-password"
            className="rounded-xl border border-border bg-surface px-4 py-3 text-[15px] text-ink outline-none transition-shadow duration-150 placeholder:text-ink-tertiary focus:border-accent focus:ring-4 focus:ring-accent/15"
          />

          {error && (
            <p className="text-[13px] font-medium text-danger">{error}</p>
          )}

          <button
            type="submit"
            disabled={busy || !user.trim() || !password}
            className="rounded-xl bg-accent px-4 py-3 text-[15px] font-medium text-white transition-[transform,background-color,opacity] duration-150 ease-out hover:bg-accent-hover active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40"
          >
            {busy ? "Entrando..." : "Entrar"}
          </button>
        </form>
      </div>
    </main>
  );
}
