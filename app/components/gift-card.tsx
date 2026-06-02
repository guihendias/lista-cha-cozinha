"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import type { Gift } from "../lib/db";

interface GiftCardProps {
  gift: Gift;
  onReserve: (gift: Gift) => void;
  index: number;
}

function getBadgeText(gift: Gift): string | null {
  if (gift.quantity <= 1) return null;
  const remaining = gift.quantity - gift.reserved_count;
  if (remaining === gift.quantity) return `× ${gift.quantity}`;
  if (remaining === 1) return "última unidade";
  return `${remaining} de ${gift.quantity}`;
}

export function GiftCard({ gift, onReserve, index }: GiftCardProps) {
  const isReserved = gift.is_fully_reserved;
  const badge = !isReserved ? getBadgeText(gift) : null;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: isReserved ? 0.45 : 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.35, delay: index * 0.04 }}
      className={`group overflow-hidden rounded-2xl border border-beige-dark bg-white transition-all duration-300 ${
        isReserved
          ? "pointer-events-none"
          : "cursor-pointer hover:border-lilac-light hover:shadow-[0_8px_32px_-4px_rgba(200,162,200,0.25)]"
      }`}
      whileHover={isReserved ? {} : { y: -3 }}
    >
      {/* Mobile: horizontal row. Desktop: vertical stack */}
      <div className="flex flex-row sm:flex-col">

        {/* Image */}
        <div className="relative h-36 w-36 shrink-0 overflow-hidden bg-beige-dark sm:h-auto sm:w-full sm:aspect-[4/3]">
          <Image
            src={gift.image_url}
            alt={gift.name}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
            sizes="(max-width: 640px) 144px, (max-width: 1024px) 33vw, 260px"
          />
          {/* Badge — overlaid on image */}
          {badge && (
            <span className="absolute right-2 top-2 rounded-full bg-white/95 px-2 py-0.5 text-[0.6rem] font-semibold tracking-wide text-lilac-dark shadow-sm">
              {badge}
            </span>
          )}
          {/* Esgotado overlay */}
          {isReserved && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/30 backdrop-blur-[1px]">
              <span className="rounded-full bg-white/90 px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-widest text-text-light">
                Esgotado
              </span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex flex-1 flex-col justify-between p-4">
          <div>
            <span className="text-[0.6rem] font-semibold tracking-[0.18em] uppercase text-lilac-dark">
              {gift.category}
            </span>
            <h3 className="mt-0.5 font-serif text-lg font-semibold leading-snug text-text sm:text-xl">
              {gift.name}
            </h3>
          </div>

          <div className="mt-3">
            {isReserved ? (
              <div className="rounded-xl bg-beige py-2.5 text-center text-sm font-medium text-text-light">
                Indisponível
              </div>
            ) : (
              <button
                onClick={() => onReserve(gift)}
                className="w-full rounded-xl bg-lilac py-2.5 text-sm font-medium text-white transition-colors hover:bg-lilac-dark active:scale-[0.98]"
              >
                Quero dar este presente
              </button>
            )}
          </div>
        </div>

      </div>
    </motion.div>
  );
}
