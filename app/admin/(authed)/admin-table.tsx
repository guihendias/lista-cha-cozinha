"use client";

import { useState, useActionState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  createGiftAction,
  deleteGiftAction,
  clearReservationAction,
} from "../actions";
import type { Gift } from "../../lib/db";

interface AdminTableProps {
  gifts: Gift[];
}

export function AdminTable({ gifts }: AdminTableProps) {
  const [showForm, setShowForm] = useState(false);
  const [createState, createAction, isCreating] = useActionState(
    createGiftAction,
    null
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (createState && "success" in createState && createState.success) {
      setShowForm(false);
      formRef.current?.reset();
    }
  }, [createState]);

  const totalGifts = gifts.length;
  const reservedCount = gifts.filter((g) => g.is_fully_reserved).length;
  const availableCount = totalGifts - reservedCount;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-serif text-3xl text-text">Presentes</h2>
          <p className="mt-1 text-sm text-text-light">
            {totalGifts} no total · {availableCount} disponíveis ·{" "}
            {reservedCount} reservados
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="rounded-xl bg-lilac px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-lilac-dark"
        >
          {showForm ? "Cancelar" : "+ Adicionar presente"}
        </button>
      </div>

      {showForm && (
        <form
          ref={formRef}
          action={createAction}
          className="space-y-3 rounded-2xl border border-beige-dark bg-white p-6"
        >
          <h3 className="font-serif text-lg text-text">Novo presente</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="text-xs font-medium text-text-light">Nome</span>
              <input
                name="name"
                required
                placeholder="Ex: Jogo de Panelas"
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
                placeholder="Ex: Panelas"
                className="mt-1 w-full rounded-lg border border-beige-dark px-3 py-2 text-sm outline-none focus:border-lilac"
              />
            </label>
          </div>
          <label className="block">
            <span className="text-xs font-medium text-text-light">
              URL da imagem
            </span>
            <input
              name="image_url"
              type="url"
              required
              placeholder="https://..."
              className="mt-1 w-full rounded-lg border border-beige-dark px-3 py-2 text-sm outline-none focus:border-lilac"
            />
          </label>
          {createState && "error" in createState && createState.error && (
            <p className="text-xs text-red-500">{createState.error}</p>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded-lg bg-beige px-4 py-2 text-sm font-medium text-text hover:bg-beige-dark"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isCreating}
              className="rounded-lg bg-lilac px-4 py-2 text-sm font-medium text-white hover:bg-lilac-dark disabled:opacity-50"
            >
              {isCreating ? "Adicionando..." : "Adicionar"}
            </button>
          </div>
        </form>
      )}

      <div className="overflow-hidden rounded-2xl border border-beige-dark bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-beige-dark bg-beige/50 text-xs font-semibold uppercase tracking-wider text-text-light">
            <tr>
              <th className="px-4 py-3">Imagem</th>
              <th className="px-4 py-3">Nome</th>
              <th className="px-4 py-3">Categoria</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-beige-dark">
            {gifts.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-12 text-center text-sm text-text-light"
                >
                  Nenhum presente cadastrado.
                </td>
              </tr>
            )}
            {gifts.map((gift) => (
              <GiftRow key={gift.id} gift={gift} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function GiftRow({ gift }: { gift: Gift }) {
  const hasReservations = gift.reserved_count > 0;

  return (
    <tr className="hover:bg-beige/30">
      <td className="px-4 py-3">
        <div className="relative h-12 w-12 overflow-hidden rounded-lg bg-beige-dark">
          <Image
            src={gift.image_url}
            alt={gift.name}
            fill
            className="object-cover"
            sizes="48px"
            unoptimized
          />
        </div>
      </td>
      <td className="px-4 py-3 font-medium text-text">{gift.name}</td>
      <td className="px-4 py-3 text-text-light">{gift.category}</td>
      <td className="px-4 py-3">
        {gift.is_fully_reserved ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-beige px-2.5 py-1 text-xs text-text-light">
            <span className="h-1.5 w-1.5 rounded-full bg-text-light" />
            {gift.reservation_names.join(", ")} ({gift.reserved_count}/{gift.quantity})
          </span>
        ) : hasReservations ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-yellow-50 px-2.5 py-1 text-xs text-yellow-700">
            <span className="h-1.5 w-1.5 rounded-full bg-yellow-500" />
            Parcial ({gift.reserved_count}/{gift.quantity})
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-lilac-light/40 px-2.5 py-1 text-xs text-lilac-dark">
            <span className="h-1.5 w-1.5 rounded-full bg-lilac" />
            Disponível
          </span>
        )}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center justify-end gap-1">
          <Link
            href={`/admin/edit/${gift.id}`}
            className="rounded-lg p-2 text-text-light hover:bg-beige hover:text-text"
            title="Editar"
          >
            ✏️
          </Link>
          {hasReservations && (
            <form action={clearReservationAction}>
              <input type="hidden" name="id" value={gift.id} />
              <button
                type="submit"
                className="rounded-lg p-2 text-text-light hover:bg-beige hover:text-text"
                title="Limpar reserva"
              >
                ↺
              </button>
            </form>
          )}
          <form
            action={deleteGiftAction}
            onSubmit={(e) => {
              if (!confirm(`Deletar "${gift.name}"?`)) {
                e.preventDefault();
              }
            }}
          >
            <input type="hidden" name="id" value={gift.id} />
            <button
              type="submit"
              className="rounded-lg p-2 text-text-light hover:bg-red-50 hover:text-red-600"
              title="Deletar"
            >
              🗑
            </button>
          </form>
        </div>
      </td>
    </tr>
  );
}
