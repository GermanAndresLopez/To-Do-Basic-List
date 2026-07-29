import Link from "next/link";
import { ClipboardCheckIcon } from "@/components/icons";

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-canvas/75 backdrop-blur-xl backdrop-saturate-150">
      <div className="mx-auto flex h-14 max-w-2xl items-center px-4 sm:px-6">
        <Link href="/projects" className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-[9px] bg-accent text-white">
            <ClipboardCheckIcon className="h-4 w-4" />
          </span>
          <span className="text-[15px] font-semibold tracking-tight text-ink">
            Entregables
          </span>
        </Link>
      </div>
    </header>
  );
}
