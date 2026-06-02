# Quantidade Múltipla e Reordenação Drag-and-Drop

## Contexto

Hoje cada presente é único — uma reserva o marca como indisponível. A Mary precisa cadastrar itens que admitem múltiplas unidades (ex: 2 jogos de toalhas), e quer reordenar a lista no admin via drag-and-drop para controlar o destaque dos presentes na home.

**Decisões aprovadas:**
- 1 reserva = 1 unidade. Cada convidado pega uma unidade por vez.
- Drag-and-drop apenas no `/admin`. A ordem persistida lá é refletida na home.
- Card parcialmente reservado segue visível com badge (ex: "última unidade").
- Card totalmente reservado mostra apenas "Esgotado" — sem listar nomes.
- Stack: tabela `gift_reservations` separada + `@dnd-kit` para DnD.

## Schema

### Modificações em `gifts`

```sql
ALTER TABLE gifts ADD COLUMN quantity INTEGER NOT NULL DEFAULT 1;
ALTER TABLE gifts ADD COLUMN display_order INTEGER NOT NULL DEFAULT 0;
```

`reserved_by` e `reserved_at` ficam por ora para retrocompat — removidos em migração posterior.

### Nova tabela `gift_reservations`

```sql
CREATE TABLE gift_reservations (
  id SERIAL PRIMARY KEY,
  gift_id INTEGER NOT NULL REFERENCES gifts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  reserved_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX gift_reservations_gift_id_idx ON gift_reservations(gift_id);
```

### Migração (única vez)

Script `scripts/migrate-quantity-reorder.sql`:

1. ALTER TABLE para adicionar `quantity` e `display_order`
2. CREATE TABLE `gift_reservations`
3. Backfill: para cada gift com `reserved_by IS NOT NULL`, insere uma linha em `gift_reservations`
4. Backfill: `UPDATE gifts SET display_order = id` (ordem cronológica atual)

### Reserva atômica (anti race condition)

CTE em uma única statement:

```sql
WITH availability AS (
  SELECT g.id, g.quantity, COUNT(r.id) AS reserved
  FROM gifts g LEFT JOIN gift_reservations r ON r.gift_id = g.id
  WHERE g.id = $1
  GROUP BY g.id
)
INSERT INTO gift_reservations (gift_id, name)
SELECT id, $2 FROM availability WHERE reserved < quantity
RETURNING id;
```

Se nenhum row retorna → esgotado. Janela de corrida é aceitável para o volume de tráfego (chá de cozinha).

## Backend

### `app/lib/db.ts`

Tipo `Gift` enriquecido:

```ts
interface Gift {
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
```

Funções:

- `getGifts()` — `LEFT JOIN gift_reservations`, agrega `COUNT()` e `array_agg(name)`, ordena por `display_order ASC, id ASC`
- `getGiftById(id)` — mesma forma com WHERE
- `reserveGift(id, name)` — CTE atômico, retorna `boolean`
- `createGift({ name, image_url, category, quantity })`
- `updateGift(id, { name, image_url, category, quantity })`
- `clearReservation(id)` — `DELETE FROM gift_reservations WHERE gift_id = $1` (limpa todas)
- `updateDisplayOrder(orderedIds: number[])` — UPDATE em batch via CASE WHEN ou múltiplas statements
- `deleteGift(id)` — segue igual (ON DELETE CASCADE cuida das reservas)

### Server actions

- `reserveGiftAction` — interface igual, mensagem diferencia "esgotado"
- `createGiftAction` / `updateGiftAction` — lê `quantity` do FormData (default 1, mínimo 1)
- `clearReservationAction` — opera no nível do gift
- **Nova** `reorderGiftsAction(orderedIds: number[])` — recebe array, valida auth, chama `updateDisplayOrder`, revalida `/` e `/admin`

## Frontend

### Home

**`app/page.tsx`**: nenhuma mudança estrutural — apenas o tipo `Gift` muda.

