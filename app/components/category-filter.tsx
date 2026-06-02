"use client";

import { motion } from "framer-motion";

interface CategoryFilterProps {
  categories: string[];
  active: string;
  onChange: (category: string) => void;
}

export function CategoryFilter({
  categories,
  active,
  onChange,
}: CategoryFilterProps) {
  return (
    <div className="relative">
      {/* Fade hint on right edge for mobile */}
      <div
        aria-hidden
        className="pointer-events-none absolute right-0 top-0 z-10 h-full w-12 bg-gradient-to-l from-beige to-transparent sm:hidden"
      />
      <div className="flex gap-2 overflow-x-auto px-6 py-4 sm:flex-wrap sm:justify-center [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {categories.map((cat) => (
          <motion.button
            key={cat}
            onClick={() => onChange(cat)}
            className={`relative shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              active === cat
                ? "text-white"
                : "border border-beige-dark bg-white/80 text-text-light hover:border-lilac-light hover:text-text"
            }`}
            whileTap={{ scale: 0.94 }}
          >
            {active === cat && (
              <motion.span
                layoutId="activePill"
                className="absolute inset-0 rounded-full bg-lilac"
                transition={{ type: "spring", bounce: 0.2, duration: 0.35 }}
              />
            )}
            <span className="relative z-10">{cat}</span>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
