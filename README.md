# MoneyWise

A static, student-friendly financial learning app using virtual Ghana cedis. No build step, dependencies, external fonts, or network services are required to run it.

## Run

From this directory, run `python3 -m http.server 8000`, then open <http://localhost:8000>. It can also be served from GitHub Pages or any static web host. Keep `index.html`, the JavaScript files, `style.css`, and `assets/` together.

## Player sign-in

Players choose a name and an avatar. Profiles and progress are saved **only in this browser’s localStorage**; this is not online authentication and does not protect data from other people using the device. No email addresses or passwords are requested or stored. “Remember this player” is optional; otherwise the current player is remembered only for the tab. Signing out clears both sign-in pointers. Guest progress uses sessionStorage and lasts for that tab. Guests can create a player to retain their progress.

The first saved player automatically receives pre-existing progress from the original `moneywiseState` key. That original data is retained. Each subsequent player starts separately. If browser storage is unavailable or full, the app reports the limitation and guest play remains available in memory.

## What’s included

- All seven original lessons and learning sources, now presented as quests.
- A virtual budget, savings goals with deposits/withdrawals, and hypothetical investment scenarios.
- A shuffled, eight-question quiz with immediate explanations.
- Two replayable games: **Need it or want it?** and **The allowance adventure**.
- XP, levels, eight badges, activity streaks, and daily side quests.
- Separate progress for each player, guest mode, accessible controls, responsive layouts, and reduced-motion support.

Money is stored as integer pesewas to avoid rounding drift. Lesson and first-action XP are awarded once. Arcade and quiz score XP is awarded only for improvements to the player’s best score. Daily bonuses require three activities and can be claimed once per local calendar day. Re-reading a completed lesson counts towards that day’s reading quest without giving lesson XP again. Resetting the wallet also resets saved money, preventing duplicated funds; only a full player reset clears rewards.

## Checks

With Node.js 18 or later, install the optional development dependencies, then run the rule and DOM interaction tests (they do not require a running server):

```sh
npm ci
npm test
npm run check
```

`model.js` holds the money and reward rules; `content.js` preserves the original learning content; `views.js` contains page markup; `script.js` connects profiles, practice labs, and games. The original `design app myp5.html` URL forwards to the main app.
