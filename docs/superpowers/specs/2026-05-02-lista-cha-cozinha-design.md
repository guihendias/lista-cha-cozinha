# Lista de Presentes - Chá de Cozinha

## Contexto

Guilherme está se casando e precisa de uma lista de presentes para o chá de cozinha. Os convidados acessam um site, veem os presentes disponíveis e reservam informando seu nome. O site é público (sem auth), e a gestão dos itens é feita via CLI/SQL — sem painel admin.

## Stack

- **Framework:** Next.js 15 (App Router, Server Components, Server Actions)
- **Banco de dados:** Vercel Postgres (`@vercel/postgres`)
- **Estilo:** Tailwind CSS v4
- **Animações:** Framer Motion
- **Deploy:** Vercel

## Banco de Dados

Uma tabela `gifts`:

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | `serial PK` | ID auto-incremento |
| `name` | `text NOT NULL` | Nome do presente |
| `image_url` | `text NOT NULL` | URL da imagem |
| `category` | `text NOT NULL` | Categoria (ex: "Panelas", "Utensílios") |
| `reserved_by` | `text NULL` | Nome de quem reservou (NULL = disponível) |
| `reserved_at` | `timestamp NULL` | Data/hora da reserva |

Sem tabelas adicionais. `reserved_by IS NULL` = disponível.

## Arquitetura

### Rotas

- `/` — página única com a lista de presentes (Server Component)

### Fluxo de Dados

1. Server Component carrega presentes do Vercel Postgres
2. Presentes renderizados em grid responsivo de cards
3. Disponíveis primeiro, reservados ao final (esmaecidos, 50% opacity)
4. Clique em "Quero dar este presente" abre modal com campo de nome
5. Submit executa Server Action: `UPDATE gifts SET reserved_by = $1, reserved_at = NOW() WHERE id = $2 AND reserved_by IS NULL`
6. `revalidatePath('/')` atualiza a lista

### Componentes

- `app/page.tsx` — Server Component, busca dados e renderiza layout
- `app/components/gift-grid.tsx` — Client Component, grid animado com Framer Motion (AnimatePresence + LayoutGroup)
- `app/components/gift-card.tsx` — Client Component, card individual com hover animation
- `app/components/category-filter.tsx` — Client Component, filtros por categoria (pills)
- `app/components/reserve-modal.tsx` — Client Component, modal de reserva com campo de nome
- `app/actions.ts` — Server Action para reservar presente
- `app/lib/db.ts` — Helper para queries no Vercel Postgres

## Design Visual

### Paleta de Cores

- Lilás principal: `#C8A2C8`
- Lilás claro: `#E8D5E8`
- Lilás escuro: `#9B6F9B`
- Bege fundo: `#F5F0EB`
- Bege escuro: `#E8DDD4`
- Dourado (detalhe): `#C9A96E`
- Texto: `#3D3D3D`
- Texto claro: `#7A7A7A`

### Tipografia

- Títulos: Cormorant Garamond (serifada, elegante)
- Corpo: Inter (sans-serif, legível)

### Layout

- **Header:** Título principal "Chá de Cozinha" (Cormorant Garamond, grande, destaque), subtítulo "Guilherme & Noiva" (menor, uppercase, tracking wide, lilás escuro), divisor dourado, descrição

- **Filtros de categoria:** Pills horizontais centralizados. Ativo = fundo lilás + texto branco. Inativo = fundo branco + borda bege

- **Grid de cards:** `grid-template-columns: repeat(auto-fill, minmax(260px, 1fr))`, gap 1.5rem, max-width 1100px. Mobile: minmax(160px, 1fr)

- **Card disponível:** Fundo branco, border-radius 16px, shadow sutil. Imagem 200px height (object-fit cover). Tag categoria (uppercase, lilás escuro, pequena). Nome em Cormorant Garamond. Botão "Quero dar este presente" lilás. Hover: translateY(-4px) + shadow maior

- **Card reservado:** Opacity 50%, pointer-events none. Badge "Reservado por [Nome]". Botão cinza "Indisponível". Seção separada com label "JÁ RESERVADOS"

- **Modal:** Overlay com backdrop-filter blur. Card branco border-radius 20px. Título do presente, texto de instrução, input de nome, botões Cancelar (bege) e Confirmar (lilás)

### Animações (Framer Motion)

- Cards entram com fade-in + slide-up escalonado
- Hover: scale sutil + shadow
- Ao reservar: card faz fade-out suave, depois reaparece no final da lista esmaecido
- Filtro de categoria: AnimatePresence para cards que entram/saem
- Modal: fade-in overlay + scale-in card

## Gestão de Itens

Sem painel admin. Itens cadastrados e gerenciados via:
- SQL direto no Vercel Postgres dashboard
- CLI commands durante o desenvolvimento
- Claude Code (nesta sessão e futuras)

## Seed Data (Categorias iniciais)

- Panelas
- Utensílios
- Eletrodomésticos
- Mesa & Bar

Os itens específicos serão cadastrados pelo Guilherme após o deploy.

## Verificação

1. `npm run dev` — verificar que a página carrega com cards
2. Testar filtro de categorias
3. Clicar "Quero dar este presente" — verificar modal
4. Preencher nome e confirmar — verificar que card move pro final como indisponível
5. Testar responsividade (mobile e desktop)
6. Deploy na Vercel e testar em produção
