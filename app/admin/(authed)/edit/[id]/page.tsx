import { notFound } from "next/navigation";
import Link from "next/link";
import { getGiftById } from "../../../../lib/db";
import { EditGiftForm } from "./edit-form";

export const dynamic = "force-dynamic";

export default async function EditGiftPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const giftId = Number(id);
  if (!giftId) notFound();

  const gift = await getGiftById(giftId);
  if (!gift) notFound();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link
          href="/admin"
          className="text-xs text-text-light hover:text-text"
        >
          ← Voltar
        </Link>
        <h2 className="mt-2 font-serif text-3xl text-text">Editar presente</h2>
      </div>
      <EditGiftForm gift={gift} />
    </div>
  );
}
