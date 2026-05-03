"use client";

import { useState, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { reserveGiftAction } from "../actions";
import type { Gift } from "../lib/db";

interface ReserveModalProps {
  gift: Gift | null;
  onClose: () => void;
}

export function ReserveModal({ gift, onClose }: ReserveModalProps) {
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError("Por favor, informe seu nome");
      return;
    }
    if (!gift) return;

    startTransition(async () => {
      const result = await reserveGiftAction(gift.id, name);
      if (result.success) {
        setName("");
        setError("");
        onClose();
      } else {
        setError(result.error || "Erro ao reservar");
      }
    });
  }

  function handleClose() {
    setName("");
    setError("");
    onClose();
  }

  return (
    <AnimatePresence>
      {gift && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleClose}
        >
          <motion.div
            className="w-full max-w-sm rounded-2xl bg-white p-8 text-center shadow-xl"
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="mb-2 font-serif text-2xl font-semibold text-text">
              {gift.name}
            </h2>
            <p className="mb-6 text-sm text-text-light">
              Que legal! Informe seu nome para reservar este presente.
            </p>
            <form onSubmit={handleSubmit}>
              <input
                type="text"
                placeholder="Seu nome completo"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setError("");
                }}
                className="mb-1 w-full rounded-xl border border-beige-dark px-4 py-3 text-sm outline-none transition-colors focus:border-lilac"
                autoFocus
                disabled={isPending}
              />
              {error && (
                <p className="mb-3 text-xs text-red-500">{error}</p>
              )}
              {!error && <div className="mb-4" />}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleClose}
                  className="flex-1 rounded-xl bg-beige py-3 text-sm font-medium text-text transition-colors hover:bg-beige-dark"
                  disabled={isPending}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-xl bg-lilac py-3 text-sm font-medium text-white transition-colors hover:bg-lilac-dark disabled:opacity-50"
                  disabled={isPending}
                >
                  {isPending ? "Reservando..." : "Confirmar"}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
