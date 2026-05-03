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
  `;
  return result.length > 0 || (result as unknown as { rowCount: number }).rowCount > 0;
}
