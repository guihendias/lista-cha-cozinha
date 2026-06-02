# Quantidade Múltipla e Reordenação Drag-and-Drop Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir que presentes tenham múltiplas unidades (cada reserva = 1 unidade) e que a Mary reordene a lista no `/admin` via drag-and-drop.

**Architecture:** Schema ganha `quantity` e `display_order` em `gifts`, e uma nova tabela `gift_reservations` substitui as colunas `reserved_by`/`reserved_at`. Reserva atômica via CTE PostgreSQL. DnD no admin com `@dnd-kit`, persiste `display_order` via server action. Home reflete a ordem.

**Tech Stack:** Next.js 15 (App Router), Neon Postgres, Tailwind CSS v4, Framer Motion (já em uso), `@dnd-kit/core` + `@dnd-kit/sortable` (novo).

**Pré-requisitos:**
- Node 22 ativo: `source ~/.nvm/nvm.sh && nvm use 22`
- `.env.local` com `DATABASE_URL` (já configurado)
- Spec: `docs/superpowers/specs/2026-06-02-quantidade-e-reordenacao-design.md`

**Convenção de verificação:** Este projeto não tem framework de testes. Cada task termina com verificação manual via preview server e/ou inspeção do banco. Commits frequentes após cada task funcionar.

---

## Task 1: Migração do banco (schema + backfill)

**Files:**
- Create: `scripts/migrate-quantity-reorder.sql`
- Create: `scripts/run-migration.js` (utilitário one-shot)

- [ ] **Step 1: Criar o SQL de migração**

Arquivo `scripts/migrate-quantity-reorder.sql`:

```sql
-- Add new columns to gifts
ALTER TABLE gifts ADD COLUMN IF NOT EXISTS quantity INTEGER NOT NULL DEFAULT 1;
ALTER TABLE gifts ADD COLUMN IF NOT EXISTS display_order INTEGER NOT NULL DEFAULT 0;

-- Create gift_reservations table
CREATE TABLE IF NOT EXISTS gift_reservations (
  id SERIAL PRIMARY KEY,
  gift_id INTEGER NOT NULL REFERENCES gifts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  reserved_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS gift_reservations_gift_id_idx ON gift_reservations(gift_id);

-- Backfill reservations from old columns
INSERT INTO gift_reservations (gift_id, name, reserved_at)
SELECT id, reserved_by, COALESCE(reserved_at, NOW())
FROM gifts
WHERE reserved_by IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM gift_reservations r WHERE r.gift_id = gifts.id
  );

-- Backfill display_order with current id (chronological order)
UPDATE gifts SET display_order = id WHERE display_order = 0;
```

- [ ] **Step 2: Criar runner Node para executar a migração**

Arquivo `scripts/run-migration.js`:

```js
const { neon } = require('@neondatabase/serverless');
const fs = require('fs');
const path = require('path');

const file = process.argv[2];
if (!file) {
  console.error('Usage: node scripts/run-migration.js <sql-file>');
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);
const content = fs.readFileSync(path.resolve(file), 'utf8');
const statements = content.split(';').map(s => s.trim()).filter(s => s.length > 0);

(async () => {
  for (const stmt of statements) {
    await sql.query(stmt);
    console.log('✓', stmt.substring(0, 80).replace(/\s+/g, ' ') + '...');
  }
  console.log('Migration complete.');
})().catch(e => {
  console.error('Migration failed:', e);
  process.exit(1);
});
```

- [ ] **Step 3: Executar a migração**

```bash
source ~/.nvm/nvm.sh && nvm use 22
export DATABASE_URL=$(grep '^DATABASE_URL=' .env.local | head -1 | sed 's/^DATABASE_URL="//;s/"$//')
node scripts/run-migration.js scripts/migrate-quantity-reorder.sql
```

Expected output: cada statement logado com `✓`, terminando com `Migration complete.`

- [ ] **Step 4: Verificar o schema e backfill**

```bash
node -e "
const { neon } = require('@neondatabase/serverless');
const sql = neon(process.env.DATABASE_URL);
(async () => {
  const cols = await sql\`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'gifts' ORDER BY ordinal_position\`;
  console.log('gifts columns:', cols);
  const reservations = await sql\`SELECT gift_id, name, reserved_at FROM gift_reservations ORDER BY gift_id\`;
  console.log('reservations:', reservations);
  const order = await sql\`SELECT id, name, display_order FROM gifts ORDER BY display_order LIMIT 5\`;
  console.log('first 5 by display_order:', order);
})();
"
```

