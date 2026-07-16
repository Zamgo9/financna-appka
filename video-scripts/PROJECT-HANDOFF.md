# PROJECT HANDOFF — "Stock Picking" YouTube Video

> Read this first when continuing the project in a new chat. It contains the full
> state of the work: what exists, how it was built, what the user wants, and what
> is still open.

---

## 1. The project in one paragraph

The user (Samuel, Slovak, repo `Zamgo9/financna-appka`) is producing an **~8-minute
YouTube video about individual stock picking** — why it is or isn't a good idea.
The video is built as **75 short animated shots** (each ≤ 7–10 s, one narration
sentence per shot) across **9 scenes**, totaling exactly **8:00**. Everything is
designed in a single self-contained HTML animatic and exported to per-shot MP4
files (1920×1080, 30 fps, H.264) named like `S1 - F1.mp4`.

**All work goes on git branch `claude/stock-picking-video-script-b28v27`.**
Never push to another branch. No PRs unless explicitly asked.

---

## 2. Deliverables that already exist (all in `video-scripts/`, committed & pushed)

| File | What it is |
|---|---|
| `stock-picking-script.md` | Full director's script: 75 frames, 9 scenes, timecodes, narration + per-frame animation directions, production notes, thumbnail ideas. |
| `stock-picking-voiceover-tts.txt` | Clean narration text to paste into a TTS AI. Numbers spelled out for speech ("S and P Global", "fifteen years"). One paragraph per frame, blank line between scenes. |
| `full-video-animatic.html` | **THE canonical design file.** Complete 75-shot animated animatic, self-contained (no external resources). Open in a browser to play/review. Published as a Claude artifact: https://claude.ai/code/artifact/dd5d2a25-551a4478-96bd-794db05de95b (see §6 for exact URL note). |
| `scene1-animatic.html` | Original 6-shot Scene 1 prototype. **SUPERSEDED** — does not contain later fixes. Keep only for history. |
| `render-frames.js` | Node renderer (playwright-core + ffmpeg) that exports shots to MP4 deterministically. Currently configured for shots 0–5 (Scene 1). See §5. |
| `PROJECT-HANDOFF.md` | This file. |

Already delivered to the user: **6 MP4s of Scene 1** (`S1 - F1.mp4` … `S1 - F6.mp4`),
verified h264 High / yuv420p / 1920×1080 / 30fps, durations 7/5/4/6/6/7 s, with
burned-in captions.

---

## 3. Video structure

- **75 shots, 9 scenes, exactly 8:00.**
- Scene start shot-indices (0-based): `[0, 6, 12, 18, 30, 43, 54, 61, 68]`
- Per-shot durations in seconds (index 0–74):
  ```
  7,5,4,6,6,7,  4,6,6,5,6,8,  5,7,6,6,6,10,  5,7,7,7,5,7,7,6,6,7,7,9,
  5,7,7,7,6,7,7,4,6,7,7,7,8,  6,5,7,7,7,6,7,7,7,6,10,  5,6,6,6,6,7,9,
  7,5,7,7,7,6,6,  5,6,6,7,6,5,5
  ```
- File naming is scene-relative: shot 6 = `S2 - F1.mp4`, shot 74 = `S9 - F7.mp4`.
- Scenes: 1 Cold open (Amazon $1k→$2M hook) · 2 The seduction · 3 The math against
  you (SPIVA) · 4 Bessembinder / skewness · 5 Behavior gap & psychology · 6 The
  case FOR picking · 7 Costs/taxes/time · 8 The verdict (fork in the road) ·
  9 Practical playbook + outro.
- Facts cited on-screen with source tags: **SPIVA** (~90 % of large-cap funds
  underperform over 15 y), **Bessembinder 2018** (4 % of stocks = all net wealth
  creation), **Morningstar "Mind the Gap"**, **Barber & Odean 2000**.

### Color grammar (consistent everywhere)
- GOLD `#f5b301` = rare winners
- GREEN `#22c55e` = pro-picking / smart
- RED `#ef4444` = anti-picking / stupid
- PURPLE `#863bff` = brand color (from repo `dist/favicon.svg`) — titles/verdict
- Amazon orange `#ff9900` for the Amazon smile logo (shots 1–2)

---

## 4. How the animatic HTML works (so you can edit it)

- One `<div class="frame">` per shot; JS timeline engine advances `t` and toggles
  `.is-active`. Playing a shot restarts its CSS animations.
- **Animation toolkit:** elements use `data-anim` (rise, drop, pop, slam, left,
  right, fade, grow, draw, fall, zoom, spinup) with CSS vars `--d` (delay) and
  `--dur`. The active-frame rule uses `animation-fill-mode: both` —
  **critical: never use `backwards`**, it caused end-state snap-back (card
  flipping back, bars rising back up). All one-shot animations must end with
  `both`.
- JS-built components via `data-build` (dots grid, tiles, falling figures, crowd)
  and `.count` count-up elements (`data-from/to/start/end/prefix/suffix`).
- **URL parameters:**
  - `?f=N` — jump to shot N (0–74)
  - `&play=1` — autoplay
  - `&bare=1` — fullscreen video-only mode (no UI chrome) for export
  - `&cap=1` — burn captions into bare mode
- **Export hook** (already in the file):
  ```js
  window.__shots = { START, DUR, TOTAL };            // ms arrays
  window.__renderSeek = function(fi, ms) { ... };     // seeks shot fi to exact ms:
  // pauses playback, then document.getAnimations() -> pause() + currentTime=ms,
  // and seeks counters — makes rendering fully deterministic (no dropped frames).
  ```
