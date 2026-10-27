# Painel TV Braba — design

Data: 2026-10-27 · Dono: Quill · Visual aprovado: `docs/mockups/painel-v12.html`

## 1. Intenção e porquê

A TV é uma Samsung QN55Q60AAGXZD (Q60A 2021, Tizen 6.0, firmware 2310, ARMv7), na sala, com um PS5 no HDMI 1 e um
Chromecast antigo no HDMI 2. O Quill quer abandonar a tela inicial da Samsung (Smart Hub), que tem anúncios, navegação
lenta e poucos atalhos, e ter um painel próprio, bonito e tecnológico, inspirado na tela inicial do PS5.

Substituir a Smart Hub de verdade não é possível. Ela é um app de sistema, o botão Home é reservado e não há root
público para esse firmware. Então o painel é um **app Tizen** (web app `.wgt`) que faz o papel de tela inicial: abre os
apps, troca as entradas HDMI e mostra informações úteis. A Home da Samsung continua existindo por trás.

## 2. O que foi validado na TV (spike de 2026-10-27, `spike/`)

| Capacidade | Resultado | Como |
|---|---|---|
| Instalar app próprio | ✅ | Modo Desenvolvedor, `sdb` + Tizen Studio CLI 6.1 no WSL, **certificado Tizen comum** (não precisa de conta Samsung) |
| Listar apps instalados e abrir qualquer um | ✅ | `tizen.application.getAppsInfo` / `tizen.application.launch` |
| Listar entradas com sinal | ✅ | `tizen.systeminfo.getPropertyValue('VIDEOSOURCE')` → `connected[]` com `type` e `number` |
| Mostrar o HDMI numa janela dentro do app | ✅ | `tizen.tvwindow.setSource` + `show` |
| Trocar a TV para um HDMI | ✅ | WebSocket local da TV `ws://127.0.0.1:8001/api/v2/channels/samsung.remote.control`, tecla `KEY_HDMI{n}`. Pede "Permitir" na TV uma única vez. |
| Abrir sozinho ao ligar | ❌ | A TV volta para a Smart Hub. Ver §6.6. |

Dados de acesso: TV em `192.168.18.50`, sdb na porta 26101, Host PC IP `192.168.18.5` (Windows). O certificado está em
`~/tizen-studio-data/keystore/author/quilltv.p12`, com o perfil `quilltv`. **Pegadinhas já resolvidas:** o ID do pacote
precisa ter exatamente 10 caracteres alfanuméricos. No Linux, o `profiles.xml` precisa da senha em texto puro (o
distribuidor usa `tizenpkcs12passfordsigner`). O `sdb connect` às vezes falha na primeira vez e funciona na segunda.

## 3. Objetivos

1. Uma tela inicial que abre em 1 clique os apps favoritos e as entradas HDMI ligadas.
2. Entradas HDMI dinâmicas: só aparecem as que têm algo ligado, com o nome do aparelho e a porta.
3. Cartões de informação: próximas horas (tempo), agenda, notícias, cotações e troféus do PS5 alternando com promoções
   da lista de desejos da PS Store.
4. O visual da v12, com navegação de deslize no estilo PS5, rodando com fluidez no hardware da TV.
5. Instalação e atualização feitas pelo PC com um único comando.

## 4. Não objetivos (outros projetos, em sequência)

Controle da TV pelo PC, loja de apps, comando de voz, casa inteligente (depende do servidor no celular antigo), troca
do modo de imagem (a TV não expõe isso para apps), substituir a Smart Hub com root e o caminho do dongle Android TV. Os
guias de imagem (Filme, Jogo Cinema, Jogo Competitivo e Dia a dia para o PS5) e a lista de limpeza de anúncios e rastreio
são documentos à parte.

## 5. Anti-objetivos (fracasso mesmo que "funcione")

- **Mostrar dado falso.** Se uma fonte falhar, o cartão diz isso honestamente (por exemplo "Sem conexão com a PSN"),
  com o horário do último dado bom. Nunca inventa número.
- **Navegação lenta.** Cada aperto de seta tem que responder na hora. Uma animação que trava o foco é pior que nenhuma.
- **Deixar a TV num estado ruim.** O app nunca pode impedir a volta para a Home da Samsung.
- **Visual de template:** bordas finas em tudo, vidro, emoji, rótulos em maiúsculas espaçadas, fonte monoespaçada.

## 6. Comportamento

### 6.1 Tela (ver mockup v12; resolução nativa 1920×1080)

- **Topo à esquerda:** a fileira de itens. A ordem é: entradas HDMI ligadas, o divisor vertical, os apps favoritos,
  "TV aberta" e "Todos os apps".