Expected: `gifts` tem colunas `quantity` e `display_order`. `gift_reservations` tem uma linha para cada gift que estava reservado antes. `display_order` está preenchido com valores não-zero.

- [ ] **Step 5: Commit**

```bash
git add scripts/migrate-quantity-reorder.sql scripts/run-migration.js
git commit -m "Add migration for quantity and display_order"
```

---

## Task 2: Atualizar tipo `Gift` e queries em `db.ts`

**Files:**
- Modify: `app/lib/db.ts` (rewrite todo o arquivo, mantendo helper `getDb`)

- [ ] **Step 1: Reescrever `app/lib/db.ts`**

Substituir o conteúdo inteiro do arquivo por:

```ts
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
  // Build CASE WHEN for batch update in a single statement.
  // Example for ids [3, 1, 2]:
  //   UPDATE gifts SET display_order = CASE id
  //     WHEN 3 THEN 0 WHEN 1 THEN 1 WHEN 2 THEN 2 END
  //   WHERE id IN (3, 1, 2)
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
```

- [ ] **Step 2: Verificar TypeScript compila**

```bash
source ~/.nvm/nvm.sh && nvm use 22
npx tsc --noEmit
```

Expected: nenhuma saída (sucesso).

- [ ] **Step 3: Verificar queries funcionam contra o banco**

```bash
export DATABASE_URL=$(grep '^DATABASE_URL=' .env.local | head -1 | sed 's/^DATABASE_URL="//;s/"$//')
node -e "
require('ts-node/register/transpile-only');
const { getGifts } = require('./app/lib/db.ts');
getGifts().then(gs => {
  console.log('Total:', gs.length);
  console.log('First gift:', JSON.stringify(gs[0], null, 2));
  console.log('Fully reserved count:', gs.filter(g => g.is_fully_reserved).length);
});
" 2>&1 || echo "ts-node not installed, skipping inline verification — will verify in Task 4 via UI"
```

Aceitável se falhar por falta de ts-node — a verificação real acontece via UI nas tasks seguintes.

- [ ] **Step 4: Commit**

```bash
git add app/lib/db.ts
git commit -m "Rewrite db.ts for quantity and reservation table"
```

**Notas:**
- `reservation_names` é um `array_agg` ordenado por `reserved_at` — primeiros nomes aparecem primeiro.
- `is_fully_reserved` é calculado em JS para evitar coluna derivada no SQL.
- `createGift` atribui `display_order = MAX + 1` para que novos itens vão para o final da lista.
- A interface antiga (Task 3 / Task 4 chamarão) usa os mesmos nomes de função — não há quebra de API.

---

## Task 3: Atualizar server actions

**Files:**
- Modify: `app/actions.ts`
- Modify: `app/admin/actions.ts`

- [ ] **Step 1: Atualizar `app/actions.ts` para mensagem de "esgotado"**

Substituir o conteúdo de `app/actions.ts`:

```ts
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
  revalidatePath("/admin");
  return { success: true };
}
```

- [ ] **Step 2: Atualizar `app/admin/actions.ts` para aceitar `quantity` e adicionar `reorderGiftsAction`**

Substituir o conteúdo de `app/admin/actions.ts`:

```ts
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
  updateDisplayOrder,
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

function parseQuantity(formData: FormData): number {
  const raw = Number(formData.get("quantity") ?? 1);
  if (!Number.isFinite(raw) || raw < 1) return 1;
  return Math.floor(raw);
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
  const quantity = parseQuantity(formData);

  if (!name || !image_url || !category) {
    return { error: "Todos os campos são obrigatórios" };
  }

  await createGift({ name, image_url, category, quantity });
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
  const quantity = parseQuantity(formData);

  if (!name || !image_url || !category) {
    return { error: "Todos os campos são obrigatórios" };
  }

  await updateGift(id, { name, image_url, category, quantity });
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

export async function reorderGiftsAction(orderedIds: number[]) {
  await requireAuth();
  await updateDisplayOrder(orderedIds);
  revalidateAll();
}
```

- [ ] **Step 3: Verificar TypeScript compila**

```bash
npx tsc --noEmit
```

Expected: nenhuma saída.

- [ ] **Step 4: Commit**

