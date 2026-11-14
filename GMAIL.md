# Faro in Gmail: install and test

Faro's Gmail add-on is a sidebar. It knows you from your email domain (matched to your company's website in Cala) and asks nothing. On a personal address (gmail.com, outlook.com…) the domain can't say which startup is yours, so the sidebar asks for the startup's name **once**, like the web. When a company that is one of your doors emails you, the open message shows that door in five parts.

Two pieces:

1. **Faro itself** (this Next.js app), on a public HTTPS URL. The add-on reads `GET /api/gmail` from it.
2. **The add-on**: an Apps Script project (`gmail-addon/Code.gs` + `gmail-addon/appsscript.json`), installed as a test deployment in your own Gmail.

About 10 minutes in total.

---

## 1. Put Faro on a public URL (Vercel, ~4 min)

The add-on runs on Google's servers, so `localhost` won't do.

1. Make sure the code you want is on `main`. This work lives on the branch `claude/quirky-heisenberg-k6iu76`: merge it into `main` (GitHub → Pull requests → New → base `main` ← compare `claude/quirky-heisenberg-k6iu76` → Merge), **or** in step 4 deploy that branch instead.
2. Go to <https://vercel.com/new> and sign in with GitHub.
3. **Import** `yosephbenjamin/farooo`. Framework preset: **Next.js** (detected). Leave build and output settings as they are.
4. Environment variables: **none needed** for the test. Faro answers from `data/pool.json` and the frozen demos, instantly.
   - Optional `CALA_API_KEY`: lets Faro look up startups that aren't in the data yet. A first lookup can take ~30 s (Cala allows about 10 requests a minute), close to Gmail's limit, and serverless functions don't keep the cache. Leave it out for today.
   - If you deploy the branch instead of `main`: after the first deploy, Project → Settings → Git → **Production Branch** = `claude/quirky-heisenberg-k6iu76`, then redeploy. (Preview URLs sit behind Vercel's login by default, and the add-on can't log in. Use the production URL, or turn off Settings → Deployment Protection → Vercel Authentication.)
5. **Deploy**. Copy the production URL, e.g. `https://farooo.vercel.app`.
6. Check it in a browser. Each of these should return JSON:
   - `https://<your-url>/api/gmail?user=you@gmail.com` → `{"needsName":true,…}`
   - `https://<your-url>/api/gmail?user=you@gmail.com&startup=Distance%20Technologies` → that startup's log
   - `https://<your-url>/api/gmail?user=you@gmail.com&startup=Distance%20Technologies&sender=news@cerebras.ai` → `{"match":true,…}` (Cerebras is entering Finland)

Alternative without Vercel: `npm install && npm run build && npm start`, then `npx cloudflared tunnel --url http://localhost:3000` and use the `https://….trycloudflare.com` address it prints. It only works while your laptop runs it.

## 2. Create the add-on (script.google.com, ~3 min)

1. Open <https://script.google.com> with the Google account whose Gmail you'll test → **New project**. Rename it (top left) to **Faro**.
2. ⚙ **Project Settings** → tick **Show "appsscript.json" manifest file in editor**.
3. ‹› **Editor**:
   - `Code.gs`: delete everything and paste the contents of [`gmail-addon/Code.gs`](gmail-addon/Code.gs).
   - `appsscript.json`: delete everything and paste the contents of [`gmail-addon/appsscript.json`](gmail-addon/appsscript.json).
   - Save (⌘S / Ctrl+S).
4. ⚙ **Project Settings** → **Script properties** → **Add script property**:
   - `FARO_URL` = your URL from step 1, with no trailing slash (e.g. `https://farooo.vercel.app`).
   - **Save script properties**.

## 3. Install it in your Gmail (test deployment, ~1 min)

