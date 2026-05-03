"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  isAuthenticated,
  setSessionCookie,
  clearSessionCookie,
  verifyPassword,
} from "../lib/auth";
import {
  createGift,
  updateGift,
  deleteGift,
  clearReservation,
} from "../lib/db";

async function requireAuth() {
  if (!(await isAuthenticated())) {
    throw new Error("Não autorizado");
  }
}

function revalidateAll() {
  revalidatePath("/");
  revalidatePath("/admin");
}

export async function loginAction(_prev: unknown, formData: FormData) {
  const password = String(formData.get("password") ?? "");
  const ok = await verifyPassword(password);
  if (!ok) {
    return { error: "Senha incorreta" };
  }
  await setSessionCookie();
  redirect("/admin");
}

export async function logoutAction() {
  await clearSessionCookie();
  redirect("/admin/login");
}

export async function createGiftAction(_prev: unknown, formData: FormData) {
  await requireAuth();
  const name = String(formData.get("name") ?? "").trim();
  const image_url = String(formData.get("image_url") ?? "").trim();
  const category = String(formData.get("category") ?? "").trim();

  if (!name || !image_url || !category) {
    return { error: "Todos os campos são obrigatórios" };
  }

  await createGift({ name, image_url, category });
  revalidateAll();
  return { success: true };
}

export async function updateGiftAction(
  id: number,
  _prev: unknown,
  formData: FormData
) {
  await requireAuth();
  const name = String(formData.get("name") ?? "").trim();
  const image_url = String(formData.get("image_url") ?? "").trim();
  const category = String(formData.get("category") ?? "").trim();

  if (!name || !image_url || !category) {
    return { error: "Todos os campos são obrigatórios" };
  }

  await updateGift(id, { name, image_url, category });
  revalidateAll();
  redirect("/admin");
}

export async function deleteGiftAction(formData: FormData) {
  await requireAuth();
  const id = Number(formData.get("id"));
  if (!id) return;
  await deleteGift(id);
  revalidateAll();
}

export async function clearReservationAction(formData: FormData) {
  await requireAuth();
  const id = Number(formData.get("id"));
  if (!id) return;
  await clearReservation(id);
  revalidateAll();
}
