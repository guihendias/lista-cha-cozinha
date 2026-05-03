"use client";

import { useState } from "react";
import { LayoutGroup, AnimatePresence } from "framer-motion";
import type { Gift } from "../lib/db";
import { GiftCard } from "./gift-card";
import { CategoryFilter } from "./category-filter";
import { ReserveModal } from "./reserve-modal";

interface GiftGridProps {
  gifts: Gift[];
}

export function GiftGrid({ gifts }: GiftGridProps) {
  const [activeCategory, setActiveCategory] = useState("Todos");
  const [selectedGift, setSelectedGift] = useState<Gift | null>(null);

  const categories = [
    "Todos",
    ...Array.from(new Set(gifts.map((g) => g.category))),
  ];

  const available = gifts.filter((g) => g.reserved_by === null);
  const reserved = gifts.filter((g) => g.reserved_by !== null);

  const filteredAvailable =
    activeCategory === "Todos"
      ? available
      : available.filter((g) => g.category === activeCategory);

  const filteredReserved =
    activeCategory === "Todos"
      ? reserved
      : reserved.filter((g) => g.category === activeCategory);

  return (
    <>
      <CategoryFilter
        categories={categories}
        active={activeCategory}
        onChange={setActiveCategory}
      />

      <LayoutGroup>
        <div className="mx-auto grid max-w-5xl grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-6 px-6 max-sm:grid-cols-2 max-sm:gap-4 max-sm:px-4">
          <AnimatePresence mode="popLayout">
            {filteredAvailable.map((gift, i) => (
              <GiftCard
                key={gift.id}
                gift={gift}
                onReserve={setSelectedGift}
                index={i}
              />
            ))}
          </AnimatePresence>
        </div>

        {filteredReserved.length > 0 && (
          <>
            <p className="mx-auto mt-8 max-w-5xl px-6 text-[0.7rem] font-semibold tracking-[0.2em] uppercase text-text-light">
              Já reservados
            </p>
            <div className="mx-auto mt-4 grid max-w-5xl grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-6 px-6 pb-12 max-sm:grid-cols-2 max-sm:gap-4 max-sm:px-4">
              <AnimatePresence mode="popLayout">
                {filteredReserved.map((gift, i) => (
                  <GiftCard
                    key={gift.id}
                    gift={gift}
                    onReserve={() => {}}
                    index={i}
                  />
                ))}
              </AnimatePresence>
            </div>
          </>
        )}
      </LayoutGroup>

      <ReserveModal
        gift={selectedGift}
        onClose={() => setSelectedGift(null)}
      />
    </>
  );
}
