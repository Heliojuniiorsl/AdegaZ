# AdegaZ

Aplicativo React + Vite para consulta de vinhos, leitura de EAN e controle local de estoque.

## Rodar localmente

```bash
npm install
npm run dev
```

## Login local

O login usa SQLite no navegador com `sql.js` e persiste o arquivo do banco em `localStorage`.

Isso significa que cada navegador/dispositivo tem seus próprios usuários e estoques locais.

## Busca por EAN na internet

O frontend busca EAN em fontes publicas e compara o nome encontrado com o catalogo local.

Para melhorar a busca no GitHub Pages, configure um proxy externo:

```bash
cd worker/ean-proxy
npx wrangler deploy
```

Depois configure no GitHub:

```txt
Settings > Secrets and variables > Actions > Variables
Name: VITE_EAN_LOOKUP_PROXY_URL
Value: https://adegaz-ean-proxy.seu-usuario.workers.dev
```

Localmente, voce tambem pode criar um `.env` baseado no `.env.example`.

## Build

```bash
npm run build
npm run lint
```