```bash
git add app/actions.ts app/admin/actions.ts
git commit -m "Update server actions for quantity and reorder"
```

---

## Task 4: Atualizar `gift-card.tsx` com badge de quantidade e estado "esgotado"

**Files:**
- Modify: `app/components/gift-card.tsx` (reescrita completa)

- [ ] **Step 1: Reescrever `app/components/gift-card.tsx`**

```tsx
"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import type { Gift } from "../lib/db";

interface GiftCardProps {
  gift: Gift;
  onReserve: (gift: Gift) => void;
  index: number;
}

function getBadgeText(gift: Gift): string | null {
  if (gift.quantity <= 1) return null;
  const remaining = gift.quantity - gift.reserved_count;
  if (remaining === gift.quantity) return `× ${gift.quantity}`;
  if (remaining === 1) return "última unidade";
  return `${remaining} de ${gift.quantity} disponíveis`;
}

export function GiftCard({ gift, onReserve, index }: GiftCardProps) {
  const isReserved = gift.is_fully_reserved;
  const badge = !isReserved ? getBadgeText(gift) : null;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: isReserved ? 0.5 : 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
      className={`group overflow-hidden rounded-2xl bg-white shadow-sm transition-shadow ${
        isReserved
          ? "pointer-events-none"
          : "cursor-pointer hover:shadow-lg"
      }`}
      whileHover={isReserved ? {} : { y: -4 }}
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-beige-dark">
        <Image
          src={gift.image_url}
          alt={gift.name}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 260px"
        />
        {badge && (
          <span className="absolute right-2 top-2 rounded-full bg-white/95 px-2.5 py-1 text-[0.65rem] font-semibold tracking-wide text-lilac-dark shadow-sm">
            {badge}
          </span>
        )}
      </div>
      <div className="p-4">
        <span className="text-[0.65rem] font-semibold tracking-[0.15em] uppercase text-lilac-dark">
          {gift.category}
        </span>
        <h3 className="mt-1 font-serif text-xl font-semibold text-text">
          {gift.name}
        </h3>
        {isReserved ? (
          <>
            <p className="mt-2 text-xs text-text-light">Esgotado</p>
            <div className="mt-3 w-full rounded-xl bg-beige-dark py-3 text-center text-sm font-medium text-text-light">
              Indisponível
            </div>
          </>
        ) : (
          <button
            onClick={() => onReserve(gift)}
            className="mt-3 w-full rounded-xl bg-lilac py-3 text-sm font-medium text-white transition-colors hover:bg-lilac-dark"
          >
            Quero dar este presente
          </button>
        )}
      </div>
    </motion.div>
  );
}
```

- [ ] **Step 2: Verificar TypeScript compila**

```bash
npx tsc --noEmit
```

Expected: nenhuma saída.

- [ ] **Step 3: Commit**

```bash
git add app/components/gift-card.tsx
git commit -m "Show quantity badge and esgotado state in gift card"
```

---

## Task 5: Atualizar `gift-grid.tsx` para usar `is_fully_reserved`

**Files:**
- Modify: `app/components/gift-grid.tsx`

- [ ] **Step 1: Substituir uso de `reserved_by` por `is_fully_reserved`**

Substituir as linhas que filtram `available` e `reserved`. Procurar:

```tsx
  const available = gifts.filter((g) => g.reserved_by === null);
  const reserved = gifts.filter((g) => g.reserved_by !== null);
```

Substituir por:

```tsx
  const available = gifts.filter((g) => !g.is_fully_reserved);
  const reserved = gifts.filter((g) => g.is_fully_reserved);
```

- [ ] **Step 2: Verificar TypeScript compila**

```bash
npx tsc --noEmit
```

Expected: nenhuma saída.

- [ ] **Step 3: Verificar visualmente que a home funciona**

Iniciar o dev server e checar:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && npm run dev
```

Abrir `http://localhost:3000`. Confirmar:
- Lista carrega
- Cards reservados aparecem esmaecidos no final com "Esgotado"
- Filtros de categoria funcionam

Parar o servidor (`Ctrl+C`) ao terminar.

- [ ] **Step 4: Commit**

```bash
git add app/components/gift-grid.tsx
git commit -m "Use is_fully_reserved for grouping in grid"
```

---

## Task 6: Atualizar modal de reserva para mensagem de "esgotado"

**Files:**
- Modify: `app/components/reserve-modal.tsx`

