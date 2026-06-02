import { getGifts } from "./lib/db";
import { GiftGrid } from "./components/gift-grid";

export const dynamic = "force-dynamic";

export default async function Home() {
  const gifts = await getGifts();

  return (
    <>
      <header className="relative overflow-hidden px-6 pb-10 pt-14 text-center">
        {/* Subtle radial glow behind header */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            background:
              "radial-gradient(ellipse 70% 60% at 50% 0%, rgba(200,162,200,0.12) 0%, transparent 70%), linear-gradient(to bottom, #fff 0%, #F5F0EB 100%)",
          }}
        />

        {/* Ornament line */}
        <div className="mx-auto mb-5 flex items-center gap-3 opacity-40" style={{ width: 160 }}>
          <div className="h-px flex-1 bg-gold" />
          <svg width="8" height="8" viewBox="0 0 8 8" className="shrink-0 text-gold fill-current">
            <circle cx="4" cy="4" r="3" />
          </svg>
          <div className="h-px flex-1 bg-gold" />
        </div>

        <p className="text-[0.65rem] font-semibold tracking-[0.35em] uppercase text-lilac-dark">
          Chá de Cozinha
        </p>
        <h1 className="mt-1 font-serif text-5xl font-normal text-text max-sm:text-4xl">
          Mary & Gui
        </h1>

        {/* Ornament */}
        <div className="mx-auto mt-4 flex items-center gap-3 opacity-40" style={{ width: 160 }}>
          <div className="h-px flex-1 bg-gold" />
          <svg width="8" height="8" viewBox="0 0 8 8" className="shrink-0 text-gold fill-current">
            <path d="M4 0 L4.8 3.2 L8 4 L4.8 4.8 L4 8 L3.2 4.8 L0 4 L3.2 3.2 Z" />
          </svg>
          <div className="h-px flex-1 bg-gold" />
        </div>

        <p className="mx-auto mt-5 max-w-sm text-sm leading-relaxed text-text-light">
          Estamos montando nosso lar! Escolha um presente da lista e nos ajude a
          equipar nossa cozinha com muito carinho.
        </p>
      </header>

      <GiftGrid gifts={gifts} />
    </>
  );
}