- **Topo à direita:** a barra de status, com nome do Wi-Fi, latência da internet, temperatura atual e relógio.
- **Centro à esquerda:** o destaque do item em foco. Mostra o nome grande, uma descrição e, se for HDMI,
  "● Ligado no HDMI n".
- **Base:** cinco cartões, na ordem Próximas horas · Agenda · Notícias · Cotações · Troféus/Promoções.
- **Fundo:** low poly animado em canvas. Tem três manchas de cor fixas (roxo `#5c3cff`, verde-água `#00c2a8`, rosa
  `#ff3d8b`) e uma quarta que assume, com transição suave, a cor da marca do item em foco.

### 6.2 Navegação pelo controle

- **◀ ▶ na fileira:** o item em foco fica **ancorado à esquerda**, a fileira desliza e os itens anteriores somem pela
  borda esmaecida. O item em foco cresce, ganha contorno branco de 3 px e mostra ao lado o nome (negrito) e uma linha
  de apoio (a porta ou a descrição). O título do destaque entra deslizando.
- **▼** vai para os cartões e **▲** volta para a fileira. ◀ ▶ percorrem os cartões, e o cartão em foco ganha o
  contorno.
- **OK num app:** abre o app. **OK numa entrada:** troca a TV para aquele HDMI (§6.4). **OK num cartão:** sem ação na
  v1, a não ser que o builder ache algo óbvio, como abrir a matéria da notícia no navegador.
- **Voltar:** devolve à Home da Samsung (esconde ou sai do app).

### 6.3 Apps

- Os favoritos e a ordem vêm de uma configuração. Valor padrão: Netflix, YouTube, Globoplay, Prime Video e Spotify, na
  ordem do mockup. Um favorito que não está instalado não aparece.
- **Ícones:** usar o `iconPath` oficial que a TV entrega para cada app, centralizado sobre a cor da marca. As cores das
  marcas ficam na configuração, com um cinza neutro como padrão.
- **"Todos os apps"** abre uma grade com todos os apps visíveis (`show: true`), no mesmo estilo visual. Daqui também
  sai a loja da Samsung, que é um dos apps.
- **"TV aberta"** abre a fonte TV (antena).

### 6.4 Entradas HDMI

- **Quais aparecem:** as portas em `VIDEOSOURCE.connected`. A lista é atualizada ao abrir o app, ao voltar a ele e por
  ouvinte de mudança do `VIDEOSOURCE`, se a TV oferecer. Se não oferecer, por consulta periódica leve.
- **Nome do aparelho:** tentar o nome HDMI-CEC, que **ainda não foi verificado**. Se a TV não entregar, a primeira vez
  que algo aparecer numa porta sem nome, o painel pergunta o nome com uma lista curta (PS5, Chromecast, Notebook, PC,
  Outro). A resposta é guardada por porta.
- **Ícone:** pelo tipo de aparelho (logo PS5, ícone de transmitir, notebook ou genérico), com a faixa "HDMI n" na base.
- **Trocar de entrada:** WebSocket local com `KEY_HDMI{n}`, método validado. Depois disso o painel fica em segundo
  plano, e a TV decide o que acontece ao apertar Voltar ou Home. Ao voltar ao primeiro plano (evento de
  visibilidade), o painel atualiza as entradas e os cartões vencidos. A prévia do HDMI dentro do app (`tvwindow`)
  **não entra na v1**, porque o Quill tirou o botão de prévia.

### 6.5 Cartões

Todos mostram o horário do último dado bom e um estado honesto de erro ou vazio. As fontes são gratuitas.

| Cartão | Conteúdo | Fonte | Atualização |
|---|---|---|---|
| Próximas horas | Temperatura agora, condição, próxima chuva, curva até 7h da manhã | Open-Meteo (sem chave), cidade **Maringá - PR** (coordenadas fixas na configuração), fuso `America/Sao_Paulo` | 30 min |
| Agenda | Hoje e os próximos 2–3 compromissos | Link iCal secreto do Google Agenda (`.ics`) | 15 min |
| Notícias | 3 manchetes com tema (Brasil, Games, Tecnologia, Economia), girando pelos temas | RSS | 15 min |
| Cotações | Dólar, euro, bitcoin, com variação do dia (verde se subiu, vermelho se caiu) | AwesomeAPI | 10 min |
| Troféus ⇄ Promoções | **Troféus:** nível, contagem platina/ouro/prata/bronze, último troféu com raridade, progresso do jogo mais recente. **Promoções:** jogos da lista de desejos em promoção, com preço antigo e novo. Alterna a cada 6 s, com indicador ● ○. | API não oficial da PSN com o token NPSSO do Quill | 30 min |

- **Promoções da lista de desejos: viabilidade não verificada.** Se não houver como obter, o cartão mostra só os
  Troféus, sem alternar.
