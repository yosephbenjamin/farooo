# Faro: the 60-second demo

Setup (offline, no key needed):

```bash
npm install && npm run build
CALA_OFFLINE=1 npm start
```

Open `http://localhost:3000/for/verda?booth=1` full screen (F11). The page shows "Two doors opened for Verda this month." One door is held back.

| Time | Screen | Say |
|---|---|---|
| 0:00 | Booth, Verda | "Cala is the hidden cove. Faro is the lighthouse. It watches Cala's funding graph and stays silent until a door opens." |
| 0:08 | Point at the map | "Verda is the house in the middle. Each building is one of its investors; every window is a company in that investor's portfolio. Lit windows are doors: companies that just raised, so there's a reason to call now." |
| 0:18 | **Press space** | A new line types itself in: *Vensum raised a €9M Series A.* A window on Lifeline Ventures' building lights up. The headline becomes "Three doors opened". "That's the signal. Dated, sourced (tech.eu, 6 November), and the warm path is the shared investor: Lifeline." |
| 0:30 | Read the second line | "And why you: Vensum works on power conversion; Verda runs AI data centres on clean energy. One line, no dashboard." |
| 0:38 | Bottom line | "Door Count: Lifeline opens 17 doors for Verda, Tesi 9, byFounders 3. Founders raising can see which fund actually adds partners, not just money." |
| 0:46 | Go to `/` and type *Lovable* | "Any startup. Lovable's investors open different doors: Causa Prima raised a $20M seed on 13 October. It handles billing; the apps Lovable users build need it." |
| 0:55 | `/log` | "The same lines arrive as one quiet email: The lighthouse saw something." |

Other demo startups: `/for/oura`, `/for/lovable`, `/for/verda` (add `?booth=1` for booth mode, `&auto=6000` to open the door by itself after 6 s).

If asked about data: every door's reason has a concrete date and a source URL. "Recent" and month-only dates are never alerted on. See `DATA_NOTES.md` for what we found in Cala's data.
