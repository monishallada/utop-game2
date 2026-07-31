# 🏈 UTOP Flappybird — Friday Night Lights Edition

A class-wide party game: everyone scans a QR code on the big screen, picks a squad,
and flies a football through goalposts. Best of 5 downs counts; squad score = sum of
every member's best. Live leaderboard on the big screen.

## Screens

| URL | Who | What |
| --- | --- | --- |
| `/` | Big screen (projector) | Title, QR code, live lobby, KICKOFF button, live + final leaderboards |
| `/play` | Students' phones (via QR) | Enter name → pick squad → play 5 downs |

## 🚀 Go live (one-time setup, ~2 minutes)

The game needs a free Firebase Realtime Database so all phones share one lobby:

1. Go to [console.firebase.google.com](https://console.firebase.google.com) → **Add project** (any name, Analytics off is fine).
2. In the left sidebar: **Build → Realtime Database → Create Database** → pick a location → start in **test mode**.
3. Copy the database URL shown at the top (looks like `https://your-project-default-rtdb.firebaseio.com`).
4. In Vercel: **Project → Settings → Environment Variables** → add
   - Name: `VITE_FIREBASE_DB_URL`
   - Value: the URL from step 3
5. Redeploy (Deployments → ⋯ → Redeploy).

Without the env var the app runs in **practice mode** (single device only — great for testing, shows a warning banner on the big screen).

> Note: test-mode rules expire after 30 days and are open to anyone with the URL — fine for a one-day talent show. You can wipe all data anytime with the "reset game" button on the final screen.

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:5173` (big screen) and `http://localhost:5173/play` (player) in separate tabs — practice mode syncs tabs on the same machine.

To test with real Firebase locally, create a `.env` file (see `.env.example`).

## Game-day script

1. Open the Vercel URL on the projector.
2. Students scan the QR → name → squad → lobby.
3. Watch the player counter climb toward 160–180.
4. Hit **🏈 KICKOFF!** — everyone plays 5 downs (best score counts).
5. Watch the live scoreboard; when everyone's done, hit **🏁 FINAL WHISTLE** for the podium + confetti.
6. **↺ reset game** wipes everything for a rematch.