- [ ] **Step 1: Verificar mensagem de erro no modal**

O `ReserveModal` já trata `result.error` da action. Como `reserveGiftAction` agora retorna `"Este presente está esgotado"`, o modal mostra essa mensagem automaticamente.

Apenas garantir que ao retornar esgotado, o modal não fecha — comportamento atual já preserva isso (só fecha em `success: true`).

Nenhuma mudança necessária neste arquivo. Pular para o próximo task.

- [ ] **Step 2: (sem commit — apenas confirmação)**

---

## Task 7: Instalar `@dnd-kit` e ajustar admin forms para incluir `quantity`

**Files:**
- Modify: `app/admin/(authed)/admin-table.tsx` (apenas form de criar — DnD vem depois)
- Modify: `app/admin/(authed)/edit/[id]/edit-form.tsx`

- [ ] **Step 1: Instalar dependências**

```bash
source ~/.nvm/nvm.sh && nvm use 22
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

Expected: pacotes adicionados sem erros.

- [ ] **Step 2: Adicionar campo `Quantidade` ao form de criar no `admin-table.tsx`**

Localizar o bloco do form de criar (entre `{showForm && (...)}`). Procurar este trecho:

```tsx
          <label className="block">
            <span className="text-xs font-medium text-text-light">
              URL da imagem
            </span>
            <input
              name="image_url"
              type="url"
              required
              placeholder="https://..."
              className="mt-1 w-full rounded-lg border border-beige-dark px-3 py-2 text-sm outline-none focus:border-lilac"
            />
          </label>
```

Substituir por:

```tsx
          <div className="grid gap-3 sm:grid-cols-[1fr_120px]">
            <label className="block">
              <span className="text-xs font-medium text-text-light">
                URL da imagem
              </span>
              <input
                name="image_url"
                type="url"
                required
                placeholder="https://..."
                className="mt-1 w-full rounded-lg border border-beige-dark px-3 py-2 text-sm outline-none focus:border-lilac"
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-text-light">
                Quantidade
              </span>
              <input
                name="quantity"
                type="number"
                min={1}
                defaultValue={1}
                required
                className="mt-1 w-full rounded-lg border border-beige-dark px-3 py-2 text-sm outline-none focus:border-lilac"
              />
            </label>
          </div>
```

- [ ] **Step 3: Adicionar campo `Quantidade` ao `edit-form.tsx`**

Localizar o bloco no `app/admin/(authed)/edit/[id]/edit-form.tsx` que contém o input de `image_url`. Procurar:

```tsx
      <label className="block">
        <span className="text-xs font-medium text-text-light">
          URL da imagem
        </span>
        <input
          name="image_url"
          type="url"
          required
          defaultValue={gift.image_url}
          className="mt-1 w-full rounded-lg border border-beige-dark px-3 py-2 text-sm outline-none focus:border-lilac"
        />
      </label>
```

Substituir por:

```tsx
      <div className="grid gap-3 sm:grid-cols-[1fr_120px]">
        <label className="block">
          <span className="text-xs font-medium text-text-light">
            URL da imagem
          </span>
          <input
            name="image_url"
            type="url"
            required
            defaultValue={gift.image_url}
            className="mt-1 w-full rounded-lg border border-beige-dark px-3 py-2 text-sm outline-none focus:border-lilac"
          />
        </label>
        <label className="block">
          <span className="text-xs font-medium text-text-light">
            Quantidade
          </span>
          <input
            name="quantity"
            type="number"
            min={1}
            defaultValue={gift.quantity}
            required
            className="mt-1 w-full rounded-lg border border-beige-dark px-3 py-2 text-sm outline-none focus:border-lilac"
          />
        </label>
      </div>
```

- [ ] **Step 4: Verificar TypeScript compila**

```bash
npx tsc --noEmit
```

Expected: nenhuma saída.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json app/admin/\(authed\)/admin-table.tsx app/admin/\(authed\)/edit/\[id\]/edit-form.tsx
git commit -m "Add quantity field to create and edit forms; install @dnd-kit"
```

---

## Task 8: Reescrever `admin-table.tsx` com coluna Qtd, Status N/M, e drag-and-drop

**Files:**
- Modify: `app/admin/(authed)/admin-table.tsx` (reescrita do tbody e GiftRow)

- [ ] **Step 1: Reescrever `app/admin/(authed)/admin-table.tsx` inteiro**

