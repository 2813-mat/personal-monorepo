# Tema de Login do Keycloak — Reskin com a identidade do front

**Data:** 2026-07-04
**Status:** Aprovado (design)
**Branch:** feat/ui-api-connection-transactions

## Contexto

A UI (`apps/ui-financial`, Angular 21) faz login via OIDC contra o Keycloak (realm
`caixa-familia`, client público `ui-financial`). Hoje a tela de login usa o tema **base
(stock)** do Keycloak, que destoa da identidade "private-banking séria" do front.

O objetivo é criar um **tema de login customizado, versionado no projeto**, que siga a
mesma proposta visual do front — sem alterar a funcionalidade de autenticação.

### Decisões tomadas no brainstorming

| Decisão | Escolha |
|---|---|
| Profundidade | Reskin por CSS (estender o tema de login stock), sem templates FTL |
| Identidade | Marca (ícone SVG) + wordmark |
| Wordmark | "Planejador Financeiro" |
| Escopo | Apenas o login theme |
| Onde vive | No projeto (arquivos + mount no docker + `loginTheme` no realm-export), não no admin console |

### Design tokens do front (fonte da verdade: `apps/ui-financial/src/styles.scss`)

- **Brand (navy):** `#0F2D4F` · **brand-soft:** `#E5EAF1`
- **Fundo:** `#F4F5F7` · **surface:** `#FFFFFF`
- **Ink:** `#0A0E1A` (1), `#3F4654` (2), `#6B7280` (3)
- **Linha/borda:** `#E5E7EB` (`--line`)
- **Negativo (erro):** `#B91C1C` (`--neg`) / `#FBE8E8` (`--neg-soft`)
- **Sombra:** `0 1px 0 rgba(15,45,79,.04), 0 1px 2px rgba(15,45,79,.04)`
- **Fonte:** IBM Plex Sans (400/500/600/700) + IBM Plex Mono, via Google Fonts; base 13px
- **Estética:** radius pequeno, sombras sutis, tipografia sóbria

## Arquitetura

Tema **file-based** do Keycloak, versionado no repo:

```
keycloak/
  realm-export.json                       # + "loginTheme": "caixa-familia"
  themes/
    caixa-familia/
      login/
        theme.properties                  # parent + import + styles
        resources/
          css/login.css                   # o reskin (mapeia os tokens do front)
          img/logo.svg                    # lockup: marca navy + "Planejador Financeiro"
```

### Integração com a infra

- **`docker-compose.yml`:** adicionar um volume ao serviço `keycloak`:
  `./keycloak/themes:/opt/keycloak/themes`. (O serviço já monta `./keycloak` em
  `/opt/keycloak/data/import` para o `--import-realm`; o volume de temas é separado.)
- **`realm-export.json`:** adicionar `"loginTheme": "caixa-familia"` no objeto do realm,
  para que o tema seja aplicado na importação (reprodutível, sem passo manual no console).
- Keycloak 26 roda em modo `start-dev`, que **não faz cache de temas** — editar o CSS e
  recarregar a página basta durante a iteração.

### `theme.properties`

Estende o tema de login stock e adiciona a CSS + o common. A linha exata de `parent`
(`keycloak.v2` vs `keycloak`) e de `styles` (que, se declarada, **substitui** a lista do
pai e pode quebrar o layout base) **varia com a versão** do Keycloak. Portanto:

- **Premissa de implementação:** confirmar empiricamente contra o container KC 26 qual
  encadeamento renderiza o formulário base intacto **com** a nossa CSS aplicada por cima,
  iterando até acertar. Ponto de partida: `parent=keycloak.v2`, mantendo os styles do pai
  e **acrescentando** `css/login.css` (não substituindo), mais `import=common/keycloak`.
- A CSS é escrita para ser **aditiva/robusta**: sobrescreve seletores do formulário via
  variáveis e regras específicas, tolerando pequenas diferenças de markup entre versões.

## Visual (o reskin em `css/login.css`)

Mapeia os tokens do front sobre a tela de login:

- **Fonte:** `@import` do Google Fonts (IBM Plex Sans/Mono), mesmas famílias/pesos do
  `index.html` do front; `font-size` base 13px; `-webkit-font-smoothing: antialiased`.
- **Fundo da página:** `#F4F5F7`; centralização do card.
- **Card de login:** `#FFFFFF`, radius pequeno (~8px), borda `--line`, `--shadow-sm`.
- **Header/logo:** `logo.svg` (marca navy + "Planejador Financeiro") via `background-image`
  no header do card; ocultar o texto padrão do nome do realm.
- **Labels/inputs:** label em `--ink-2`; input com borda `--line`, radius pequeno, 13px,
  IBM Plex; estado de foco com borda/anel navy (`--brand`).
- **Botão primário ("Entrar"):** fundo navy `#0F2D4F`, texto branco, peso 600, hover
  levemente mais escuro; largura total.
- **Links** (ex.: "Esqueci minha senha"): cor navy, hover sublinhado.
- **Checkbox "Lembrar-me":** acento navy.
- **Alerts de erro** (credenciais inválidas): fundo `--neg-soft` `#FBE8E8`, texto/detalhe
  `--neg` `#B91C1C`, borda coerente.

### `logo.svg`

SVG autocontido com o lockup: um **mark** navy (quadrado/monograma simples) seguido/acima
do wordmark **"Planejador Financeiro"** em IBM Plex, cor `--ink-1`/navy. Sem dependência de
fonte externa dentro do SVG (usar `font-family` genérica com fallback, ou converter o texto
em path se a renderização variar). Dimensionado para caber no header do card.

## Escopo

**Entra:** o **login theme** `caixa-familia`, que cobre login, reset de senha, OTP/2FA e as
telas de erro do fluxo de autenticação — todas herdam a mesma CSS.

**Fica fora:** account console, templates de e-mail, tema de admin, auto-cadastro
(usuários são seedados no realm).

## Testes

Não há teste automatizado de tema; a validação é **visual, contra o Keycloak rodando**:

1. `docker-compose up -d` (com o volume de temas e o `loginTheme` no export).
2. Abrir o fluxo de login da UI (`http://localhost:4200` → redireciona ao Keycloak).
3. Conferir: logo renderiza, fonte IBM Plex aplicada, fundo cinza, card branco, botão navy.
4. Forçar erro (senha errada) → alert estilizado com `--neg`/`--neg-soft`.
5. Abrir a página de reset de senha → herda o estilo do tema.
6. Confirmar que o login **funciona** (autentica e volta à UI) — o reskin não pode quebrar
   o formulário.

## Riscos / premissas

1. **Encadeamento do `theme.properties`** depende da versão do KC 26 — resolvido
   empiricamente na implementação (ver Arquitetura).
2. **Fonte no SVG:** o texto do logo pode renderizar diferente entre navegadores se
   depender de fonte do sistema; mitigar com fallback ou path.
3. **Cache de tema:** `start-dev` não cacheia; em produção (`start`) seria necessário
   `--spi-theme-cache-themes=false` ou rebuild — fora de escopo (dev-only aqui).

## Fora de escopo (trabalho futuro)

- Layout custom com templates FTL (tela dividida, painel de marca).
- Tematizar account console e e-mails.
- Internacionalização de mensagens custom (usa as mensagens padrão do Keycloak).
- Configuração de tema para ambiente de produção (`start` com cache).