1. **Deploy** (top right) → **Test deployments**.
2. Application: **Gmail** (it's already selected: the manifest declares a Gmail add-on) → **Install** → **Done**.
3. Open (or reload) <https://mail.google.com>. A lighthouse icon appears in the right-hand side panel. (If the panel is hidden, click the small arrow at the bottom right.)
4. Click it. The first time, Google asks for access: **Authorize access** → pick your account → "Google hasn't verified this app" → **Advanced** → **Go to Faro (unsafe)** → **Allow**. That's normal for a test deployment of your own script.

What it asks for, and why:

| Scope | Why |
|---|---|
| `gmail.addons.execute` | run as a Gmail add-on |
| `gmail.addons.current.message.readonly` | read the **open** message's sender, only while it's open |
| `userinfo.email` | your address, to infer your company from its domain |
| `script.external_request` | call your Faro URL |
| `script.storage` | remember your startup's name and your "more like this · not now" taps |

## 4. Test it

1. **Homepage** (sidebar open, no message selected):
   - Company address whose website Cala knows (e.g. `@distance.tech`): your log appears straight away, three doors of different partnership types.
   - Personal address (`@gmail.com`): "A personal address doesn't say which startup is yours" with one field. Type a startup, e.g. **Distance Technologies**, **Dalip** or **RiACT** (the demo startups in `DEMO.md`), and press **Show my doors**. It's remembered from then on.
2. **Taps**: press **more like this** or **not now** on a door. A toast confirms it and the log re-ranks; "not now" hides that door. Taps are stored per startup in your user properties, in the same shape as the web's cookie.
3. **Contextual door**: open an email from a company that is one of your doors. The card header becomes **A door, in your inbox** and shows that door in five parts. To try it without such an email:
   - Project Settings → Script properties → add `FARO_TEST_SENDER` = `news@cerebras.ai` (Cerebras is a door for Distance Technologies: it's entering Finland; for RiACT use `info@tekever.com`), then open **any** email. Use a sender from one of your startup's doors: the door's website is in its footnote link.
   - Delete `FARO_TEST_SENDER` afterwards: while it's set, every message is treated as coming from that address.
4. **Change startup**: the "Not your startup? Change it" link at the bottom of a card, or the ⋮ menu in the sidebar → **Change startup**.
5. **Open the full log →** opens the web log for the same startup.

Edits to `Code.gs` apply on the next Gmail reload. A test deployment always runs the latest saved code; there's nothing to redeploy.

## Troubleshooting

| You see | Do this |
|---|---|
| "Set FARO_URL in Project Settings → Script properties." | Add the `FARO_URL` property (step 2.4). |
| "Faro answered something other than JSON (HTTP 401/404)…" | `FARO_URL` is wrong, or a Vercel preview URL behind Vercel Authentication. Use the production URL; check it in a browser (step 1.6). |
| "The lighthouse is out of reach: …" | Faro is down or unreachable: open `FARO_URL` in a browser. |
| "Cala doesn't know “X” yet." | X isn't in Faro's data. Try its full or legal name, or a demo startup. (With `CALA_API_KEY` on Vercel, Faro looks it up live.) |
| Nothing in the side panel | Reload Gmail; check Deploy → Test deployments shows it installed for your account; Gmail's side panel must be visible. |
| An error card from Google | Apps Script → **Executions** (left menu) shows the stack trace. |

## Notes

- **Privacy:** the add-on sends Faro your email address, the open message's **sender address** (nothing else from the message), the startup name you typed, and your taps. Faro keeps none of it; the API is stateless.
- **Publishing** beyond your own account needs a Google Cloud project, an OAuth consent screen and Google Workspace Marketplace review. For that, add `"urlFetchWhitelist": ["https://<your-url>/"]` to the manifest.
- **API:** `GET /api/gmail?user=<email>[&startup=<name>][&sender=<email>][&taps=<json>]` → `{needsName, reason}` | `{match: true, door}` | `{match: false, headline, doors}`. Doors carry `lead`, `why`, `type`, `meta`, `people`, `xray`, `footnote`, `source`, and `note` (the † uncertainty line, when Cala's industry code contradicted its description).
