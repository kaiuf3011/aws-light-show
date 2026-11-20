# 300 Phones, One Button: AWS Live Light Show

UI direction: the terminal (graphite neutrals, AWS orange accent, JetBrains Mono, ASCII block letters), designed following [unslop](https://github.com/heydamir/unslop) by Damir Sokolovsky (@heydamir), CC BY 4.0. JetBrains Mono is bundled under the SIL Open Font License.

The audience scans a QR code and their phones join the show. You press one button and every phone in the hall lights up together, controlled through AWS.

```
 Phones / projector / your control panel
            │  (WebSocket, real-time)
            ▼
   API Gateway  ──►  Lambda  ──►  DynamoDB
   (the waiter)     (the chef)    (the fridge: who's connected)

   Website: S3 (the menu) delivered worldwide by CloudFront
```

---

## ⚠️ Do these TODAY (things that take time)

1. **Lambda concurrency limit.** New accounts sometimes get a limit of only 10.
   In the AWS Console, search **Service Quotas** → AWS services → **AWS Lambda** → *Concurrent executions*.
   Make sure the **Region (top right) is Asia Pacific (Mumbai)**.
   If "Applied quota value" is **below 1000**, click **Request increase** and ask for **1000**. It's free, but approval can take hours.
2. **Billing alarm.** Search **Billing and Cost Management** → **Budgets** → *Create budget* → *Zero spend budget*.
   You get an email if anything costs money. (This demo should cost a few rupees at most.)

---

## 🚀 Deploy (about 10 minutes, no installs needed)

1. Log into the AWS Console. Set the region (top right) to **Asia Pacific (Mumbai) ap-south-1**.
2. Click the **CloudShell** icon `>_` in the top bar. A terminal opens in your browser.
3. In CloudShell: **Actions → Upload file** → choose `aws-light-show.zip`.
4. Run:
   ```bash
   unzip -o aws-light-show.zip && cd aws-light-show && ./deploy.sh
   ```
5. Wait about 5 minutes. At the end it prints your **3 links + admin key**. Save them in your notes.

**If it fails with a CloudFront "account must be verified" error** (this happens on brand-new accounts):
```bash
./destroy.sh
NO_CDN=1 ./deploy.sh
```
That version skips CloudFront and serves the site directly from S3. It works the same, but the link starts with `http://`.

---

## ✏️ Customise

Edit `web/show-config.js` (in CloudShell: `nano web/show-config.js`, save with Ctrl+O then Enter, exit with Ctrl+X):
- `joinUrl`: your club's Google Form / WhatsApp link (the finale sends every phone here)
- `departments`: your college's department names and colours

Then upload just the website (about 20 seconds):
```bash
./deploy.sh web
```

---

## 🧪 Rehearse with 300 fake phones

In CloudShell (a second tab works well: **Actions → New tab**):
```bash
cd aws-light-show/dev && npm install && node fake-phones.mjs 300
```
Now open the **projector screen** link and the **control panel** link on your laptop/phone. The counter goes to 300. Press buttons and the terminal shows how many fake phones received each effect **before** its start time. That number should be 300/300.

Then do a real test with 10–30 friends on their phones.

---

## 📺 Using a TV instead of a projector

`screen.html` works on any big display. Best to worst:
1. **HDMI cable from your laptop to the TV** (most reliable, no delay). Open `screen.html` in the laptop browser and press F11 for fullscreen.
2. **Cast from your laptop:** in Chrome, ⋮ → *Cast…* → pick the TV (Android TV / Chromecast). On Windows you can also try Win+K (Miracast). Expect up to about 1 s of delay on the TV; the phones are unaffected.
3. **The TV's own browser:** type the `…/screen.html` link with the remote. Works on many smart TVs, but some built-in browsers are old.

**People at the back can't scan a QR code off a TV.** Open `…/qr.html`, print 10–20 copies, and put them on seats, walls and the entrance, or have volunteers hold them up. Also read the short link out loud.

## 🎤 On stage: what to open

| Device | Open |
|---|---|
| Laptop on the projector | `…/screen.html`, fullscreen (F11 / Ctrl+Cmd+F) |
| **Your phone** (the "one button") | `…/control.html?key=YOURKEY` |
| Laptop tab #2 (behind-the-scenes part) | AWS Console → Lambda → your function → **Monitor** tab, and CloudShell |

**Tip:** control the whole show from your phone while standing on stage. *"I'm controlling 300 phones… from my phone."*

### Button order (on the control panel)
1. **5-4-3-2-1** → the hall counts down, then flashes white and red
2. **All RED** → **Rainbow** (colour rolls across the hall left → right)
3. **🌊 Wave**: light sweeps left → middle → right
4. **✨ Stars**: random phones twinkle like a night sky (best moment: keep the lights fully off)
5. **❤️ Heartbeat**
6. **⚡ START POWER-UP**: the projector goes black and every phone becomes a big TAP button.
   *"The projector has no power. YOU are the power. Tap!"* The poster lights up (and flickers like a weak bulb)
   as the crowd taps. At 100% it hits **FULL POWER**: the poster blazes and every phone flashes white automatically.
   Choose the difficulty from the dropdown (Normal is about 20 seconds with a full hall).
   To use your own poster: put the image in `web/` (e.g. `web/poster.jpg`), set `poster: 'poster.jpg'` in `web/show-config.js`, then run `./deploy.sh web`.
7. **🪢 TUG OF WAR**: pick 30/45/60 seconds and start. Every phone is randomly put on **TEAM RED** or **TEAM BLUE** (a fresh coin flip each round).
   Phones count down 3-2-1, then everyone hammers **PULL!** The rope moves live on the TV. Biggest lead at the buzzer wins, or a knock-out.
   **After the result** (all automatic): winners' phones show 🏆, losers' show GG → each phone shows *"you pulled 54 times, AWS counted every single one"*
   → the curiosity hook: *"How did AWS count 4,429 pulls from 300 phones without missing one? Spoiler: there is no server."*
   The TV shows **RED WINS**, then the stats reveal: pulls · phones · seconds · **0 servers**.
   **Your line while the hook is on screen:** *"Zero servers. Want to know how? That's what we'll build in the club."* Edit the hook text in `web/show-config.js` (`tugTeaser`).
8. **Team colours**, then each department's **📣 spotlight**: *"CSE, make some noise!"*
9. **Remote friends:** the screen shows "🌍 Also live from Dubai…". Fire **All BLUE** and say *"Dubai just lit up at the same second."*
10. **■ ALL OFF**, then explain how it works
11. **🚀 JOIN THE AWS CLUB**: every phone shows the join button

⚡ **Strobe:** announce it first ("flashing lights coming, look away if sensitive"). It's capped at 3 flashes/sec for photosensitivity safety.

---

## 🗣️ 15-minute script

**0:00 Hook.** "Hands up if you've used ChatGPT. AI can write code in seconds. But can AI put an app into the hands of 300 people *right now*, live? Let's find out. Take out your phones."

**0:02 Join.** Point at the QR code. The counter climbs: "47… 120… 250. That's 250 phones talking to Amazon's servers in Mumbai right now."

**0:04 Lights off.** "Brightness up. Phones facing the stage." Start the countdown and run the light show (button order above).

**0:09 Global twist.** Remote friends appear on screen. One button lights the hall and other cities at the same second.

**0:11 Behind the scenes.** ALL OFF. Show the diagram:
- **API Gateway = the waiter.** It holds a live connection to every phone.
- **Lambda = the chef.** It cooks only when an order comes in. No server running all day.
- **DynamoDB = the fridge.** It remembers who's connected.
- **S3 + CloudFront = the menu.** It delivers the website from the nearest location.

Switch to the Lambda **Monitor** tab and show the invocation spike. "I don't own a single server. It scaled to all of you by itself. This whole show costs less than a cup of chai."

**0:14 Close.** "AI wrote some of this code. But AI can't design, deploy and scale a system like this for you. That's cloud engineering, and that's what this club teaches." Press **JOIN THE AWS CLUB**. Every phone shows the join button.

---

## 🛟 If something goes wrong on stage

- **Phones not joining:** ask students to switch from college Wi-Fi to **mobile data**.
- **Show freezes:** press **ALL OFF** and then the effect again. Phones auto-reconnect.
- **Total failure:** play your **backup video** (record a rehearsal with friends on the 19th!) and say "here's what it looked like in rehearsal". Then explain the architecture as planned.
- Keep a **hotspot** ready for your own laptop and phone.

## 🧹 After the event

```bash
cd aws-light-show && ./destroy.sh
```
This deletes everything, so nothing can cost money later. (Or keep it for the first club session and let members explore it!)

---

## Files

| Path | What |
|---|---|
| `template.yaml` | All AWS resources (infrastructure as code) |
| `backend/index.mjs` | Lambda: joins, clock sync, stats, broadcasting effects |
| `web/index.html` | Phone page (what students see) |
| `web/screen.html` | Projector screen: QR code, live counter, department bars |
| `web/control.html` | Your control panel |
| `web/effects.js` | All light effects (time-synced) |
| `web/show-config.js` | ✏️ Departments, colours, club link |
| `dev/fake-phones.mjs` | Simulates hundreds of phones for rehearsal |
| `dev/local-server.mjs` | Run the whole show on your laptop without AWS (preview) |

**How phones stay in sync:** each phone measures the clock difference to AWS (like how GPS and NTP work). Every effect is sent with a start time 1.2 seconds in the future, so all phones fire at the same instant even if the message reached some of them later.
