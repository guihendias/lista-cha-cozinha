"use client";

import { useActionState } from "react";
import { loginAction } from "../actions";

export function LoginForm() {
  const [state, formAction, isPending] = useActionState(loginAction, null);

  return (
    <form action={formAction} className="space-y-3">
      <input
        type="password"
        name="password"
        placeholder="Senha"
        autoFocus
        required
        className="w-full rounded-xl border border-beige-dark px-4 py-3 text-sm outline-none transition-colors focus:border-lilac"
        disabled={isPending}
      />
      {state?.error && (
        <p className="text-xs text-red-500">{state.error}</p>
      )}
      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-xl bg-lilac py-3 text-sm font-medium text-white transition-colors hover:bg-lilac-dark disabled:opacity-50"
      >
        {isPending ? "Entrando..." : "Entrar"}
      </button>
    </form>
  );
}