```tsx
"use client";

import {
  useState,
  useActionState,
  useEffect,
  useRef,
  useTransition,
} from "react";
import Link from "next/link";
import Image from "next/image";
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  createGiftAction,
  deleteGiftAction,
  clearReservationAction,
  reorderGiftsAction,
} from "../actions";
import type { Gift } from "../../lib/db";

interface AdminTableProps {
  gifts: Gift[];
}

export function AdminTable({ gifts: initialGifts }: AdminTableProps) {
  const [showForm, setShowForm] = useState(false);
  const [createState, createAction, isCreating] = useActionState(
    createGiftAction,
    null
  );
  const formRef = useRef<HTMLFormElement>(null);

  // Local copy for optimistic reorder
  const [gifts, setGifts] = useState<Gift[]>(initialGifts);
  const [, startReorderTransition] = useTransition();

  // Sync when server data changes
  useEffect(() => {
    setGifts(initialGifts);
  }, [initialGifts]);

  useEffect(() => {
    if (createState && "success" in createState && createState.success) {
      setShowForm(false);
      formRef.current?.reset();
    }
  }, [createState]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = gifts.findIndex((g) => g.id === active.id);
    const newIndex = gifts.findIndex((g) => g.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const newGifts = [...gifts];
    const [moved] = newGifts.splice(oldIndex, 1);
    newGifts.splice(newIndex, 0, moved);
    setGifts(newGifts);

    startReorderTransition(async () => {
      try {
        await reorderGiftsAction(newGifts.map((g) => g.id));
      } catch {
        // Revert on failure
        setGifts(initialGifts);
      }
    });
  }

  const totalGifts = gifts.length;
  const reservedCount = gifts.filter((g) => g.is_fully_reserved).length;
  const availableCount = totalGifts - reservedCount;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-serif text-3xl text-text">Presentes</h2>
          <p className="mt-1 text-sm text-text-light">
            {totalGifts} no total · {availableCount} dispon&iacute;veis ·{" "}
            {reservedCount} esgotados
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="rounded-xl bg-lilac px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-lilac-dark"
        >
          {showForm ? "Cancelar" : "+ Adicionar presente"}
        </button>
      </div>

      {showForm && (
        <form
          ref={formRef}
          action={createAction}
          className="space-y-3 rounded-2xl border border-beige-dark bg-white p-6"
        >
          <h3 className="font-serif text-lg text-text">Novo presente</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="text-xs font-medium text-text-light">Nome</span>
              <input
                name="name"
                required
                placeholder="Ex: Jogo de Panelas"
                className="mt-1 w-full rounded-lg border border-beige-dark px-3 py-2 text-sm outline-none focus:border-lilac"
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-text-light">
                Categoria
              </span>
              <input
                name="category"
                required
                placeholder="Ex: Panelas"
                className="mt-1 w-full rounded-lg border border-beige-dark px-3 py-2 text-sm outline-none focus:border-lilac"
              />
            </label>
          </div>
          <div className="grid gap-3 sm:grid-cols-[1fr_120px]">
            <label className="block">
              <span className="text-xs font-medium text-text-light">
                URL da imagem
              </span>
              <input
                name="image_url"
                type="url"
                required
                placeholder="https://..."
                className="mt-1 w-full rounded-lg border border-beige-dark px-3 py-2 text-sm outline-none focus:border-lilac"
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-text-light">
                Quantidade
              </span>
              <input
                name="quantity"
                type="number"
                min={1}
                defaultValue={1}
                required
                className="mt-1 w-full rounded-lg border border-beige-dark px-3 py-2 text-sm outline-none focus:border-lilac"
              />
            </label>
          </div>
          {createState && "error" in createState && createState.error && (
            <p className="text-xs text-red-500">{createState.error}</p>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded-lg bg-beige px-4 py-2 text-sm font-medium text-text hover:bg-beige-dark"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isCreating}
              className="rounded-lg bg-lilac px-4 py-2 text-sm font-medium text-white hover:bg-lilac-dark disabled:opacity-50"
            >
              {isCreating ? "Adicionando..." : "Adicionar"}
            </button>
          </div>
        </form>
      )}

      <div className="overflow-hidden rounded-2xl border border-beige-dark bg-white">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <table className="w-full text-left text-sm">
            <thead className="border-b border-beige-dark bg-beige/50 text-xs font-semibold uppercase tracking-wider text-text-light">
              <tr>
                <th className="w-10 px-2 py-3" aria-label="Reordenar"></th>
                <th className="px-4 py-3">Imagem</th>
                <th className="px-4 py-3">Nome</th>
                <th className="px-4 py-3">Categoria</th>
                <th className="px-4 py-3">Qtd</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <SortableContext
              items={gifts.map((g) => g.id)}
              strategy={verticalListSortingStrategy}
            >
              <tbody className="divide-y divide-beige-dark">
                {gifts.length === 0 && (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-12 text-center text-sm text-text-light"
                    >
                      Nenhum presente cadastrado.
                    </td>
                  </tr>
                )}
                {gifts.map((gift) => (
                  <SortableGiftRow key={gift.id} gift={gift} />
                ))}
              </tbody>
            </SortableContext>
          </table>
        </DndContext>
      </div>
    </div>
  );
}

function SortableGiftRow({ gift }: { gift: Gift }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: gift.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
    backgroundColor: isDragging ? "rgba(245, 240, 235, 0.8)" : undefined,
  };

  return (
    <tr ref={setNodeRef} style={style} className="hover:bg-beige/30">
      <td className="px-2 py-3 align-middle">
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="cursor-grab touch-none rounded p-1.5 text-text-light hover:bg-beige hover:text-text active:cursor-grabbing"
          aria-label={`Reordenar ${gift.name}`}
        >
          <DragHandleIcon />
        </button>
      </td>
      <td className="px-4 py-3">
        <div className="relative h-12 w-12 overflow-hidden rounded-lg bg-beige-dark">
          <Image
            src={gift.image_url}
            alt={gift.name}
            fill
            className="object-cover"
            sizes="48px"
            unoptimized
          />
        </div>
      </td>
      <td className="px-4 py-3 font-medium text-text">{gift.name}</td>
      <td className="px-4 py-3 text-text-light">{gift.category}</td>
      <td className="px-4 py-3 text-text">{gift.quantity}</td>
      <td className="px-4 py-3">
        <StatusCell gift={gift} />
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center justify-end gap-1">
          <Link
            href={`/admin/edit/${gift.id}`}
            className="rounded-lg p-2 text-text-light hover:bg-beige hover:text-text"
            title="Editar"
          >
            ✏️
          </Link>
          {gift.reserved_count > 0 && (
            <form action={clearReservationAction}>
              <input type="hidden" name="id" value={gift.id} />
              <button
                type="submit"
                className="rounded-lg p-2 text-text-light hover:bg-beige hover:text-text"
                title="Limpar reservas"
              >
                ↺
              </button>
            </form>
          )}
          <form
            action={deleteGiftAction}
            onSubmit={(e) => {
              if (!confirm(`Deletar "${gift.name}"?`)) {
                e.preventDefault();
              }
            }}
          >
            <input type="hidden" name="id" value={gift.id} />
            <button
              type="submit"
              className="rounded-lg p-2 text-text-light hover:bg-red-50 hover:text-red-600"
              title="Deletar"
            >
              🗑
            </button>
          </form>
        </div>
      </td>
    </tr>
  );
}

function StatusCell({ gift }: { gift: Gift }) {
  const names = gift.reservation_names.join(", ");

  if (gift.reserved_count === 0) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-lilac-light/40 px-2.5 py-1 text-xs text-lilac-dark">
        <span className="h-1.5 w-1.5 rounded-full bg-lilac" />
        Disponível
      </span>
    );
  }

  if (gift.is_fully_reserved) {
    return (
      <div className="space-y-1">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-beige px-2.5 py-1 text-xs text-text-light">
          <span className="h-1.5 w-1.5 rounded-full bg-text-light" />
          Esgotado
        </span>
        <p
          className="max-w-[180px] truncate text-[0.7rem] text-text-light"
          title={names}
        >
          {names}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-1 text-xs text-amber-700">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
        {gift.reserved_count}/{gift.quantity} reservados
      </span>
      <p
        className="max-w-[180px] truncate text-[0.7rem] text-text-light"
        title={names}
      >
        {names}
      </p>
    </div>
  );
}

function DragHandleIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden
    >
      <circle cx="7" cy="4" r="1.5" />
      <circle cx="13" cy="4" r="1.5" />
      <circle cx="7" cy="10" r="1.5" />
      <circle cx="13" cy="10" r="1.5" />
      <circle cx="7" cy="16" r="1.5" />
      <circle cx="13" cy="16" r="1.5" />
    </svg>
  );
}
```

