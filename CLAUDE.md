# Shop Book: phone app (frontend)

Shop Book is an offline-first bookkeeping app for market traders: products and stock, sales, payments, debts, expenses, and a team (owner, manager, sales associates) working on their own Android phones. Many businesses use it, and each one's records are completely private. It is built as **two separate projects**, each with its own Git repository and its own `CLAUDE.md`: the **backend** (`STOREBOK_BACKEND`: Express API and MySQL) and the **frontend** (`STOREBOK_FRONTEND`: installable web app that works offline and syncs).

**This is the frontend project.** Open Claude Code in its root folder for every frontend (FE) task. The app's code lives at the root of this project (`src/`, `public/`…), and the documents are in **`docs/`**. The backend is a separate project you can't see; if a task seems to need a change there, stop and tell me.

## Source of truth

- **`docs/backlog.md`:** what the product must do and why (user stories, acceptance criteria, decisions). Use it for detail; don't change it.
- **`docs/server-plan.md`:** how to build the server, tasks BE0–BE17 (with BE5.5), the whole-project build order, and the decisions (ADRs).
- **`docs/app-plan.md`:** how to build the phone app, tasks FE0–FE14 (with FE3.5).
- **`docs/api.md`:** written by the backend project and **copied here by me** after each backend task. **Never edit it here**; the app uses only what it lists.
- **`docs/guide.md`** (plain-language explanations for studying): kept up to date by each task. **There is no `deploy.md`:** I do deployment myself, my own way; don't write deployment guides or dashboard steps.
- **Order of authority:** backlog → plans → `api.md` → code. **If two documents conflict, or a task would break a rule: stop, tell me which documents disagree, propose which one to update, and wait.** Never quietly pick one.

## Build order (whole project)

1. Server foundations BE0–BE5, then the **server sync torture test BE5.5** (must pass).
2. App foundations FE0–FE4, with the **two-phone torture test FE3.5** (must pass before FE5).
3. Each feature, server then app: BE6 → FE5, BE7 → FE6, BE8 → FE7, BE9 → BE13 (reminders, needed by FE8) → FE8, BE10 → FE9, BE11 → FE10, BE12 → FE11.
4. Accounts, privacy and support: BE15 → FE13 (download records, close a business, Help), BE16 → FE14 (practice shop), BE17 (support tools, error monitoring).
5. Finish: BE14 (production review, security checklist, backup restore; the server has been live since BE1) and FE12 (polish, a full day in the test shop).

## Rules for the whole project

- **Permanent records:** sales, corrections, repayments, debt write-offs, debts brought forward, stock movements, stock counts, expenses and day closes are never edited or deleted, on the server or the phone. Write no code that could change them. Mistakes are fixed with corrections or reversals. The only deletes allowed are in the server's `deleteBusinessData`: a business its owner closed, after 30 days, and resetting a practice shop.
- **Money** in whole pesewas, shown as "GH₵ 120.00"; **quantities** in whole units, with half-yard units for yard products (shown as "2.5 yards"). No floating-point money anywhere.
- **Secrets** only in `.env` files (never committed); keep `.env.example` complete. **Never read or print `.env` or `.env.production` files; ask me if you need a value.**
- **Hosting** (free plans for testing): Render (API), Aiven (MySQL), Vercel (app), Brevo (email), Sentry (errors). **Deploy early:** I put the server live in BE1 and the app in FE1, myself.
- **Don't add any library without asking.**

## Git and deployment: I do them, you don't

**I handle everything to do with Git and deployment.** You never:

- run any Git command (`git add`, `commit`, `push`, `pull`, `branch`, `checkout`, `merge`, `rebase`, `stash`, `reset`, `tag`) or `gh`, and never create or change `.github/` workflows unless a task asks for the file;
- deploy or touch a hosting service: no Render, Vercel or Aiven CLIs or APIs, no dashboards, no creating accounts, databases or projects;
- run anything against **production**: no production migrations, seeders, consistency checks, support scripts, backups or restores, and nothing that reads `.env.production` (you never open that file).

You also **don't write deployment instructions** (no `deploy.md`, no `render.yaml`, no dashboard walk-throughs). You only keep the project's own files right: `.nvmrc`, `engines`, `.env.example` with every variable and a comment saying what it's for, and (frontend) `vercel.json`.

At the end of a task, if anything changed that production needs, say it in **one or two lines**: new environment variable names, or new migrations. Nothing more.

After I've deployed, I'll paste what I see (health output, logs, errors). Use that to finish the task's **Done when**; if an item needs production, mark it "waiting for you" rather than guessing it passed.

## The standard

The goal isn't the most complicated bookkeeping system. It's the **simplest system that can never silently lose, duplicate or misrepresent a trader's money**. When a shortcut would risk that, don't take it; when extra complexity doesn't protect it, don't add it. Never say a test passed unless you ran it, and never claim the system has no bugs or vulnerabilities.

## Comments for learning

I'm learning from this code. Start every file with a short comment saying what it's for, and put a comment above every function or component explaining what it does and why, especially in sync, transactions, and isolation.

