"use client";

import { useActionState } from "react";
import Link from "next/link";
import Image from "next/image";
import { updateGiftAction } from "../../../actions";
import type { Gift } from "../../../../lib/db";

export function EditGiftForm({ gift }: { gift: Gift }) {
  const updateAction = updateGiftAction.bind(null, gift.id);
  const [state, formAction, isPending] = useActionState(updateAction, null);

  return (
    <form
      action={formAction}
      className="space-y-4 rounded-2xl border border-beige-dark bg-white p-6"
    >
      <div className="grid gap-4 sm:grid-cols-[120px_1fr]">
        <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-beige">
          <Image
            src={gift.image_url}
            alt={gift.name}
            fill
            className="object-cover"
            sizes="120px"
            unoptimized
          />
        </div>
        <div className="space-y-3">
          <label className="block">
            <span className="text-xs font-medium text-text-light">Nome</span>
            <input
              name="name"
              required
              defaultValue={gift.name}
              className="mt-1 w-full rounded-lg border border-beige-dark px-3 py-2 text-sm outline-none focus:border-lilac"
            />
          </label>
          <label className="block">
            <span className="text-xs font-medium text-text-light">
              Categoria
            </span>
            <input
              name="category"
              required
              defaultValue={gift.category}
              className="mt-1 w-full rounded-lg border border-beige-dark px-3 py-2 text-sm outline-none focus:border-lilac"
            />
          </label>
        </div>
      </div>
      <label className="block">
        <span className="text-xs font-medium text-text-light">
          URL da imagem
        </span>
        <input
          name="image_url"
          type="url"
          required
          defaultValue={gift.image_url}
          className="mt-1 w-full rounded-lg border border-beige-dark px-3 py-2 text-sm outline-none focus:border-lilac"
        />
      </label>
      {gift.reserved_count > 0 && (
        <p className="rounded-lg bg-beige/60 px-3 py-2 text-xs text-text-light">
          Reservado por <strong>{gift.reservation_names.join(", ")}</strong> ({gift.reserved_count}/{gift.quantity}). Use o botão
          &ldquo;Limpar reserva&rdquo; na lista para liberar.
        </p>
      )}
      {state && "error" in state && state.error && (
        <p className="text-xs text-red-500">{state.error}</p>
      )}
      <div className="flex justify-end gap-2 pt-2">
        <Link
          href="/admin"
          className="rounded-lg bg-beige px-4 py-2 text-sm font-medium text-text hover:bg-beige-dark"
        >
          Cancelar
        </Link>
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-lilac px-4 py-2 text-sm font-medium text-white hover:bg-lilac-dark disabled:opacity-50"
        >
          {isPending ? "Salvando..." : "Salvar"}
        </button>
      </div>
    </form>
  );
}
