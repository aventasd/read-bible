# The Old Testament in a Year

A small web app that installs on an Android phone. It gives one reading a day,
six days a week, and covers the whole Old Testament in a year, **in the order
the history actually happened**.

- **313 readings**, about **3 chapters** and **12 minutes** each
- **929 chapters**, every one read exactly once, none read twice
- Nine ages of history, from creation to coming home from exile
- Works with no internet once the text is saved
- Nothing is uploaded anywhere. Progress stays on the phone

## Put it on his phone

1. Open the app link in **Chrome** on the phone.
2. Tap the **three dots** at the top right.
3. Tap **Add to Home screen**, then **Install**.
4. Open it from the home screen icon. It fills the screen with no browser bars.

Then, still in the app:

5. Go to **Settings** and tap **Save all readings**. Do this once on wifi. After
   that the app works with no internet at all.

## Set the daily reminder

A web app cannot set its own alarm, so use the phone's own Clock app. This is
more reliable anyway, because Android owns it.

1. Open the **Clock** app on the phone.
2. Tap **Alarm**, then the **plus** button.
3. Set the time, for example 7:30 pm.
4. Tap **Repeat** and choose every day except his free day.
5. Name it **Bible reading** so he knows what it is.

## Keep the progress safe

Clearing Chrome's browsing data deletes the progress, and nothing stored inside a
browser survives that. So:

- In **Settings**, tap **Share progress** now and then. It sends a readable
  summary plus a backup file through the normal share sheet.
- **Save a file** puts the same backup in the phone's Downloads folder, which
  survives clearing site data.
- **Restore from a file** puts it all back. Restoring only ever adds readings, it
  never removes any.
- If everything is lost and there is no backup, Settings has a repair field:
  type the reading number he had reached.

## About the Bible text

The plan is built for the **NIV**. Every reading has a **Read in the NIV** button
that opens the exact passage in Bible.com or the YouVersion app.

The text bundled inside the app for offline reading is the **World English
Bible**, which is public domain. The NIV is copyrighted and cannot legally be
copied into an app, so the wording of the offline text differs slightly. The plan
itself, being chapter references, is the same either way.

## How the plan was built

`PLAN.md` holds the whole plan in readable form. The short version:

- `data/chronology.ts` is the historical order: 111 segments, hand written and
  reviewed, with the reasoning in comments. It is data, not logic.
- The smallest unit is a **block**. A block is one chapter, or a set of chapters
  that tell the **same events** from different writers, which are read side by
  side so no story is read twice on different days.
- `scripts/build-plan.ts` splits the 891 blocks into 313 readings of near equal
  word count, using dynamic programming. Blocks are never broken, and a reading
  never crosses from one age into the next.
- Word counts come from the real text, so the days are equal in reading effort
  rather than equal in chapter count. Psalm 117 has 2 verses; Psalm 119 has 176.

### The plan is frozen

Progress is stored as reading numbers, so **reading 84 must mean the same
chapters forever**. `data/plan.json` is generated once and committed, and there
is a test that rebuilding produces identical bytes. Changing the order later
means bumping `version` in the plan and writing a migration, not regenerating in
place.

## Working on it

```sh
npm install
npm test           # 58 tests: the plan invariants and the app logic
npm run build      # typecheck, then build to dist/
npm run preview    # serve the real build on http://localhost:3027/read-bible/
```

Test the **built** app, not the dev server: the service worker is only real in a
production build, so a dev server proves nothing about offline behaviour.

Rebuilding the data, only needed if the plan itself changes:

```sh
npm run fetch:text   # downloads the public domain text once, by hand
npm run build:data   # metrics, then plan.json, then the 313 text files
```

## What it deliberately does not do

- **No notifications.** Chrome for Android does not support the badge API, and a
  real notification needs a push server. The phone alarm above is the reminder.
- **No accounts, no server, no sync.** One phone, no cloud.
- **No New Testament.** Old Testament only, as asked.
