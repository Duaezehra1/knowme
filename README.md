# KnowMe

**A passport for children who can't explain themselves.** Parents write down how their child communicates, what calms them and what upsets them. Any carer (a teacher, a babysitter, a nurse, or a stranger who finds a lost child) can then ask KnowMe what the child needs and get the parent's own advice in seconds, even with no internet.

**Live web app:** https://knowme-passport.web.app

Built for the **#BuildHybridAI 2026** hackathon with **Firebase AI Logic hybrid inference** on three surfaces: a web app (installable, offline), a Chrome extension (side panel) and an Android app.

---

## The problem

About 1 in 127 people are autistic ([WHO, 2025](https://www.who.int/news-room/fact-sheets/detail/autism-spectrum-disorders)), and 25–35% of autistic children are minimally verbal ([Rose et al., 2016](https://pubmed.ncbi.nlm.nih.gov/27120989/)). Usually only one or two adults understand such a child's signals. Everyone else is left guessing:

- 49% of autistic children try to wander off after age 4, and half of those go missing ([Anderson et al., *Pediatrics* 2012](https://www.sciencedaily.com/releases/2012/10/121008082650.htm)).
- Hospital staff report a lack of confidence caring for children with learning disabilities ([NIHR, 2018](https://evidence.nihr.ac.uk/alert/general-hospital-care-for-children-with-learning-disabilities-has-scope-for-improvement)).
- Paper "communication passports" are rarely to hand and, in one study, did not improve communication ([NIHR SSCR](https://sscr.nihr.ac.uk/communication-passports)).

## What KnowMe does

| Feature | How it works |
|---|---|
| **Guided interview** | One friendly question per section (how I communicate, what calms me, pain signs, medical, safety…) with tap-to-fill examples. Answers save instantly. |
| **Paste or share a report** | Paste a therapist's report, or share text from any app or right-click any web page. On-device AI pulls out each fact; the parent approves every one. |
| **Situation buttons** | A carer taps "Crying", "Hurt or unwell" or "Toilet" and sees the parent's advice instantly. |
| **Ask** | Type what you see ("he's hitting his ear and saying ow-ee"). Matching entries appear at once; a short AI answer follows, using only the passport. |
| **Emergency** | Words like "not breathing" or "ran off" skip AI entirely and open the emergency screen with call buttons and safety notes. |
| **Flashcards** | "Get to know Sam in a minute": flip cards with the most important things. |
| **Carer view** | Hand the phone to a babysitter: read and ask only, nothing to edit. |
| **QR card** | The card's text is stored *inside* the QR code, so any phone camera can read it with no app and no internet. |

## Hybrid AI: what runs where

| Job | On the device | Cloud (only if the parent turns on "cloud help") |
|---|---|---|
| Organise notes into entries | Gemini Nano (Chrome built-in, or Android AICore) | Gemini Flash-Lite, after removing names and phone numbers |
| Answer a carer's question | Gemini Nano, using only matching entries | Same, with names removed and **never** the Medical section |
| Find matching entries | Plain code (keywords + synonyms), instant | — |
| Emergency detection | Plain code, no AI | — |

- **Privacy first:** routing is explicit. KnowMe uses `ONLY_ON_DEVICE` when Gemini Nano is available and `ONLY_IN_CLOUD` only when the parent has allowed cloud help, with redaction. If neither is possible, offline search still works.
- **Smart switch on slow devices:** on laptops without a graphics card Gemini Nano can take a minute. If on-device AI fails, or is still working after 8 seconds, and cloud help is on, all three apps bring in the cloud (names removed) and say why. Answers: the first useful one wins. Find the facts: the parts Nano hasn't finished are read in the cloud side by side, so a page of notes takes seconds, not minutes.
- **No invented facts:** every AI-organised entry must quote the parent's own words (checked in code), and every answer is shown with the entries it used.
- **Every answer is labelled** with its source: on this device, in the cloud, or straight from the passport (`inferenceSource`).

## Firebase

- **Firebase AI Logic** with hybrid inference: web SDK (`getGenerativeModel` with `InferenceMode`) and Android SDK (`firebase-ai` + `firebase-ai-ondevice`, `OnDeviceConfig`)
- **App Check** enforced on AI Logic: reCAPTCHA Enterprise on the website, Play Integrity registered for Android, and debug providers for development builds (web debug token, Android `DebugAppCheckProviderFactory`). The judging builds of the APK and the extension each carry their own registered debug token, which is revoked after judging; the tokens are never in this repository.
- **Fast cloud answers**: `gemini-3.5-flash-lite` with minimal thinking. The JSON shape is given in the prompt rather than as a response schema, which cut cloud answers from 10 to 26 seconds down to about 2. A 30-second limit means a carer is never left waiting: the parent's notes are always on screen first.
- **Hosting** for the web app, with a service worker so it works offline
- Shared rules file `shared/knowme.json` (sections, situations, emergency phrases, synonyms, AI prompts) used by every platform

## Try it in one minute (for judges)

Every platform has a **"Just looking? Try a demo child"** button on its first screen. It opens a full passport for Sam, a made-up 7-year-old, with Cloud help already on (no real child's data is ever involved).

### Web app (any browser)

1. Open **https://knowme-passport.web.app** and tap **Just looking? Try a demo child**.
2. Tap **Ask about Sam**, then **Crying or upset**. The parent's notes appear at once, and a short AI answer follows, labelled with where it ran.
3. Type `he keeps hitting his ear`, then `he ran off`. Emergency words skip AI and open the emergency screen.
4. Tap **Hand to a carer** for the babysitter view and flashcards, and **QR card** to scan the card with another phone's camera.

In desktop Chrome with Gemini Nano, answers say **"Answered on this device"**. Anywhere else they say **"Answered in the cloud, names removed"**. If Nano is slow on a laptop, the cloud steps in after 8 seconds.

### Android app

1. On an Android phone, download **[knowme-android.apk](https://github.com/Duaezehra1/knowme/releases/latest/download/knowme-android.apk)** from the latest release and install it (allow installs from your browser when asked).
2. Tap **Just looking? Try a demo child**, then try **Ask** as above.

On phones with Gemini Nano (for example Pixel 9 or 10, Galaxy S25) answers run **on the phone**. On every other phone they come **from the cloud, names removed**. The cloud is protected by **Firebase App Check**; this judging APK carries a registered App Check debug token so the cloud trusts it on any phone (the token is revoked after judging).

### Chrome extension

1. Download **[knowme-chrome-extension.zip](https://knowme-passport.web.app/downloads/knowme-chrome-extension.zip)** and unzip it.
2. Open `chrome://extensions`, turn on **Developer mode**, click **Load unpacked** and pick the unzipped folder.
3. Click the KnowMe icon to open the side panel. Select text on any page and right-click **Add to KnowMe passport**.

The extension is **hybrid** like the other two: Gemini Nano on laptops that have it, otherwise cloud help with names removed (only if the parent turned it on). App Check's reCAPTCHA cannot run inside extension pages, so this judging build carries its own registered App Check debug token instead (revoked after judging). An extension built from source without a token stays **on-device only**: on a laptop without Gemini Nano it shows the family's own notes straight away, with a link to the website for cloud answers.

**On-device AI in Chrome** needs desktop Chrome 139+, 22 GB free disk space, and a GPU with more than 4 GB VRAM or 16 GB RAM with 4+ CPU cores. Check `chrome://on-device-internals`. Without it, KnowMe still works.

## Run it yourself

### Web app and Chrome extension

```bash
cd web
npm install
cp .env.example .env.local      # fill in your Firebase web config
npm run dev                     # http://localhost:5173
npm run build:extension         # Chrome extension in web/dist-extension
```

Load the extension at `chrome://extensions` → Developer mode → Load unpacked → `web/dist-extension`. Click the KnowMe icon to open the side panel, or select text on any page and right-click **Add to KnowMe passport**.

### Android app

1. Register an Android app (`app.knowme.passport`) in your Firebase project and put its `google-services.json` in `android/app/`.
2. Open `android/` in Android Studio, or run `./gradlew assembleDebug`.
3. For cloud help on a debug build, open the app's **Settings → Developer: App Check debug token → Create token → Copy**, and add it in Firebase console → App Check → KnowMe Android → Manage debug tokens.
4. Optional, for a build to share with testers: put a registered debug token in `android/local.properties` as `knowme.judgeAppCheckToken=<token>`. Debug builds then use it on every phone (and hide the developer card). Revoke it in the console when testing ends. For the extension, the same goes in `web/.env.local` as `EXTENSION_APPCHECK_TOKEN=<token>` before `npm run build:extension`.

## Project structure

```
shared/knowme.json        Sections, situations, emergency phrases, synonyms, AI prompts (all platforms)
web/src/ai/               Hybrid model routing, organise, answer, offline search, redaction
web/src/screens/          Welcome, Home, Interview, Section, Ask, Emergency, QR card, Settings, Carer view
web/src/extension/        Chrome extension background worker and side-panel bridge
android/app/src/main/java/app/knowme/passport/   Android app (Kotlin, Jetpack Compose)
docs/                     User-testing guide
```

## Built during the hackathon

Everything in this repository was written during the #BuildHybridAI 2026 submission period (from November 21, 2026), with help from an AI coding assistant (Claude). A few small patterns (the App Check setup and the hybrid model configuration on the web) are adapted from the developer's earlier project, [Sus](https://github.com/Duaezehra1/sus-study-game).

## License

[Apache License 2.0](LICENSE)
