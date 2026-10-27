(function () {
  var P = (window.__probe = { ua: navigator.userAgent, fetch: {}, done: false });
  var out = document.getElementById('out');
  function show() { out.textContent = JSON.stringify(P, null, 1); }

  var URLS = {
    openmeteo: 'https://api.open-meteo.com/v1/forecast?latitude=-23.4205&longitude=-51.9333&current=temperature_2m',
    awesomeapi: 'https://economia.awesomeapi.com.br/json/last/USD-BRL',
    g1rss: 'https://g1.globo.com/rss/g1/',
    holidays: 'https://calendar.google.com/calendar/ical/en.brazilian%23holiday%40group.v.calendar.google.com/public/basic.ics',
    psn: 'https://m.np.playstation.com/api/trophy/v1/users/me/trophySummary'
  };

  function probeFetch(name) {
    return new Promise(function (resolve) {
      var ctl = typeof AbortController === 'function' ? new AbortController() : null;
      var timer = setTimeout(function () {
        P.fetch[name] = { ok: false, status: 0, error: 'timeout 8s' };
        if (ctl) ctl.abort();
        resolve();
      }, 8000);
      fetch(URLS[name], ctl ? { signal: ctl.signal } : {}).then(function (r) {
        clearTimeout(timer);
        P.fetch[name] = { ok: r.ok, status: r.status, error: null };
        resolve();
      }, function (e) {
        clearTimeout(timer);
        if (!P.fetch[name]) P.fetch[name] = { ok: false, status: 0, error: String(e) };
        resolve();
      });
    });
  }

  function sysinfo(prop) {
    return new Promise(function (resolve) {
      try {
        tizen.systeminfo.getPropertyValue(prop, function (v) {
          resolve({ value: JSON.parse(JSON.stringify(v)), keys: Object.keys(v) });
        }, function (e) { resolve({ error: String((e && (e.name + ': ' + e.message)) || e) }); });
      } catch (e) { resolve({ error: String(e) }); }
    });
  }

  var cv = document.getElementById('cv'), ctx = cv.getContext('2d');
  cv.width = Math.round(1920 * 0.6); cv.height = Math.round(1080 * 0.6);

  var BLOBS = [
    { c: [92, 60, 255], x: .18, y: .2, r: .55, sx: .11, sy: .07, p: 0 },
    { c: [0, 194, 168], x: .82, y: .3, r: .5, sx: .08, sy: .1, p: 2 },
    { c: [255, 61, 139], x: .5, y: .85, r: .5, sx: .12, sy: .06, p: 4 },
    { c: [120, 120, 120], x: .72, y: .12, r: .45, sx: .07, sy: .05, p: 1 }
  ];

  function makeGrid(COLS, ROWS) {
    var pts = [];
    for (var y = 0; y <= ROWS; y++) for (var x = 0; x <= COLS; x++) {
      var edge = x === 0 || y === 0 || x === COLS || y === ROWS;
      pts.push({ bx: x / COLS, by: y / ROWS, jx: edge ? 0 : (Math.random() - .5) * .7 / COLS, jy: edge ? 0 : (Math.random() - .5) * .7 / ROWS, ph: Math.random() * 6.28, sp: .25 + Math.random() * .35, h: Math.random() });
    }
    return pts;
  }

  function colorAt(u, v, t) {
    var r = 10, g = 9, b = 18;
    BLOBS.forEach(function (bl) {
      var cx = bl.x + Math.sin(t * .00015 + bl.p) * bl.sx, cy = bl.y + Math.cos(t * .00012 + bl.p) * bl.sy;
      var dx = (u - cx) * 1.6, dy = v - cy, d = Math.sqrt(dx * dx + dy * dy) / bl.r;
      var w = Math.max(0, 1 - d); w = w * w * .9;
      r += bl.c[0] * w; g += bl.c[1] * w; b += bl.c[2] * w;
    });
    return [Math.min(255, r), Math.min(255, g), Math.min(255, b)];
  }

  function drawFrame(pts, COLS, ROWS, t) {
    var W = cv.width, H = cv.height, P2 = pts.map(function (p) {
      return [(p.bx + p.jx + Math.sin(t * .0004 * p.sp + p.ph) * .18 / COLS) * W, (p.by + p.jy + Math.cos(t * .0005 * p.sp + p.ph) * .18 / ROWS) * H, p.h];
    });
    ctx.clearRect(0, 0, W, H);
    for (var y = 0; y < ROWS; y++) for (var x = 0; x < COLS; x++) {
      var i0 = y * (COLS + 1) + x, a = P2[i0], b = P2[i0 + 1], c = P2[i0 + COLS + 1], d = P2[i0 + COLS + 2];
      var tris = (x + y) % 2 ? [[a, b, d], [a, d, c]] : [[a, b, c], [b, d, c]];
      tris.forEach(function (tr) {
        var u = (tr[0][0] + tr[1][0] + tr[2][0]) / 3 / W, v = (tr[0][1] + tr[1][1] + tr[2][1]) / 3 / H;
        var col = colorAt(u, v, t);
        var lit = .72 + ((tr[0][2] + tr[1][2] * .6 - tr[2][2] * .8) * .22) + Math.sin(t * .0006 + u * 6 + v * 4) * .05;
        ctx.fillStyle = 'rgb(' + (col[0] * lit | 0) + ',' + (col[1] * lit | 0) + ',' + (col[2] * lit | 0) + ')';
        ctx.beginPath(); ctx.moveTo(tr[0][0], tr[0][1]); ctx.lineTo(tr[1][0], tr[1][1]); ctx.lineTo(tr[2][0], tr[2][1]); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = ctx.fillStyle; ctx.lineWidth = .6; ctx.stroke();
      });
    }
  }

  function bench(COLS, ROWS) {
    return new Promise(function (resolve) {
      var pts = makeGrid(COLS, ROWS), frames = 0, start = null;
      function step(t) {
        if (start === null) start = t;
        drawFrame(pts, COLS, ROWS, t);
        frames++;
        if (t - start >= 10000) resolve(Math.round(frames / ((t - start) / 1000) * 10) / 10);
        else requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    });
  }

  var names = Object.keys(URLS);
  Promise.all(names.map(probeFetch)).then(function () {
    show();
    return sysinfo('WIFI_NETWORK');
  }).then(function (w) {
    P.wifi = w;
    return sysinfo('VIDEOSOURCE');
  }).then(function (v) {
    P.videosource = v;
    show();
    return bench(18, 11);
  }).then(function (f) {
    P.fps18x11 = f;
    return bench(12, 7);
  }).then(function (f) {
    P.fps12x7 = f;
    P.done = true;
    show();
  });
}());
