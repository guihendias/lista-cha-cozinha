"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="font-serif text-2xl text-text">Algo deu errado</p>
      <p className="max-w-xs text-sm text-text-light">
        {error.message ?? "Ocorreu um erro inesperado. Tente novamente."}
      </p>
      <button
        onClick={reset}
        className="rounded-xl bg-lilac px-5 py-2.5 text-sm font-medium text-white hover:bg-lilac-dark"
      >
        Tentar novamente
      </button>
    </div>
  );
}
