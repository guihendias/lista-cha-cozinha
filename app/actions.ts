"use server";

import { revalidatePath } from "next/cache";
import { reserveGift } from "./lib/db";

export async function reserveGiftAction(id: number, name: string) {
  const trimmed = name.trim();
  if (!trimmed) {
    return { success: false, error: "Nome é obrigatório" };
  }

  const success = await reserveGift(id, trimmed);
  if (!success) {
    return { success: false, error: "Este presente está esgotado" };
  }

  revalidatePath("/");
  return { success: true };
}
