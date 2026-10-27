# Relay do painel

Proxy HTTP no PC (Node 22) para a TV. Fontes na allowlist.

- `npm run relay` sobe em `0.0.0.0:8787`.
- `GET /health` e `GET /proxy?url=` (só hosts da allowlist; outros retornam 403).

## Expor para a TV (pendente)

Ações do Quill, ainda não feitas:

1. Adicionar `[wsl2]` / `networkingMode=mirrored` em `%USERPROFILE%\.wslconfig` e rodar `wsl --shutdown`.
2. PowerShell como admin: `New-NetFirewallRule -DisplayName "Painel relay" -Direction Inbound -LocalPort 8787 -Protocol TCP -Action Allow`.
3. Rodar `npm run relay` e validar pela TV `fetch('http://192.168.18.5:8787/health')` com `tv-cdp.mjs`.
4. Configurar `relayBase: "http://192.168.18.5:8787"`.

## PSN

A TV lê os troféus direto na Sony; o relay não participa. Veja "Token PSN" no README principal.

### Promoções da lista de desejos (não implementado)

`deals` volta sempre `[]` e o cartão mostra só Troféus, sem rotação. Investigado:

- A lista de desejos da PS Store web usa GraphQL persistido (`web.np.playstation.com/api/graphql/v1/op`, operação `metGetStoreWishlist`) com `sha256Hash` extraído do tráfego do navegador. O hash muda sem aviso e não há documentação oficial.
- A biblioteca `psn-api` cobre troféus e perfil, não a lista de desejos.
- Sem hash verificável e sem endpoint documentado, nada foi implementado para não depender de engenharia reversa frágil.