- **Troca do token NPSSO:** tem que ser "simples e rápida". Um comando no PC (`npm run token -- <npsso>`) grava o token
  na configuração e reinstala o app em segundos. Quando o token vence, o cartão diz "Token da PSN expirou; rode npm run
  token". O token nunca vai para o git.

### 6.6 Abrir ao ligar

Na v1, o Quill fixa o painel na **1ª posição da barra Home** (Home → OK). O builder deve verificar se o Q60A tem a
opção "Executar último app" e documentar o resultado. A automação completa fica para o servidor no celular antigo, em
outro projeto.

## 7. Restrições

- **Motor web do Tizen 6.0:** Chromium antigo (provavelmente na casa do M76; **confirmar** pelo `navigator.userAgent`
  no primeiro passo). O mockup usa recursos modernos que podem não existir lá: `container queries`/`cqw`,
  `aspect-ratio`, `gap` em flexbox, `?.`/`??`. O app deve ser escrito em pixels fixos de 1920×1080 e compilado para o
  alvo do motor da TV.
- **Desempenho:** CPU ARMv7 fraca. O fundo low poly precisa manter a navegação fluida. Meça na TV real e, se pesar,
  reduza o número de triângulos, a resolução do canvas ou a taxa de quadros. Como último recurso, use um quadro
  estático. A navegação tem prioridade sobre o fundo.
- **Fontes embutidas no pacote** (Inter 400/500/600/700). Nada de Google Fonts em tempo de execução.
- **Rede:** chamadas a outros domínios a partir do app. **O primeiro passo do plano** é verificar na TV se
  `<access origin="*">` libera cada fonte de dados (Open-Meteo, AwesomeAPI, um RSS, o `.ics` do Google e a PSN) sem
  bloqueio de CORS. O teste também mede o `navigator.userAgent` e o desempenho do canvas. **Fallback decidido pelo
  Quill:** fontes bloqueadas passam por um **intermediário no PC**, um serviço pequeno no Windows/WSL que busca e
  repassa os dados. A camada de rede nasce com uma URL-base de proxy configurável por fonte, já pensando em migrar
  depois para o servidor no celular. Com o PC desligado, os cartões que dependem dele mostram "Indisponível (PC
  desligado)" com o último dado bom em cache. Se o PC fizer o papel de intermediário da PSN, o token NPSSO fica só no
  PC e não vai no pacote da TV.
- **Segredos:** o NPSSO e o link iCal secreto ficam num arquivo de configuração local ignorado pelo git. São embutidos
  no pacote só quando a fonte é chamada direto da TV. Como a TV é pessoal, esse risco é aceitável.
- **Ciclo de teste:** a interface é desenvolvida e testada no Chromium do PC, em 1920×1080, com os adaptadores Tizen
  simulados. Motor, rede e desempenho são verificados na TV real via sdb (ela fica na rede de casa, em
  `192.168.18.50`). Os testes automatizados cobrem domínio e casos de uso.
- **Código:** Clean Architecture (domínio, casos de uso, adaptadores Tizen/HTTP, apresentação), TDD com testes
  automatizados nas camadas sem Tizen, ESLint + Prettier com `simple-import-sort`, funções de até 60 linhas e arquivos
  de até 500.
- **Commits** de uma linha, no padrão Conventional Commits.

## 8. Decisões tomadas pelo Quill

Painel na própria TV agora (dongle talvez depois). Estrutura no estilo PS5, sem botões de ação (o OK abre direto) e
sem menu de abas. Fundo low poly animado com as cores fixas e a mancha da cor em foco. Ícones oficiais das marcas.
Foco com contorno fino. Divisor entre HDMI e apps. Os cinco cartões descritos acima, com os quatro temas de notícia.
PSN por token. Entradas HDMI dinâmicas com nome e porta. Tempo para Maringá - PR. Intermediário no PC se a TV
bloquear alguma fonte.

## 9. Decisões minhas (para o Quill conferir)

- Fonte Inter, fundo preto e cartões em degrau de tom, sem bordas. Uma cor de dado âmbar (`#f2b33d`), verde e vermelho
  só nas variações. Essas regras vêm das skills de design (Taste, UI/UX Pro Max, Impeccable).
- Fallback de nome do HDMI por pergunta única na TV.
- Troca de token por comando no PC que reinstala o app.
- Tempos de atualização dos cartões (tabela §6.5).
- Sem prévia do HDMI dentro do app na v1. Ao voltar ao primeiro plano, o painel atualiza os dados.
- Desenvolvimento no Chromium do PC com os adaptadores Tizen simulados, e verificação na TV real.

## 10. Deixado para o builder

A estrutura de pastas, a ferramenta de build e de testes, as fontes RSS exatas de cada tema, o desenho da grade "Todos
os apps", as animações de entrada dos cartões, o formato da configuração e a estratégia de cache dos dados, desde que
respeitem as seções acima.
