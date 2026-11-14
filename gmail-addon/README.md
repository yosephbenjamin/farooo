# Faro for Gmail

A contextual sidebar. It knows you from your email domain (matched to your company's website in Cala), asks nothing, and shows a door when a company that's one of your doors emails you.

1. Create an Apps Script project; paste `Code.gs` and `appsscript.json` (Project Settings → show the manifest).
2. Script property `FARO_URL`: where Faro is deployed (e.g. `https://faro.example.com`).
3. Deploy → Test deployments → Gmail. Open Gmail: Faro is in the right sidebar.

Reads `GET /api/gmail?user=<your email>&sender=<sender>`. "more like this · not now" taps are stored in your user properties, in the same shape as the web's cookie. Not yet tested against a live Gmail account.
