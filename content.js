// YTMusic Awaker - Content Script (runs in MAIN world)
(function () {
  'use strict';

  console.log(
    '%c YTMusic Awaker %c Render protection initialized ',
    'background: #22c55e; color: #000; font-weight: bold; border-radius: 3px 0 0 3px; padding: 2px 6px;',
    'background: #27272a; color: #fff; border-radius: 0 3px 3px 0; padding: 2px 6px;'
  );

  // Стан для моніторингу та індикатора
  const state = {
    active: true,
    startTime: Date.now(),
    pingsCount: 0,
    lastPingTime: null
  };

  // Доступ до стану через консоль (F12 -> window.__ytmusicAwaker)
  window.__ytmusicAwaker = state;

  // 1. Підміна Page Visibility API, щоб YouTube Music вважав, що вкладка завжди активна і на передньому плані
  try {
    Object.defineProperty(document, 'hidden', {
      get: () => false,
      configurable: true
    });

    Object.defineProperty(document, 'visibilityState', {
      get: () => 'visible',
      configurable: true
    });

    Object.defineProperty(document, 'webkitVisibilityState', {
      get: () => 'visible',
      configurable: true
    });

    Object.defineProperty(document, 'hasFocus', {
      value: () => true,
      configurable: true
    });
  } catch (e) {
    console.warn('[YTMusic Awaker] Помилка перезапису властивостей видимості:', e);
  }

  // 2. Блокування події visibilitychange, щоб сторінка не переходила в сплячий стан
  const originalAddEventListener = EventTarget.prototype.addEventListener;
  EventTarget.prototype.addEventListener = function (type, listener, options) {
    if (type === 'visibilitychange' || type === 'webkitvisibilitychange') {
      const wrappedListener = function (event) {
        if (document.visibilityState === 'hidden') {
          return;
        }
        return typeof listener === 'function' ? listener.apply(this, arguments) : listener.handleEvent(event);
      };
      return originalAddEventListener.call(this, type, wrappedListener, options);
    }
    return originalAddEventListener.call(this, type, listener, options);
  };

  // 3. Створення візуального індикатора на самій сторінці YouTube Music
  let indicatorEl = null;
  let indicatorTextEl = null;
  let indicatorTooltipEl = null;

  function createVisualIndicator() {
    if (document.getElementById('ytm-awaker-indicator')) return;

    indicatorEl = document.createElement('div');
    indicatorEl.id = 'ytm-awaker-indicator';
    indicatorEl.innerHTML = `
      <style>
        #ytm-awaker-indicator {
          position: fixed;
          bottom: 92px;
          right: 20px;
          z-index: 999999;
          display: flex;
          align-items: center;
          gap: 7px;
          background: rgba(18, 18, 18, 0.82);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 20px;
          padding: 5px 11px;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          font-size: 11px;
          font-weight: 500;
          color: #e4e4e7;
          box-shadow: 0 4px 14px rgba(0, 0, 0, 0.4);
          cursor: pointer;
          user-select: none;
          transition: all 0.25s ease;
        }
        #ytm-awaker-indicator:hover {
          background: rgba(28, 28, 30, 0.95);
          border-color: rgba(34, 197, 94, 0.45);
          box-shadow: 0 4px 18px rgba(34, 197, 94, 0.18);
        }
        #ytm-awaker-indicator .dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background-color: #22c55e;
          box-shadow: 0 0 6px #22c55e;
          flex-shrink: 0;
          animation: ytm-pulse 2.2s infinite ease-in-out;
        }
        @keyframes ytm-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.45; transform: scale(0.85); }
        }
        #ytm-awaker-indicator.minimized .label {
          display: none;
        }
        #ytm-awaker-indicator.minimized {
          padding: 7px;
          border-radius: 50%;
        }
      </style>
      <div class="dot"></div>
      <span class="label">Awaker: Active (<span id="ytm-awaker-pings">0</span>)</span>
    `;

    // Клік для згортання в маленьку круглу крапку, щоб не заважати
    indicatorEl.addEventListener('click', () => {
      indicatorEl.classList.toggle('minimized');
    });

    indicatorTextEl = indicatorEl.querySelector('#ytm-awaker-pings');
    document.body.appendChild(indicatorEl);
    updateTooltip();
  }

  function updateTooltip() {
    if (!indicatorEl) return;
    const minutes = Math.floor((Date.now() - state.startTime) / 60000);
    indicatorEl.title = `YTMusic Awaker is Active\n• Render protected from tab eviction\n• Pings sent: ${state.pingsCount}\n• Uptime: ${minutes} min\n(Click to collapse/expand)`;
  }

  // 4. Keepalive активності рендера (Canvas & Micro-paint ping)
  let pingCanvas = null;
  let pingCtx = null;

  function initPingCanvas() {
    pingCanvas = document.createElement('canvas');
    pingCanvas.width = 1;
    pingCanvas.height = 1;
    pingCanvas.style.position = 'fixed';
    pingCanvas.style.top = '-100px';
    pingCanvas.style.left = '-100px';
    pingCanvas.style.opacity = '0.001';
    pingCanvas.style.pointerEvents = 'none';
    pingCtx = pingCanvas.getContext('2d');
  }

  function keepAlivePing() {
    try {
      if (!pingCanvas) {
        initPingCanvas();
        if (document.body) {
          document.body.appendChild(pingCanvas);
        }
      }

      // Легкий рендер-пінг без навантаження на процесор (малювання 1 пікселя)
      if (pingCtx) {
        pingCtx.fillStyle = pingCtx.fillStyle === '#000000' ? '#000001' : '#000000';
        pingCtx.fillRect(0, 0, 1, 1);
      }

      // Читання метрики для скидання прапорця пасивного рендеру
      if (document.body) {
        void document.body.offsetHeight;
      }

      state.pingsCount++;
      state.lastPingTime = new Date().toLocaleTimeString();

      if (indicatorTextEl) {
        indicatorTextEl.textContent = state.pingsCount;
      }
      updateTooltip();
    } catch (e) {
      // Ігноруємо помилки, якщо DOM ще не готовий
    }
  }

  // Періодичний запуск кожні 15 секунд
  setInterval(keepAlivePing, 15000);

  // Створення індикатора при завантаженні сторінки
  function init() {
    createVisualIndicator();
    keepAlivePing();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