- [ ] **Step 2: Verificar TypeScript compila**

```bash
npx tsc --noEmit
```

Expected: nenhuma saída.

- [ ] **Step 3: Commit**

```bash
git add app/admin/\(authed\)/admin-table.tsx
git commit -m "Add drag-and-drop and quantity status to admin table"
```

---

## Task 9: Verificação end-to-end via preview server

**Files:** (apenas verificação)

- [ ] **Step 1: Iniciar dev server**

```bash
source ~/.nvm/nvm.sh && nvm use 22 && npm run dev
```

Aguardar `Ready in ...`. Abrir em outra aba: `http://localhost:3000/admin`.

- [ ] **Step 2: Verificar login e dashboard**

- Senha `Mary#123` → login funciona
- Dashboard mostra coluna "Qtd" com `1` em todos os itens existentes
- Status mostra "Disponível" para itens sem reserva, "Esgotado" para os reservados existentes
- Drag handle (⠿) à esquerda de cada linha

- [ ] **Step 3: Criar um presente com quantidade > 1**

- Clicar "+ Adicionar presente"
- Preencher nome ("Jogo de Toalhas Teste"), categoria ("Cozinha"), URL de imagem válida, **Quantidade: 2**
- Confirmar criação → item aparece com Qtd=2, status "Disponível"

