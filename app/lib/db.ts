import { neon } from "@neondatabase/serverless";

export interface Gift {
  id: number;
  name: string;
  image_url: string;
  category: string;
  reserved_by: string | null;
  reserved_at: string | null;
}

function getDb() {
  return neon(process.env.DATABASE_URL!);
}

export async function getGifts(): Promise<Gift[]> {
  const sql = getDb();
  const rows = await sql`
    SELECT id, name, image_url, category, reserved_by, reserved_at
    FROM gifts
    ORDER BY
      CASE WHEN reserved_by IS NULL THEN 0 ELSE 1 END,
      id
  `;
  return rows as Gift[];
}

export async function reserveGift(
  id: number,
  name: string
): Promise<boolean> {
  const sql = getDb();
  const result = await sql`
    UPDATE gifts
    SET reserved_by = ${name}, reserved_at = NOW()
    WHERE id = ${id} AND reserved_by IS NULL
    RETURNING id
  `;
  return result.length > 0;
}

export async function getGiftById(id: number): Promise<Gift | null> {
  const sql = getDb();
  const rows = await sql`
    SELECT id, name, image_url, category, reserved_by, reserved_at
    FROM gifts
    WHERE id = ${id}
  `;
  return (rows[0] as Gift) ?? null;
}

export interface GiftInput {
  name: string;
  image_url: string;
  category: string;
}

export async function createGift(input: GiftInput): Promise<Gift> {
  const sql = getDb();
  const rows = await sql`
    INSERT INTO gifts (name, image_url, category)
    VALUES (${input.name}, ${input.image_url}, ${input.category})
    RETURNING id, name, image_url, category, reserved_by, reserved_at
  `;
  return rows[0] as Gift;
}

export async function updateGift(
  id: number,
  input: GiftInput
): Promise<boolean> {
  const sql = getDb();
  const result = await sql`
    UPDATE gifts
    SET name = ${input.name}, image_url = ${input.image_url}, category = ${input.category}
    WHERE id = ${id}
    RETURNING id
  `;
  return result.length > 0;
}

export async function deleteGift(id: number): Promise<boolean> {
  const sql = getDb();
  const result = await sql`
    DELETE FROM gifts
    WHERE id = ${id}
    RETURNING id
  `;
  return result.length > 0;
}

export async function clearReservation(id: number): Promise<boolean> {
  const sql = getDb();
  const result = await sql`
    UPDATE gifts
    SET reserved_by = NULL, reserved_at = NULL
    WHERE id = ${id}
    RETURNING id
  `;
  return result.length > 0;
}
