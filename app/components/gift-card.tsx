"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import type { Gift } from "../lib/db";

interface GiftCardProps {
  gift: Gift;
  onReserve: (gift: Gift) => void;
  index: number;
}

export function GiftCard({ gift, onReserve, index }: GiftCardProps) {
  const isReserved = gift.reserved_by !== null;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: isReserved ? 0.5 : 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
      className={`group overflow-hidden rounded-2xl bg-white shadow-sm transition-shadow ${
        isReserved
          ? "pointer-events-none"
          : "cursor-pointer hover:shadow-lg"
      }`}
      whileHover={isReserved ? {} : { y: -4 }}
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-beige-dark">
        <Image
          src={gift.image_url}
          alt={gift.name}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 260px"
        />
      </div>
      <div className="p-4">
        <span className="text-[0.65rem] font-semibold tracking-[0.15em] uppercase text-lilac-dark">
          {gift.category}
        </span>
        <h3 className="mt-1 font-serif text-xl font-semibold text-text">
          {gift.name}
        </h3>
        {isReserved ? (
          <>
            <p className="mt-2 flex items-center gap-1 text-xs text-text-light">
              <span>✓</span> Reservado por {gift.reserved_by}
            </p>
            <div className="mt-3 w-full rounded-xl bg-beige-dark py-3 text-center text-sm font-medium text-text-light">
              Indisponível
            </div>
          </>
        ) : (
          <button
            onClick={() => onReserve(gift)}
            className="mt-3 w-full rounded-xl bg-lilac py-3 text-sm font-medium text-white transition-colors hover:bg-lilac-dark"
          >
            Quero dar este presente
          </button>
        )}
      </div>
    </motion.div>
  );
}
