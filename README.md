# BeautyFlow Backend

Backend inicial do BeautyFlow SaaS usando Node.js, TypeScript, Express, Prisma, PostgreSQL, JWT e Bcrypt. O pacote não inclui `node_modules`.

## Como rodar

```bash
cp .env.example .env
npm install
npx prisma generate
npx prisma migrate dev --name init
npm run dev
```

Servidor padrão:

```txt
http://localhost:3333
```

Rota de teste:

```txt
GET /health
```

## Estrutura

```txt
src/
  config/
  database/
  middlewares/
  modules/
    auth/
    users/
    businesses/
    clients/
    services/
    professionals/
    appointments/
    dashboard/
  routes/
  app.ts
  server.ts
```

## Observação

Este zip não inclui `node_modules`. Rode `npm install` dentro da pasta do backend.
