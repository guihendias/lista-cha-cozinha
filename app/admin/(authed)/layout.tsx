import Link from "next/link";
import { logoutAction } from "../actions";

export default function AuthedAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh bg-beige">
      <header className="border-b border-beige-dark bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/admin" className="font-serif text-xl text-text">
            Admin <span className="text-lilac-dark">— Chá de Cozinha</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="text-xs text-text-light hover:text-text"
            >
              Ver site
            </Link>
            <form action={logoutAction}>
              <button
                type="submit"
                className="rounded-lg bg-beige px-3 py-1.5 text-xs font-medium text-text transition-colors hover:bg-beige-dark"
              >
                Sair
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
    </div>
  );
}
