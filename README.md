# YTMusic Awaker

A lightweight Chromium browser extension (Google Chrome, Microsoft Edge, Brave, Opera, etc.) designed to prevent YouTube Music's page render eviction, DOM freezing, and white-screen lag when operating under heavy RAM usage or in background tabs.

---

## 🧐 The Problem

When system RAM usage is high, Chromium engines aggressively throttle background tabs:
1. **Compositor & Layer Eviction:** Chromium purges GPU texture buffers and cached layout layers for tabs with `document.hidden = true`.
2. **Polymer Component Teardown:** YouTube Music's SPA framework dismantles offscreen virtual lists and rendering trees when detecting background state.
3. **The Result:** Even though audio continues playing, switching back to YouTube Music results in a blank/white page requiring up to 2 minutes of unresponsiveness while the DOM tree is painfully rebuilt. Adding the site to browser "Never discard" settings only prevents process killing, not render eviction!

---

## ⚡ The Solution

**YTMusic Awaker** solves this at the root:
- Injects directly into the page context (`MAIN` world) before YouTube Music initializes.
- Spoofs the Page Visibility API (`document.hidden = false`, `document.visibilityState = 'visible'`).
- Intercepts and silences `visibilitychange` freeze events.
- Executes a featherweight micro-render ping every 15 seconds (1px offscreen canvas paint + layout touch) keeping the compositor alive with zero noticeable CPU footprint.

---

## 📊 Resource Footprint

- **Extension Memory Overhead:** ~5–15 MB RAM.
- **YouTube Music Tab Memory:** Remains at its standard ~350–650 MB without dropping textures into cold storage.
- **CPU Impact:** < 0.1% (pings run once every 15 seconds).

---

## 🟢 How to Verify It's Working (Status Indicators)

You have 3 instant ways to verify the extension is active and protecting your playback:

1. **On-Page Floating Badge:**
   Look at the bottom-right of your YouTube Music tab (above the player bar). You will see an unobtrusive dark pill badge:
   `● Awaker: Active (N)` with a pulsing green indicator.
   - The number in parentheses `(N)` counts the micro-render pings (increments every 15 seconds).
   - Hover over it to see detailed stats (number of keepalive pings, protection status, uptime).
   - Click it to minimize it into a tiny green dot if you want it out of sight.

2. **Browser Developer Console (F12):**
   - Open DevTools (`F12` or `Ctrl + Shift + I`) on YouTube Music.
   - You will see the initialization badge log: `[YTMusic Awaker] Protected render initialized`.
   - Type `__ytmusicAwaker` in the Console and press Enter to inspect live internal metrics:
     ```js
     { active: true, pingsCount: 42, startTime: ..., lastPingTime: "15:48:30" }
     ```

3. **Extension Popup:**
   - Click the extension icon in the browser toolbar to see the status overview.

---

## 🚀 Installation Guide

1. Open your browser's extensions manager:
   - **Chrome:** `chrome://extensions/`
   - **Edge:** `edge://extensions/`
   - **Brave:** `brave://extensions/`
2. Enable **"Developer mode"** (toggle in the top-right corner).
3. Click the **"Load unpacked"** button.
4. Select the project directory:
   `c:\Users\Кирилл\Documents\Проекты\ytmusic-awaker`
5. Open or refresh [music.youtube.com](https://music.youtube.com).
6. Look for the green `● Awaker: Active` badge in the bottom-right corner!
