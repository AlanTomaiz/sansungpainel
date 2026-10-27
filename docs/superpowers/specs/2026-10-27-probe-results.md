# Resultados da sonda na TV (2026-10-27)

TV: QN55Q60AAGXZD (Tizen 6.0), medido com `probe/` via `scripts/tv-cdp.mjs`.

- UA: `Mozilla/5.0 (SMART-TV; LINUX; Tizen 6.0) AppleWebKit/537.36 (KHTML, like Gecko) 76.0.3809.146/6.0 TV Safari/537.36`
- **chromeMajor: 76** (esbuild `target`: `chrome76`; sem `?.`, `??` nem class fields)

## Fontes de dados

| Fonte | Resultado | Decisao |
|---|---|---|
| open-meteo (clima) | ok, 200 | direct |
| awesomeapi (USD-BRL) | ok, 200 | direct |
| g1 RSS | ok, 200 | direct |
| Google Calendar ICS (feriados) | ok, 200 | direct |
| PSN trophySummary | 401 (resposta sem erro CORS) | relay (sempre: login exige ler redirect 302 com esquema proprio) |

## CEC / fontes de video

`VIDEOSOURCE` retorna apenas `connected` e `disconnected`, cada item com `{type, number, signal}`. Nao ha campo `name`/`label`.
- connected: TV 1, HDMI 1
- disconnected: AV 1, HDMI 2, HDMI 3

**CEC entrega nome: nao** (so tipo e numero; nomes de HDMI precisam ser configurados manualmente).

## Wi-Fi

**WIFI_NETWORK funciona: sim.** `status: ON`, `signalStrength: 0.38` (escala 0 a 1). Tambem expoe ipAddress, gateway, dns, securityMode e outros.

## Canvas low poly (60% de 1920x1080, media de 10 s)

| Grade | fps |
|---|---|
| 18x11 | 17.3 |
| 12x7 | 32.6 |

Medido com o app em modo debug (CDP anexado), o que pode reduzir um pouco o fps. Nenhuma grade chega a 60 fps; o low poly animado deve ser reduzido (menos celulas, menor frequencia ou fundo estatico).
