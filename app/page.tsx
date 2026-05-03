import { getGifts } from "./lib/db";
import { GiftGrid } from "./components/gift-grid";

export const dynamic = "force-dynamic";

export default async function Home() {
  const gifts = await getGifts();

  return (
    <>
      <header className="bg-gradient-to-b from-white to-beige px-6 pb-8 pt-12 text-center">
        <h1 className="font-serif text-5xl text-text max-sm:text-3xl">
          Chá de Cozinha
        </h1>
        <p className="mt-2 text-xs font-semibold tracking-[0.3em] uppercase text-lilac-dark">
          Guilherme & Noiva
        </p>
        <div className="mx-auto mt-4 h-px w-16 bg-gold" />
        <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-text-light">
          Estamos montando nosso lar! Escolha um presente da lista e nos ajude a
          equipar nossa cozinha com muito carinho.
        </p>
      </header>

      <GiftGrid gifts={gifts} />
    </>
  );
}