- The on-screen HUD ("SCENE 01 · COLD OPEN", "SHOT 1/75") was **removed from all
  frames** at the user's request. Do not reintroduce it.

---

## 5. Render pipeline (how MP4s are made)

Screen-recording is NOT used (drops frames). Instead, deterministic frame-by-frame:

1. Headless Chromium (playwright-core, `executablePath: '/opt/pw-browsers/chromium'`,
   `--no-sandbox`, viewport 1920×1080) loads `full-video-animatic.html?bare=1&cap=1&f=0`.
2. For each output frame `j`: `page.evaluate(([fi,ms]) => window.__renderSeek(fi,ms), [shot, j*1000/30])`,
   then `page.screenshot({type:'png', clip:{x:0,y:0,width:1920,height:1080}})`.
3. PNGs are piped straight into ffmpeg:
   `-f image2pipe -framerate 30 -i - -c:v libx264 -preset medium -crf 18 -pix_fmt yuv420p -movflags +faststart OUT.mp4`

Environment gotchas discovered (cloud container):
- Playwright's bundled ffmpeg is **VP8/WebM-only** — unusable for MP4.
- `npm i ffmpeg-static` fails (binary download blocked by proxy).
- Working ffmpeg came from `pip3 install imageio-ffmpeg --break-system-packages`;
  binary at `/usr/local/lib/python3.11/dist-packages/imageio_ffmpeg/binaries/ffmpeg-linux-x86_64-v7.0.2`.
- `playwright-core` installed via npm in a scratch dir; browsers are pre-installed
  (`PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers`) — never run `playwright install`.
- Throughput: ~0.3–0.7 s per rendered frame single-threaded. Full video ≈ 14,400
  frames. A 3-worker parallel variant (`render_all.js`, 3 pages sharing one
  browser, queue of 75 shots, scene-relative `nameFor(i)`) was written in the
  scratchpad but the user **stopped that render mid-run** — the full-video render
  was never completed or delivered.

The user has **Python on their PC** and asked about it; agreed approach ("Option
A"): HTML animatic stays the design source; a Python-installable export pipeline
for their PC is a **standing offer, not yet built** (Python + playwright +
imageio-ffmpeg would mirror the Node renderer 1:1 via the same `__renderSeek` hook).

---

## 6. Design decisions & user corrections already applied (do not undo)

1. Captions/subtitles made smaller: `font-size: clamp(10px, 1.7vw, 13px)`.
2. **Shot 1** (S1-F1): Amazon wordmark+smile top-left; "$1,000 / 1997" bottom-left;
   curved arrow points **at the final amount**; counter $1,000 → $2,000,000+ top-right.
3. **Shot 2** (S1-F2): detailed phone (notch, status bar, side buttons) → home
   screen → tap on purple BROKER app → splash → portfolio showing **NET WORTH
   counting to $2M** with AMZN row and green chart.
4. **Shot 3** (S1-F3): card does **one flip** to the red side and stays there.
5. **Shot 4** (S1-F4): red bar sinks **once and stays down**.
6. **Shot 5** (S1-F5): lightbulb with lightning-bolt emanation; slot machine with
   3 reels rolling to **jackpot 7-7-7** with lever pull.
7. **Shot 6** (S1-F6): title "STOCK PICKING" at top, **STUPID (red) on the left,
   SMART (green) on the right**, forked road between them. Road SVG must use
   `preserveAspectRatio="xMidYMax meet"` (`slice` cropped the fork — this bug also
   existed in shot 61 and was fixed in both).
8. HUD overlay removed from all 75 frames.
9. Artifact URLs: full animatic https://claude.ai/code/artifact/dd5d2a25-551a-4478-96bd-794db05de95b ,
   old Scene 1 prototype https://claude.ai/code/artifact/94fe2133-0e37-4138-aad0-4d8db229ce22 .

---

## 7. Open / pending work

- [ ] **Full-video MP4 render** of all 75 shots into a folder named
      **"animation - stock picking"** (files `S1 - F1.mp4` … `S9 - F7.mp4`).
      Started, then stopped by the user mid-run. 3 partial/corrupt files may
      linger in old scratchpads — always delete/overwrite before re-running.
      Delivery method: zip the folder and send it (an assistant cannot write to
      the user's PC directly).
- [ ] **Python exporter for the user's PC** (standing offer, user has Python):
      script using playwright + imageio-ffmpeg that renders any/all shots from
      `full-video-animatic.html` via `__renderSeek`.
- [ ] Possible **next batch of visual corrections** — the user reviews scene by
      scene and sends fix lists; expect more for Scenes 2–9.
- [ ] Eventually: voiceover (user does TTS themselves from the .txt), music/SFX,
      final edit — outside current scope unless asked.

---

## 8. Working agreements with the user

- User writes in casual English (Slovak native), often from mobile; keep replies
  practical and short.
- Iterative review loop: build → user reviews the artifact/MP4s → sends a numbered
  list of fixes → apply exactly, commit, push.
- Scene 1's look & workflow were approved as the template ("the first scene is
  perfect so keep the workflow").
- Branch: `claude/stock-picking-video-script-b28v27`, push with
  `git push -u origin <branch>`. Commit messages: clear + descriptive.
- Repo also contains the user's Vite finance app (`dist/` etc.) — **do not touch**
  anything outside `video-scripts/`.
