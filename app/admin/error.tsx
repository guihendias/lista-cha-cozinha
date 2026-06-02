"use client";

import Link from "next/link";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="font-serif text-2xl text-text">Erro no painel</p>
      <p className="max-w-xs text-sm text-text-light">
        {error.message ?? "Ocorreu um erro inesperado."}
      </p>
      <div className="flex gap-3">
        <button
          onClick={reset}
          className="rounded-xl bg-lilac px-4 py-2 text-sm font-medium text-white hover:bg-lilac-dark"
        >
          Tentar novamente
        </button>
        <Link
          href="/admin"
          className="rounded-xl bg-beige px-4 py-2 text-sm font-medium text-text hover:bg-beige-dark"
        >
          Voltar ao painel
        </Link>
      </div>
    </div>
  );
}