# App rules

**`docs/api.md` is the app's only contract with the server.** It's written by the backend tasks for you: conventions, headers and the exact signed text, every error code with what the app should do, every endpoint, every sync operation and every pull row with what each role receives. Use only what it lists. **The server's code isn't in this project; never ask for it or guess from memory how the server behaves**, and never guess an endpoint, field or error code: if `api.md` doesn't have what a screen needs, or seems to disagree with the app plan, stop and tell me (`api.md` wins over the app plan).

## Stack

React, Vite, React Router, Tailwind CSS (official Vite plugin, design values as CSS variables), Dexie with `dexie-react-hooks` (IndexedDB), vite-plugin-pwa, Web Crypto (PIN hashing with PBKDF2; device signing with ECDSA P-256), the browser's `fetch` (no axios), a small English and Twi dictionary with `t()` (no library), Vitest (dev only, never shipped). Don't add any other library without asking.

## Hosting (I deploy)

- **Vercel free** (Root Directory: the project root), with `vercel.json` rewriting `/api/*` to the Render server and setting the security headers, including a strict **Content-Security-Policy** (scripts only from the app itself). You write `vercel.json`; I create the project and deploy.
- **The free server sleeps.** The first sync after a quiet spell can take up to a minute: call `/api/health` when the app opens, wait up to 60 seconds, show "Connecting…", and treat a timeout as temporary. A slow server never blocks selling.

## Offline first

- **Every screen reads from the local Dexie database.** Saving writes the record **and** its outbox operation (and the receipt counter) in one Dexie transaction. Never wait for the network to save.
- **One local database per business** (`shopbook-<businessId>`, with its own outbox, cursor, device key and code, and receipt counter), plus a shared `shopbook-app` for the signed-in user, open business, language and PIN. A wipe (`ACCESS_REMOVED`, `DEVICE_REVOKED`) removes only that business's database.
- **Dexie versions:** every schema change is a new version with an upgrade; never edit an old version, and never clear the outbox or "Needs attention" in an upgrade.
- **Never lose records:** rejected operations (and `OP_ID_CONFLICT`) go to "Needs attention" with their message; a session expiry keeps all local data; a 5xx or timeout is always temporary and retried.
- **Pulls:** apply each page and its `nextCursor` in one Dexie transaction; a page with no rows can still move the cursor.
- **The server is in charge:** the phone never stores or shows data the server didn't send, and never sends a cost, balance or total as truth.

## Requests and security

- **One shared API helper:** `/api` on the same site, `credentials: "include"`, `X-Requested-With: XMLHttpRequest`, `X-Business: <open business>`. Never call the server's address directly.
- **Signed requests:** the helper signs every business request with the phone's non-extractable key (see the app plan's "Device key and signed requests"), using server-corrected time from `X-Server-Time`. Register a device with the challenge, the signed challenge and the person's password. Never log or export the key; never keep the password.
- **No injected code:** no inline scripts, no `dangerouslySetInnerHTML`, no scripts from other sites. The CSP and this rule are what protect the signing key.
- **Sale lines** name the price version they used (`productVersion`, `sizeVersion`, or `editOpId`). **Stock counts** send what was counted and the number shown, never a difference. **Returns** pick lines from the original sale and apply the settlement rules before saving.

## Screens

- **Languages:** all of the app's own text comes from the English and Twi dictionaries via `t()`; both must have the same keys (`npm run check:i18n`). Names and notes stay as typed.
- **Design:** build from **`docs/design.md`** (colours as CSS variables, components, screens, logo) and the app plan's Design guide: light, high contrast, buttons at least 48px, large numbers, icons with labels, never colour alone, designed for 360px-wide phones, works with 130% text.
- **Roles:** follow the app plan's "Who sees what"; the server enforces it, so screens never rely on hiding alone.

## After each app task

Check **390px width**, **airplane mode** and both languages; run the Vitest tests; tell me how to test on a real phone. Run the two-phone FE3.5 cases again after FE5 (products), FE7 (sales) and FE9 (returns).

## How to work

1. Read the task in `docs/app-plan.md` (and the related backlog epic), check that the server task it needs is done and in `docs/api.md` (the copy I last brought over; if it looks older than the task needs, ask me to copy it again), explain your plan briefly, and wait for my OK.
2. Build only that task.
3. Check every **Done when** item, and do what "After each app task" says. Summarise what changed, and end with the one or two lines on anything production needs (new environment variables), if any.
4. Stop. Don't start the next task until I say so. Never run Git commands or deploy; I do both.

## Commands

- Start the app: `npm run dev` (opens on http://localhost:5173; `/api` goes to `API_PROXY_TARGET` in `.env`)
- Run the tests: `npm test`
- Check the dictionaries: `npm run check:i18n`
- Build the app: `npm run build` (then `npm run preview` to try the built, offline-ready version)
- Remake the PNG icons after a logo change: `npm run icons` (uses the installed Chrome)
