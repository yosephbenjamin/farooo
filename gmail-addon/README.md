# Faro for Gmail

The same log in the Gmail sidebar, as a card. Optional.

1. Create an Apps Script project, paste `Code.gs` and `appsscript.json` (show the manifest under Project Settings).
2. Script properties: `FARO_URL` (where Faro is deployed, e.g. `https://faro.example.com`) and `STARTUP` (a slug, e.g. `oura`).
3. Deploy > Test deployments > Gmail. Open Gmail; Faro appears in the right sidebar.

It reads `GET /api/doors/<startup>`. Not tested against a live Gmail account during the hackathon.
