# Bridal Creative App

Aplicação web para área de cliente da Bridal Creative, com autenticação por link mágico (Supabase), dashboard de produtos adquiridos e integração de webhook para atualização de compras.

## Visão geral

O projeto entrega uma experiência de acesso para clientes que compraram produtos digitais. O fluxo atual permite:

- autenticação por e-mail com magic link;
- visualização de produtos liberados com base nas compras registradas;
- desbloqueio automático de bônus para regras específicas;
- tela de comunidade (feed social em estado local);
- processamento de eventos de compra/refund via webhook.

## Stack técnica

- Frontend: React 19, TypeScript, Vite 7, Wouter, Tailwind CSS 4
- Backend de entrega: Node.js + Express (servindo build estático)
- BaaS: Supabase (Auth + banco)
- Deploy/roteamento: Vercel (`vercel.json`) + função serverless em `api/`
- Ferramentas de qualidade: TypeScript (`tsc`) e Prettier

## Estrutura do projeto

```text
.
├── api/                    # Funções serverless (webhook)
│   └── cakto-webhook.ts
├── client/                 # Frontend React (Vite)
│   ├── src/
│   │   ├── components/
│   │   ├── lib/
│   │   └── pages/
│   └── index.html
├── server/                 # Servidor Express para produção local
│   └── index.ts
├── shared/                 # Código compartilhado
├── vite.config.ts
└── package.json
```

## Como funciona hoje

### Rotas principais

- `/` redireciona para `/login`
- `/login` autenticação por e-mail (OTP/magic link)
- `/dashboard` lista produtos liberados e bloqueados
- `/community` feed social (mock/local)

### Fluxo de autenticação e acesso

1. Usuária informa o e-mail na tela de login.
2. O Supabase envia o link mágico.
3. No dashboard, a aplicação valida o usuário autenticado.
4. São carregadas compras ativas (`purchases`) e catálogo (`products`).
5. Produtos comprados são liberados e bônus podem ser destravados automaticamente conforme regra de negócio.

### Webhook de compras

A função `api/cakto-webhook.ts` recebe eventos `POST` da plataforma de pagamento, identifica usuário por e-mail e faz `upsert` na tabela `purchases`, atualizando status como `active` ou `refunded`.

## Pré-requisitos

- Node.js 20+ (recomendado)
- pnpm 10+ (gerenciador principal do repositório)

> Observação: o projeto também possui `package-lock.json`, mas o `packageManager` em `package.json` está configurado para `pnpm`.

## Variáveis de ambiente

Crie um arquivo `.env` na raiz do projeto. Exemplo:

```bash
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_ANALYTICS_ENDPOINT=
VITE_ANALYTICS_WEBSITE_ID=
VITE_FRONTEND_FORGE_API_KEY=
VITE_FRONTEND_FORGE_API_URL=
VITE_OAUTH_PORTAL_URL=
VITE_APP_ID=

SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
PORT=3000
NODE_ENV=development
```

### Detalhamento

- Frontend:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
  - `VITE_ANALYTICS_ENDPOINT`
  - `VITE_ANALYTICS_WEBSITE_ID`
  - `VITE_FRONTEND_FORGE_API_KEY`
  - `VITE_FRONTEND_FORGE_API_URL`
  - `VITE_OAUTH_PORTAL_URL`
  - `VITE_APP_ID`
- API/Webhook:
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`
- Servidor:
  - `PORT`
  - `NODE_ENV`

## Instalação

```bash
pnpm install
```

## Execução em desenvolvimento

```bash
pnpm dev
```

- O Vite inicia por padrão na porta `3000` (ou próxima disponível).
- A aplicação ficará acessível no host local de desenvolvimento.

## Build e execução de produção local

```bash
pnpm build
pnpm start
```

## Scripts disponíveis

- `pnpm dev` inicia frontend em modo desenvolvimento
- `pnpm build` gera build do frontend e empacota o servidor
- `pnpm start` executa servidor em produção local (`dist/index.js`)
- `pnpm preview` pré-visualiza build do Vite
- `pnpm check` valida tipagem TypeScript
- `pnpm format` formata código com Prettier

## Banco e autenticação (Supabase)

Para o fluxo atual funcionar, é esperado que existam tabelas equivalentes a:

- `products` (catálogo de produtos)
- `purchases` (compras por usuário com status)

Também é necessário configurar Auth por e-mail no Supabase para suportar login via magic link.

## Status de qualidade e próximos passos recomendados

Estado atual do projeto:

- sem script de lint configurado;
- sem suíte de testes automatizados configurada em scripts;
- com suporte a type-check e formatação.

Recomendações:

1. adicionar script de lint (ESLint);
2. ativar script de testes (Vitest já está nas dependências);
3. criar `.env.example` com todas as variáveis obrigatórias;
4. padronizar lockfile para um único gerenciador de pacotes.

## Deploy

O repositório já inclui `vercel.json` e a pasta `api/`, indicando suporte a deploy em Vercel com:

- SPA servida com rewrite para `client/index.html`;
- endpoint serverless para webhook em `api/cakto-webhook.ts`.

## Licença

Este projeto está sob licença MIT (conforme `package.json`).
