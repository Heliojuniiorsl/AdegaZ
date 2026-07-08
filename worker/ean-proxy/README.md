# AdegaZ EAN Proxy

Proxy simples para buscar dados de EAN/GTIN/UPC fora do navegador e evitar bloqueios de CORS no GitHub Pages.

## Publicar no Cloudflare Workers

1. Entre na sua conta Cloudflare pelo Wrangler:

```bash
npx wrangler login
```

2. Publique o Worker:

```bash
cd worker/ean-proxy
npx wrangler deploy
```

3. Copie a URL gerada, algo como:

```txt
https://adegaz-ean-proxy.seu-usuario.workers.dev
```

4. No GitHub, crie a variável do repositório:

```txt
Settings > Secrets and variables > Actions > Variables
Name: VITE_EAN_LOOKUP_PROXY_URL
Value: https://adegaz-ean-proxy.seu-usuario.workers.dev
```

5. Rode novamente o workflow do GitHub Pages ou faça um novo push.

## Formato da resposta

```json
{
  "ean": "7895000394203",
  "resultados": [
    {
      "fonte": "Wireshape Data",
      "ean": "7895000394203",
      "nome": "Frisante Vinho Rose 750ml",
      "marca": "Club Des Sommeliers",
      "imagem": "https://...",
      "quantidade": "750ml",
      "categoria": "Food and Beverages",
      "descricao": "Texto curto",
      "confiancaFonte": 0.9
    }
  ]
}
```

O frontend do AdegaZ ja entende esse formato pela variavel `VITE_EAN_LOOKUP_PROXY_URL`.
