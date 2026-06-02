import { neon } from "@neondatabase/serverless";

export interface Gift {
  id: number;
  name: string;
  image_url: string;
  category: string;
  quantity: number;
  display_order: number;
  reserved_count: number;
  reservation_names: string[];
  is_fully_reserved: boolean;
}

export interface GiftInput {
  name: string;
  image_url: string;
  category: string;
  quantity: number;
}

function getDb() {
  return neon(process.env.DATABASE_URL!);
}

type Row = {
  id: number;
  name: string;
  image_url: string;
  category: string;
  quantity: number;
  display_order: number;
  reserved_count: string | number;
  reservation_names: string[] | null;
};

function rowToGift(r: Row): Gift {
  const reserved_count = Number(r.reserved_count);
  return {
    id: r.id,
    name: r.name,
    image_url: r.image_url,
    category: r.category,
    quantity: r.quantity,
    display_order: r.display_order,
    reserved_count,
    reservation_names: r.reservation_names ?? [],
    is_fully_reserved: reserved_count >= r.quantity,
  };
}

const BASE_SELECT = `
  SELECT g.id, g.name, g.image_url, g.category, g.quantity, g.display_order,
         COUNT(r.id) AS reserved_count,
         COALESCE(array_agg(r.name ORDER BY r.reserved_at) FILTER (WHERE r.id IS NOT NULL), ARRAY[]::TEXT[]) AS reservation_names
  FROM gifts g
  LEFT JOIN gift_reservations r ON r.gift_id = g.id
`;

export async function getGifts(): Promise<Gift[]> {
  const sql = getDb();
  const rows = await sql.query(
    `${BASE_SELECT}
     GROUP BY g.id
     ORDER BY g.display_order ASC, g.id ASC`
  );
  return (rows as Row[]).map(rowToGift);
}

export async function getGiftById(id: number): Promise<Gift | null> {
  const sql = getDb();
  const rows = await sql.query(
    `${BASE_SELECT}
     WHERE g.id = $1
     GROUP BY g.id`,
    [id]
  );
  const row = (rows as Row[])[0];
  return row ? rowToGift(row) : null;
}

export async function reserveGift(
  id: number,
  name: string
): Promise<boolean> {
  const sql = getDb();
  const result = await sql.query(
    `WITH availability AS (
       SELECT g.id, g.quantity, COUNT(r.id) AS reserved
       FROM gifts g LEFT JOIN gift_reservations r ON r.gift_id = g.id
       WHERE g.id = $1
       GROUP BY g.id
     )
     INSERT INTO gift_reservations (gift_id, name)
     SELECT id, $2 FROM availability WHERE reserved < quantity
     RETURNING id`,
    [id, name]
  );
  return (result as unknown as { length: number }).length > 0;
}

export async function createGift(input: GiftInput): Promise<Gift> {
  const sql = getDb();
  const rows = await sql.query(
    `INSERT INTO gifts (name, image_url, category, quantity, display_order)
     VALUES ($1, $2, $3, $4, COALESCE((SELECT MAX(display_order) + 1 FROM gifts), 1))
     RETURNING id`,
    [input.name, input.image_url, input.category, input.quantity]
  );
  const id = (rows as { id: number }[])[0].id;
  const gift = await getGiftById(id);
  if (!gift) throw new Error("Failed to fetch created gift");
  return gift;
}

export async function updateGift(
  id: number,
  input: GiftInput
): Promise<boolean> {
  const sql = getDb();
  const result = await sql.query(
    `UPDATE gifts
     SET name = $1, image_url = $2, category = $3, quantity = $4
     WHERE id = $5
     RETURNING id`,
    [input.name, input.image_url, input.category, input.quantity, id]
  );
  return (result as unknown as { length: number }).length > 0;
}

export async function deleteGift(id: number): Promise<boolean> {
  const sql = getDb();
  const result = await sql.query(
    `DELETE FROM gifts WHERE id = $1 RETURNING id`,
    [id]
  );
  return (result as unknown as { length: number }).length > 0;
}

export async function clearReservation(id: number): Promise<boolean> {
  const sql = getDb();
  const result = await sql.query(
    `DELETE FROM gift_reservations WHERE gift_id = $1 RETURNING id`,
    [id]
  );
  return (result as unknown as { length: number }).length > 0;
}

export async function updateDisplayOrder(orderedIds: number[]): Promise<void> {
  if (orderedIds.length === 0) return;
  const sql = getDb();
  const cases = orderedIds.map((_, i) => `WHEN $${i * 2 + 1}::int THEN $${i * 2 + 2}::int`).join(" ");
  const params: number[] = [];
  orderedIds.forEach((id, i) => {
    params.push(id, i);
  });
  const ids = orderedIds.map((_, i) => `$${i * 2 + 1}::int`).join(", ");
  await sql.query(
    `UPDATE gifts SET display_order = CASE id ${cases} END WHERE id IN (${ids})`,
    params
  );
}
