# Painel TV

Painel de casa para TV Samsung Tizen (Netflix, YouTube etc. como atalhos, clima, notícias, cotações e troféus PSN). O app roda na TV; um relay opcional no PC serve as fontes que a TV não alcança direto (a PSN é lida direto pela TV).

## Instalação e deploy

1. Na TV, ative o Modo Desenvolvedor (Apps, digitar `12345`, ligar Developer Mode) e informe o IP do PC em Host PC IP. Reinicie a TV.
2. No PC: Tizen Studio em `~/tizen-studio` e o certificado `quilltv` em `profiles.xml`.
3. `npm install`.
4. `npm run -s tv` faz tudo: acha a TV na rede (último IP em `config/tv.json`, ignorado pelo git, ou varredura da /24 do Windows), renova o token da PSN a partir de `relay/.env` (pede novo NPSSO, sem eco, se expirou) e reinstala o painel. `--skip-token` pula o token: `npm run -s tv -- --skip-token`.
5. `npm run deploy` (só build, pacote, instalação) usa `TV_SERIAL=ip:porta` ou o IP de `config/tv.json`; `192.168.18.50:26101` é o último recurso. O deploy tenta `sdb connect` duas vezes porque a 1ª tentativa costuma falhar. `scripts/tv-cdp.mjs` segue a mesma regra.

## Configuração

`config/painel.config.json` (copie de [`config/painel.config.example.json`](config/painel.config.example.json); sem ele o deploy usa o exemplo). Campos:

- `favorites`: lista de atalhos, cada um com `appId`, `name`, `bg`, `hue` (RGB) e `meta`.
- `weather`: `city`, `lat`, `lon`, `tz`.
- `news`: lista de `{ theme, url }` com feeds RSS.
- `relayBase`: URL do relay (ex.: `http://192.168.18.5:8787`) ou `null`.
- `psnRefreshToken`: refresh token da PSN, gerado por `npm run -s token` (não edite à mão).
- `sourceRoute`: por fonte (`weather`, `quotes`, `news`), `direct` (TV busca) ou `relay` (via PC).

## Relay

`npm run relay` sobe o proxy em `0.0.0.0:8787`. Para expor à TV: `networkingMode=mirrored` em `.wslconfig` mais `wsl --shutdown`, e regra de firewall de entrada TCP 8787. O passo pendente de expor o relay para a TV (`.wslconfig` e firewall) está em [`relay/README.md`](relay/README.md).

## Token PSN

A TV lê os troféus direto na Sony, com um refresh token embutido no pacote (config pessoal, fora do git). Para gerar ou renovar:

1. Obtenha o NPSSO em `https://ca.account.sony.com/api/v1/ssocookie` logado na PSN.
2. `npm run -s token` (cola o NPSSO por stdin, sem eco; `-s` evita o banner do npm). Grava `PSN_NPSSO` em `relay/.env` e o refresh token em `config/painel.config.json` (`psnRefreshToken`).
3. `npm run -s tv` para enviar o token à TV (ou `npm run deploy` se a TV já for conhecida).

`npm run -s token -- --from-env` reaproveita o NPSSO já salvo em `relay/.env`. A TV guarda em `localStorage` o refresh token mais novo devolvido pela Sony.

## Testes e lint

- `npm test` (vitest)
- `npm run lint` (eslint + prettier)
- `npm run typecheck`

## Executar último app

A opção "Executar último app" existe no Q60A; o efeito de abrir o painel ao ligar a TV ainda depende de confirmação do Quill.

## Solução de problemas

- **Porta 26101 fechada:** só abre depois de reiniciar a TV com o Modo Desenvolvedor ligado e o IP do PC correto.
- **`sdb connect` falha:** repita; o deploy já tenta de novo uma vez. Se persistir, `sdb disconnect` e reconecte.
- **Id do pacote:** o id da app (`PainelTV01.painel`) deve ter exatamente 10 caracteres antes do ponto.
- **`profiles.xml` no Linux:** as senhas do certificado precisam estar em texto puro.
- **`tv-cdp.mjs` relança o app:** cada chamada mata e reabre o painel; coloque esperas dentro da expressão (`new Promise(r => setTimeout(...))`).
- **Cartão PSN "Indisponível":** token da PSN ausente ou expirado (`npm run -s token` e depois `npm run deploy`).

## Aviso

Projeto pessoal, sem vínculo com Samsung, Sony ou os serviços citados. Os troféus usam a API **não oficial** da PlayStation Network (o mesmo fluxo da biblioteca psn-api), que pode mudar ou deixar de funcionar a qualquer momento; use por sua conta e risco e respeite os termos da Sony. Nomes e logotipos de marcas (Netflix, YouTube, PlayStation etc.) pertencem aos seus donos; o mockup usa ícones do Simple Icons (CC0) apenas para ilustração. As fontes Inter seguem a licença OFL (`app/fonts/OFL.txt`).

## Licença

MIT — veja `LICENSE`.