**`app/components/gift-grid.tsx`**:
- Filtro por categoria igual
- Separação em "available" vs "fully_reserved" usa `is_fully_reserved`
- Ordem dentro de cada grupo: `display_order ASC` (já vem do servidor)
- Animações Framer Motion idênticas

**`app/components/gift-card.tsx`**:
- Quando `is_fully_reserved`:
  - Esmaecido (50% opacity)
  - Texto: "Esgotado" (em vez de "Reservado por X")
  - Botão: "Indisponível"
- Quando disponível:
  - Badge no canto superior direito da imagem:
    - `quantity === 1`: sem badge
    - `quantity > 1` e `reserved_count === 0`: `"× 2"`
    - `quantity > 1` e parcialmente reservado: `"última unidade"` se `quantity - reserved_count === 1`, senão `"N de M disponíveis"`
- Modal de reserva: continua igual

### Admin

**`app/admin/(authed)/admin-table.tsx`**:

Nova estrutura de colunas: `⠿ | Imagem | Nome | Categoria | Qtd | Status | Ações`

- Coluna `⠿` (drag handle) à esquerda — cursor `grab`, hover destaca
- Coluna `Qtd`: número total (ex: `2`)
- Coluna `Status`:
  - `reserved_count === 0`: pill verde "Disponível"
  - `reserved_count < quantity`: pill amarela `"1/2 reservados"` + nomes em linha abaixo (em fonte menor)
  - `reserved_count === quantity`: pill cinza "Esgotado" + nomes em linha abaixo
  - Quando há nomes (ex: "Maria, João"), truncar com `...` se ultrapassar largura da coluna
- Ícone `↺` (limpar reserva) aparece se `reserved_count > 0`

**Drag-and-drop com `@dnd-kit`:**

```tsx
<DndContext sensors={...} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
  <SortableContext items={gifts.map(g => g.id)} strategy={verticalListSortingStrategy}>
    <table>
      <tbody>
        {gifts.map(g => <SortableRow key={g.id} gift={g} />)}
      </tbody>
    </table>
  </SortableContext>
</DndContext>
```

`SortableRow` usa `useSortable({ id })`. O `⠿` recebe os `attributes` e `listeners` para iniciar drag (só ele, não a linha toda).

`onDragEnd`:
- Reordena localmente (optimistic UI via `useOptimistic`)
- Chama `reorderGiftsAction(novaOrdemDeIds)` em background
- Se falha, reverte o estado local (e exibe toast/erro)

**Forms de criar/editar** ganham campo `quantity` (number input, min=1, default=1):

```
[Nome _______________]  [Categoria _____________]
[URL imagem _________]  [Qtd 1]
```

## Arquivos afetados

**Novos:**
- `scripts/migrate-quantity-reorder.sql`

**Modificados:**
- `app/lib/db.ts`
- `app/actions.ts`
- `app/admin/actions.ts`
- `app/components/gift-card.tsx`
- `app/components/gift-grid.tsx`
- `app/admin/(authed)/admin-table.tsx`
- `app/admin/(authed)/edit/[id]/edit-form.tsx`

**Dependências:**
- `@dnd-kit/core`
- `@dnd-kit/sortable`
- `@dnd-kit/utilities`

## Verificação

1. Rodar migração no banco — confirma colunas/tabela criadas e dados existentes preservados (presentes reservados aparecem em `gift_reservations`)
2. Criar presente com `quantity = 2` no admin → aparece na home com badge `"× 2"`
3. Reservar uma unidade pelo nome A → home mostra `"última unidade"`, admin mostra status `"1/2 reservados"`
4. Reservar segunda unidade pelo nome B → card vira "Esgotado", vai pro final, admin mostra `"Esgotado"`
5. Limpar reserva no admin → status volta para "Disponível", presente reaparece como disponível na home
6. Arrastar uma linha no admin → ordem reflete na home depois de revalidar
7. Tentar reservar quando esgotado (via DevTools) → server action retorna erro
