"use client";

import {
  useState,
  useActionState,
  useEffect,
  useRef,
  useTransition,
} from "react";
import Link from "next/link";
import Image from "next/image";
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  createGiftAction,
  deleteGiftAction,
  clearReservationAction,
  reorderGiftsAction,
} from "../actions";
import type { Gift } from "../../lib/db";

interface AdminTableProps {
  gifts: Gift[];
}

export function AdminTable({ gifts: initialGifts }: AdminTableProps) {
  const [showForm, setShowForm] = useState(false);
  const [createState, createAction, isCreating] = useActionState(
    createGiftAction,
    null
  );
  const formRef = useRef<HTMLFormElement>(null);

  const [gifts, setGifts] = useState<Gift[]>(initialGifts);
  const [isReordering, startReorderTransition] = useTransition();

  // Sync server data into local state when not mid-drag (valid prop→state sync)
  useEffect(() => {
    if (!isReordering) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setGifts(initialGifts);
    }
  }, [initialGifts, isReordering]);

  // Close form and reset on successful server action result
  useEffect(() => {
    if (createState && "success" in createState && createState.success) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setShowForm(false);
      formRef.current?.reset();
    }
  }, [createState]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = gifts.findIndex((g) => g.id === active.id);
    const newIndex = gifts.findIndex((g) => g.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const previousGifts = gifts;
    const newGifts = [...gifts];
    const [moved] = newGifts.splice(oldIndex, 1);
    newGifts.splice(newIndex, 0, moved);
    setGifts(newGifts);

    startReorderTransition(async () => {
      try {
        await reorderGiftsAction(newGifts.map((g) => g.id));
      } catch {
        setGifts(previousGifts);
      }
    });
  }

  const totalGifts = gifts.length;
  const esgotadoCount = gifts.filter((g) => g.is_fully_reserved).length;
  const availableCount = totalGifts - esgotadoCount;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-serif text-3xl text-text">Presentes</h2>
          <p className="mt-1 text-sm text-text-light">
            {totalGifts} no total · {availableCount} dispon&iacute;veis ·{" "}
            {esgotadoCount} esgotados
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
          <div className="grid gap-3 sm:grid-cols-[1fr_120px]">
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
            <label className="block">
              <span className="text-xs font-medium text-text-light">
                Quantidade
              </span>
              <input
                name="quantity"
                type="number"
                min={1}
                defaultValue={1}
                required
                className="mt-1 w-full rounded-lg border border-beige-dark px-3 py-2 text-sm outline-none focus:border-lilac"
              />
            </label>
          </div>
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
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <table className="w-full text-left text-sm">
            <thead className="border-b border-beige-dark bg-beige/50 text-xs font-semibold uppercase tracking-wider text-text-light">
              <tr>
                <th className="w-10 px-2 py-3" aria-label="Reordenar" />
                <th className="px-4 py-3">Imagem</th>
                <th className="px-4 py-3">Nome</th>
                <th className="px-4 py-3">Categoria</th>
                <th className="px-4 py-3">Qtd</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <SortableContext
              items={gifts.map((g) => g.id)}
              strategy={verticalListSortingStrategy}
            >
              <tbody className="divide-y divide-beige-dark">
                {gifts.length === 0 && (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-12 text-center text-sm text-text-light"
                    >
                      Nenhum presente cadastrado.
                    </td>
                  </tr>
                )}
                {gifts.map((gift) => (
                  <SortableGiftRow key={gift.id} gift={gift} />
                ))}
              </tbody>
            </SortableContext>
          </table>
        </DndContext>
      </div>
    </div>
  );
}

function SortableGiftRow({ gift }: { gift: Gift }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: gift.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
    backgroundColor: isDragging ? "rgba(245, 240, 235, 0.8)" : undefined,
  };

  return (
    <tr ref={setNodeRef} style={style} className="hover:bg-beige/30">
      <td className="px-2 py-3 align-middle">
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="cursor-grab touch-none rounded p-1.5 text-text-light hover:bg-beige hover:text-text active:cursor-grabbing"
          aria-label={`Reordenar ${gift.name}`}
        >
          <DragHandleIcon />
        </button>
      </td>
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
      <td className="px-4 py-3 text-text">{gift.quantity}</td>
      <td className="px-4 py-3">
        <StatusCell gift={gift} />
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
          {gift.reserved_count > 0 && (
            <form
              action={clearReservationAction}
              onSubmit={(e) => {
                const names = gift.reservation_names.join(", ");
                const msg =
                  gift.reserved_count === 1
                    ? `Limpar reserva de "${names}"?`
                    : `Limpar ${gift.reserved_count} reservas (${names})?`;
                if (!confirm(msg)) e.preventDefault();
              }}
            >
              <input type="hidden" name="id" value={gift.id} />
              <button
                type="submit"
                className="rounded-lg p-2 text-text-light hover:bg-beige hover:text-text"
                title="Limpar reservas"
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

function StatusCell({ gift }: { gift: Gift }) {
  const names = gift.reservation_names.join(", ");

  if (gift.reserved_count === 0) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-lilac-light/40 px-2.5 py-1 text-xs text-lilac-dark">
        <span className="h-1.5 w-1.5 rounded-full bg-lilac" />
        Dispon&iacute;vel
      </span>
    );
  }

  if (gift.is_fully_reserved) {
    return (
      <div className="space-y-1">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-beige px-2.5 py-1 text-xs text-text-light">
          <span className="h-1.5 w-1.5 rounded-full bg-text-light" />
          Esgotado
        </span>
        <p
          className="max-w-[180px] truncate text-[0.7rem] text-text-light"
          title={names}
        >
          {names}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-1 text-xs text-amber-700">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
        {gift.reserved_count}/{gift.quantity} reservados
      </span>
      <p
        className="max-w-[180px] truncate text-[0.7rem] text-text-light"
        title={names}
      >
        {names}
      </p>
    </div>
  );
}

function DragHandleIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden
    >
      <circle cx="7" cy="4" r="1.5" />
      <circle cx="13" cy="4" r="1.5" />
      <circle cx="7" cy="10" r="1.5" />
      <circle cx="13" cy="10" r="1.5" />
      <circle cx="7" cy="16" r="1.5" />
      <circle cx="13" cy="16" r="1.5" />
    </svg>
  );
}
