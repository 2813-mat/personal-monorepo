# Keycloak Login Theme — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a versioned, project-owned Keycloak **login theme** (`caixa-familia`) that reskins the login screen to match the front's private-banking aesthetic (navy `#0F2D4F`, IBM Plex, light-gray background, logo lockup) without changing auth behavior.

**Architecture:** File-based Keycloak theme under `keycloak/themes/caixa-familia/login/`, mounted into the Keycloak container via a new `docker-compose` volume, and selected through `"loginTheme"` in `realm-export.json`. A single additive `login.css` maps the front's design tokens onto the stock login form; an SVG lockup provides the mark + "Planejador Financeiro" wordmark. Validation is visual, against the running container (KC 26 `start-dev` does not cache themes).

**Tech Stack:** Keycloak 26 (`quay.io/keycloak/keycloak:26.0`), FreeMarker theme system (CSS-only — no template overrides), Docker Compose, IBM Plex via Google Fonts.

## Global Constraints

- Theme name is `caixa-familia`; it is a **login** theme only (no account/email/admin).
- Wordmark text is exactly **"Planejador Financeiro"**.
- Palette from `apps/ui-financial/src/styles.scss` (verbatim): brand navy `#0F2D4F`, brand-soft `#E5EAF1`, bg `#F4F5F7`, surface `#FFFFFF`, ink-1 `#0A0E1A`, ink-2 `#3F4654`, ink-3 `#6B7280`, line `#E5E7EB`, neg `#B91C1C`, neg-soft `#FBE8E8`, shadow-sm `0 1px 0 rgba(15,45,79,.04), 0 1px 2px rgba(15,45,79,.04)`.
- Fonts: IBM Plex Sans (400/500/600/700) + IBM Plex Mono, base 13px — same source as the front's `index.html`.
- CSS must be **additive** over the parent theme (do not blank out the parent's base styles / form layout).
- Reskin must not break login: authenticating still redirects back to the UI.
- No automated tests for themes — each task's gate is a **visual check against the running Keycloak**.
- Realm is imported by `--import-realm` only when the realm does not already exist; applying a changed `loginTheme` to an already-imported realm requires either re-import or an admin-console selection (see Task 1).

---

## File Structure

- Create `keycloak/themes/caixa-familia/login/theme.properties` — declares parent, imports, and stylesheet.
- Create `keycloak/themes/caixa-familia/login/resources/css/login.css` — the reskin.
- Create `keycloak/themes/caixa-familia/login/resources/img/logo.svg` — mark + wordmark lockup.
- Modify `docker-compose.yml` — add the themes volume to the `keycloak` service.
- Modify `keycloak/realm-export.json` — add `"loginTheme": "caixa-familia"`.

---

## Task 1: Theme plumbing — scaffold, mount, select, and prove it loads

**Files:**
- Create: `keycloak/themes/caixa-familia/login/theme.properties`
- Create: `keycloak/themes/caixa-familia/login/resources/css/login.css`
- Modify: `docker-compose.yml` (keycloak service `volumes:`)
- Modify: `keycloak/realm-export.json` (realm object)

**Interfaces:**
- Produces: a selectable login theme `caixa-familia` whose `login.css` is served on the login page. Later tasks fill in `login.css` and add `logo.svg`.

- [ ] **Step 1: Create `theme.properties` (starting point — additive over keycloak.v2)**

```properties
parent=keycloak.v2
import=common/keycloak
styles=css/login.css
```

Note: in some KC versions declaring `styles` **replaces** the parent list and drops the base PatternFly CSS. If Step 7 shows a broken (unstyled) layout, switch to the append form that keeps the parent styles, e.g. `styles=css/login.css` combined with a `parent` whose styles are auto-included, or list the parent stylesheets explicitly before `css/login.css`. Resolve empirically in Step 7 before moving on.

- [ ] **Step 2: Create a distinctive marker `login.css` (proves the sheet is loaded)**

`resources/css/login.css`:

```css
/* Marker used only to confirm the theme's stylesheet is being served.
   Replaced with the real reskin in Task 3. */
body { outline: 6px solid #0F2D4F; outline-offset: -6px; }
```

- [ ] **Step 3: Add the themes volume to the keycloak service**

In `docker-compose.yml`, under the `keycloak` service `volumes:` (which already has `- ./keycloak:/opt/keycloak/data/import`), add:

```yaml
      - ./keycloak/themes:/opt/keycloak/themes
```

- [ ] **Step 4: Select the theme in the realm export**

In `keycloak/realm-export.json`, add a `"loginTheme"` key to the realm object (top level, e.g. right after `"enabled": true,`):

```json
  "loginTheme": "caixa-familia",
```

- [ ] **Step 5: (Re)create the Keycloak container so the volume mounts and the realm re-imports**

The realm already exists in the keycloak DB from earlier, so `--import-realm` will skip it and the new `loginTheme` won't apply. Recreate only the Keycloak stack + its DB (leave the app Postgres/`cf-pg` untouched):

```bash
docker-compose rm -sf keycloak keycloak-db
docker volume rm personal-monorepo_cf-kc-pg
docker-compose up -d keycloak-db keycloak
```

(If the volume name differs, find it with `docker volume ls | grep kc`. If removing the volume is undesirable, instead set Realm settings → Themes → Login theme = `caixa-familia` in the admin console at `http://localhost:8080/admin` for the running instance — the export still guarantees fresh imports get it.)

- [ ] **Step 6: Wait for Keycloak to be ready**

```bash
docker-compose logs --tail=20 keycloak
```
Expected: log shows Keycloak started and the realm `caixa-familia` imported.

- [ ] **Step 7: Visually confirm the theme is active**

Open `http://localhost:8080/realms/caixa-familia/account` or trigger the app login (`http://localhost:4200`). Expected: the login page shows the **navy outline marker** from Step 2 — proving `caixa-familia/login/login.css` is served. If the base form looks unstyled/broken, fix `theme.properties` per Step 1's note and reload (no cache in `start-dev`), until the base form is intact **and** the marker shows.

- [ ] **Step 8: Commit**

```bash
git add keycloak/themes/caixa-familia/login/theme.properties keycloak/themes/caixa-familia/login/resources/css/login.css docker-compose.yml keycloak/realm-export.json
git commit -m "feat(keycloak): scaffold caixa-familia login theme (plumbing + selection)"
```

---

## Task 2: Logo lockup SVG

**Files:**
- Create: `keycloak/themes/caixa-familia/login/resources/img/logo.svg`

**Interfaces:**
- Produces: `img/logo.svg` — a self-contained lockup (navy mark + "Planejador Financeiro"), referenced by `login.css` in Task 3 as `url(../img/logo.svg)`.

- [ ] **Step 1: Create the SVG lockup**

`resources/img/logo.svg` — a navy rounded-square mark with a subtle inner glyph, followed by the wordmark. Text uses IBM Plex Sans with generic fallback so it renders even before the web font loads:

```svg
<svg xmlns="http://www.w3.org/2000/svg" width="240" height="48" viewBox="0 0 240 48" role="img" aria-label="Planejador Financeiro">
  <rect x="0" y="8" width="32" height="32" rx="8" fill="#0F2D4F"/>
  <path d="M9 30V18h6a4 4 0 0 1 0 8h-3v4z" fill="#FFFFFF"/>
  <text x="44" y="30" font-family="'IBM Plex Sans', system-ui, sans-serif" font-size="18" font-weight="600" fill="#0A0E1A">Planejador Financeiro</text>
</svg>
```

- [ ] **Step 2: Sanity-check the SVG renders**

Open the file directly: `http://localhost:8080/resources/` is not directly browsable, so open the raw file in a browser (`file://` path) or preview in the editor. Expected: a navy rounded square with a white "P"-like glyph and the wordmark to its right, on one line.

- [ ] **Step 3: Commit**

```bash
git add keycloak/themes/caixa-familia/login/resources/img/logo.svg
git commit -m "feat(keycloak): add login logo lockup (mark + Planejador Financeiro)"
```

---

## Task 3: The reskin — full `login.css`

**Files:**
- Modify: `keycloak/themes/caixa-familia/login/resources/css/login.css`

**Interfaces:**
- Consumes: `img/logo.svg` (Task 2).
- Produces: the finished reskin applied to the login card, inputs, primary button, links, and error alerts.

- [ ] **Step 1: Replace the marker CSS with the reskin**

Replace the entire contents of `resources/css/login.css` with the token-mapped reskin. Selectors target the keycloak.v2 login markup; adjust class names in Step 3 if the served DOM differs.

```css
@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap');

:root {
  --bg: #F4F5F7;
  --surface: #FFFFFF;
  --ink-1: #0A0E1A;
  --ink-2: #3F4654;
  --ink-3: #6B7280;
  --line: #E5E7EB;
  --brand: #0F2D4F;
  --brand-hover: #0B2540;
  --neg: #B91C1C;
  --neg-soft: #FBE8E8;
  --shadow-sm: 0 1px 0 rgba(15, 45, 79, .04), 0 1px 2px rgba(15, 45, 79, .04);
}

html { font-size: 13px; }

body.login-pf, .login-pf body, body {
  background: var(--bg) !important;
  font-family: 'IBM Plex Sans', -apple-system, system-ui, sans-serif;
  color: var(--ink-1);
  -webkit-font-smoothing: antialiased;
}

/* Card */
.login-pf-page .card-pf,
#kc-form-wrapper,
.pf-c-login__main {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 8px;
  box-shadow: var(--shadow-sm);
}

/* Header: replace realm name with the logo lockup */
#kc-header-wrapper,
.pf-c-login__main-header,
.login-pf-header h1 {
  font-size: 0;                 /* hide realm text */
  color: transparent;
}
#kc-header-wrapper,
.login-pf-header {
  height: 56px;
  background: url('../img/logo.svg') left center no-repeat;
  background-size: auto 40px;
}

/* Labels + inputs */
label, .pf-c-form__label { color: var(--ink-2); font-weight: 500; }
input[type="text"], input[type="password"], input[type="email"],
.pf-c-form-control {
  font-family: inherit;
  font-size: 13px;
  border: 1px solid var(--line);
  border-radius: 6px;
  color: var(--ink-1);
}
input:focus, .pf-c-form-control:focus {
  border-color: var(--brand);
  outline: none;
  box-shadow: 0 0 0 3px var(--brand-soft, #E5EAF1);
}

/* Primary button */
input[type="submit"], button[type="submit"],
.pf-c-button.pf-m-primary, #kc-login {
  background: var(--brand);
  border: 1px solid var(--brand);
  color: #FFFFFF;
  font-weight: 600;
  border-radius: 6px;
  width: 100%;
}
input[type="submit"]:hover, button[type="submit"]:hover,
.pf-c-button.pf-m-primary:hover, #kc-login:hover {
  background: var(--brand-hover);
  border-color: var(--brand-hover);
}

/* Links */
a { color: var(--brand); }
a:hover { text-decoration: underline; }

/* Error alerts */
.alert-error, .pf-c-alert.pf-m-danger, .kc-feedback-text {
  background: var(--neg-soft);
  color: var(--neg);
  border: 1px solid var(--neg);
  border-radius: 6px;
}
```

- [ ] **Step 2: Reload the login page and inspect**

Reload `http://localhost:4200` → Keycloak login. Expected: light-gray background, white rounded card with subtle shadow, logo lockup in the header, IBM Plex text, navy full-width "Entrar" button.

- [ ] **Step 3: Fix selector mismatches against the real DOM**

Open the browser dev tools on the login page and confirm the actual element classes (KC 26 keycloak.v2 uses PatternFly `pf-c-*`; some builds still use `#kc-*` ids). For any element not restyled, copy its real selector from the inspector into `login.css` and reload. Iterate until card, header/logo, inputs, button, links, and the error alert all match. (Start-dev serves CSS uncached, so reload is enough.)

- [ ] **Step 4: Commit**

```bash
git add keycloak/themes/caixa-familia/login/resources/css/login.css
git commit -m "feat(keycloak): reskin login theme to match the front UI"
```

---

## Task 4: Visual verification across flows + docs

**Files:**
- Modify: `README.md` (note the login theme under the Keycloak section)

**Interfaces:**
- Consumes: the finished theme (Tasks 1–3).

- [ ] **Step 1: Verify the happy path**

From `http://localhost:4200`, log in as `mateus` / `mateus`. Expected: themed login renders; submitting valid credentials authenticates and returns to the UI (theme did not break the form).

- [ ] **Step 2: Verify the error state**

Log in with a wrong password. Expected: the invalid-credentials alert renders with `--neg` / `--neg-soft` styling, card layout intact.

- [ ] **Step 3: Verify an inherited page**

Open the reset-password page (login screen → "Esqueci minha senha", if enabled) or the OTP page if configured. Expected: it inherits the theme's fonts/colors/card without extra work.

- [ ] **Step 4: Document the theme**

In `README.md`, under the existing **Keycloak** subsection, add a short note: the login screen uses the custom `caixa-familia` login theme (`keycloak/themes/caixa-familia/login`), applied via the `loginTheme` in `realm-export.json`; editing the CSS is picked up live in `start-dev` (no cache) — reload the page.

- [ ] **Step 5: Commit**

```bash
git add README.md
git commit -m "docs(keycloak): note the custom login theme"
```

---

## Self-Review Notes

- **Spec coverage:** architecture/plumbing (Task 1: theme dir, `theme.properties`, docker volume, `loginTheme`), logo lockup (Task 2), token-mapped reskin — card/inputs/button/links/error (Task 3), visual testing across login/error/reset (Task 4), docs (Task 4). All spec sections map to a task.
- **Empirical items flagged in the plan (not placeholders):** the exact `theme.properties` chaining (Task 1, Steps 1 & 7) and the exact DOM selectors (Task 3, Step 3) are resolved by inspecting the running KC 26 container, as the spec's risk section requires.
- **Naming consistency:** theme `caixa-familia`, wordmark "Planejador Financeiro", and the palette hex values are used verbatim from the Global Constraints throughout.
- **Reversibility note:** Task 1 Step 5 removes only the Keycloak DB volume (`cf-kc-pg`), never the app Postgres volume (`cf-pg`); the admin-console alternative avoids any volume removal.