- [ ] **Step 4: Verificar badge na home**

- Abrir `/` em nova aba
- Encontrar "Jogo de Toalhas Teste" → card mostra badge `× 2` no canto superior direito da imagem

- [ ] **Step 5: Reservar 1 unidade**

- No card do "Jogo de Toalhas Teste", clicar "Quero dar este presente"
- Preencher nome (ex: "Teste 1") → confirmar
- Modal fecha, página revalida
- Card ainda visível (não foi para o final), badge muda para `última unidade`

- [ ] **Step 6: Verificar status no admin**

- Voltar para `/admin`
- "Jogo de Toalhas Teste" mostra pill amarela "1/2 reservados" + nome "Teste 1" embaixo

- [ ] **Step 7: Reservar segunda unidade**

- Na home, reservar de novo o mesmo presente com nome "Teste 2"
- Card vira esgotado: esmaecido, "Esgotado" no lugar dos nomes, vai pro final da lista

- [ ] **Step 8: Verificar que esgotado bloqueia novas reservas**

- Tentar abrir o modal de novo (não deve ser possível — botão diz "Indisponível")
- No admin: pill cinza "Esgotado" + nomes "Teste 1, Teste 2"

- [ ] **Step 9: Testar limpar reservas**

- Admin: clicar ↺ no "Jogo de Toalhas Teste"
- Status volta para "Disponível"
- Na home, card volta para o grupo dos disponíveis, badge volta para `× 2`

- [ ] **Step 10: Testar drag-and-drop**

- Admin: arrastar "Jogo de Toalhas Teste" para o topo da lista
- Após soltar, refrescar `/` → "Jogo de Toalhas Teste" aparece como o primeiro card

- [ ] **Step 11: Testar editar quantidade**

- Admin: clicar ✏️ no "Jogo de Toalhas Teste"
- Mudar Quantidade para 3 → salvar
- Voltar para `/admin` → Qtd mostra 3
- Home → badge mostra `× 3`

- [ ] **Step 12: Limpar o presente de teste**

- Admin: clicar 🗑 no "Jogo de Toalhas Teste" → confirmar
- Item desaparece de `/admin` e de `/`

- [ ] **Step 13: Parar o servidor**

`Ctrl+C` no terminal do dev server.

- [ ] **Step 14: Deploy**

```bash
git push origin main
```

Vercel faz deploy automático. Aguardar ~40s.

- [ ] **Step 15: Rodar a migração em produção**

A `DATABASE_URL` que está em `.env.local` aponta para o mesmo banco que produção usa (Neon serverless é o mesmo DB). A migração já foi rodada no Task 1, então produção já tem o schema novo. Não precisa rodar novamente.

Verificar: acessar `https://lista-cha-cozinha-psi.vercel.app` em modo anônimo. Confirmar que a home carrega e que os cards aparecem corretamente (mesmos com badges/esgotado quando aplicável).
