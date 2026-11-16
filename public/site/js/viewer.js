/* public/js/viewer.js — the photo page (/photo/:slug) as a full-screen viewer.
 *
 * The photo fills the stage. A thumbnail strip (a column on the left on desktop,
 * a row at the bottom on phones) scrolls through the photos being browsed: the
 * thumb nearest the strip's centre line is the photo shown, and thumbs near it
 * ease outward. Details slides a card in from the right (a bottom sheet on
 * phones). Clicking the photo goes full screen. The URL follows the photo shown.
 */
(function () {
  var dataEl = document.getElementById("viewerData");
  var viewer = document.getElementById("viewer");

  if (!dataEl || !viewer) return;

  var DATA = JSON.parse(dataEl.textContent);
  var LIST = DATA.photos || [];
  var ICONS = DATA.icons || {};
  var QS = DATA.filterQuery ? "?" + DATA.filterQuery : "";

  var vStage = document.getElementById("vStage");
  var vRail = document.getElementById("vRail");
  var vTrack = document.getElementById("vTrack");
  var vPanel = document.getElementById("vPanel");
  var vDet = document.getElementById("vDet");
  var vDetTop = document.getElementById("vDetTop");
  var vHint = document.getElementById("vHint");

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var canHover = window.matchMedia("(hover: hover)").matches;
  var isPhone = function () { return window.innerWidth < 768; };

  var vPos = -1, vImgs = [], vThumbs = [], bumps = [];
  var detOpen = false, isFull = false;
  var railAnim = 0, momentum = 0;

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }

  function cur() { return LIST[vPos]; }

  // Size of the photo as shown (object-fit: contain) — for "is the pointer on the photo".
  function fitRect(p) {
    var r = vStage.getBoundingClientRect();
    var pw = p.w || 3, ph = p.h || 2;
    var s = Math.min(r.width / pw, r.height / ph), w = pw * s, h = ph * s;
    return { left: r.left + (r.width - w) / 2, top: r.top + (r.height - h) / 2, width: w, height: h };
  }

  function overPhoto(x, y) {
    var r = fitRect(cur());
    return x >= r.left && x <= r.left + r.width && y >= r.top && y <= r.top + r.height;
  }

  /* ── build: one <img> per photo in the stage, one thumb per photo in the strip ── */

  function build() {
    var stage = document.createDocumentFragment();
    var track = document.createDocumentFragment();

    LIST.forEach(function (p, k) {
      var img = document.createElement("img");
      img.alt = p.alt || p.title || "";
      img.draggable = false;
      img.decoding = "async";
      if (p.c) img.style.background = "transparent";
      stage.appendChild(img);

      var b = document.createElement("button");
      b.type = "button";
      b.dataset.k = k;
      b.setAttribute("aria-label", p.title || "Photo " + (k + 1));
      var t = document.createElement("img");
      t.alt = "";
      t.loading = "lazy";
      t.src = p.thumb;
      if (p.w && p.h) t.style.aspectRatio = p.w + " / " + p.h;
      b.appendChild(t);
      track.appendChild(b);
    });

    vStage.appendChild(stage);
    vTrack.appendChild(track);
    vImgs = Array.prototype.slice.call(vStage.children);
    vThumbs = Array.prototype.slice.call(vTrack.children);
    bumps = vThumbs.map(function () { return 0; });
  }

  // Full-size photos load as they're needed: the one shown and its neighbours.
  function ensureLoaded(k) {
    for (var i = k - 1; i <= k + 2; i++) {
      var img = vImgs[i], p = LIST[i];
      if (!img || img.dataset.loaded) continue;
      img.dataset.loaded = "1";
      if (p.srcset) {
        img.srcset = p.srcset;
        img.sizes = "(max-width: 767px) 100vw, 75vw";
      }
      img.src = p.src;
    }
  }

  // Full screen shows the original upload. It loads in the background and
  // replaces the resized copy once it's ready, so the photo never blanks.
  function loadOriginal(k, onReady) {
    var img = vImgs[k], p = LIST[k];
    if (!img || !p.orig || img.dataset.orig) {
      if (onReady) onReady();
      return;
    }
    img.dataset.orig = "loading";
    var full = new Image();
    full.decoding = "async";
    full.onload = function () {
      img.removeAttribute("srcset");
      img.removeAttribute("sizes");
      img.src = p.orig;
      img.dataset.orig = "1";
      if (onReady && k === vPos) onReady();
    };
    full.onerror = function () { delete img.dataset.orig; if (onReady && k === vPos) onReady(); };
    full.src = p.orig;
  }

  /* ── which photo is shown ── */

  var urlTimer = 0;

  function setActive(k) {
    if (k === vPos) return;
    if (vImgs[vPos]) vImgs[vPos].classList.remove("on");
    if (vThumbs[vPos]) vThumbs[vPos].classList.remove("on");
    vPos = k;
    ensureLoaded(k);
    vImgs[k].classList.add("on");
    vThumbs[k].classList.add("on");
    if (isFull) loadOriginal(k, showFullHint);
    renderDetails();

    // Keep the address on the photo shown (so it can be shared or reloaded).
    clearTimeout(urlTimer);
    urlTimer = setTimeout(function () {
      var p = cur();
      history.replaceState(null, "", "/photo/" + encodeURIComponent(p.slug) + QS);
      document.title = (p.title ? p.title + " · " : "") + "Of Wild & Walls";
    }, 250);
  }

  function renderDetails() {
    var p = cur();
    var chips = String(p.settings || "").split(/\s*[·|,]\s*/).filter(Boolean);
    // "Sarus Crane | Antigone antigone" -> "Sarus Crane · Antigone antigone" (scientific name in italics).
    var tags = String(p.tags || "").split(",").map(function (t) { return t.trim(); }).filter(Boolean);
    var parts = String(p.ref || "").split("|").map(function (x) { return x.trim(); });
    var common = parts[0], sci = parts[1];
    var rows = [
      ["Location", "location", esc(p.location)],
      ["Date", "date", esc(p.date)],
      ["Camera", "camera", esc(p.camera)],
      ["Lens", "lens", esc(p.lens)],
      ["Settings", "settings", chips.length ? '<div class="vchips">' + chips.map(function (c) { return "<span>" + esc(c) + "</span>"; }).join("") + "</div>" : ""],
      ["Category", "category", esc(p.category)],
      ["Collection", "collection", esc(p.collection)],
      ["Tags", "tags", tags.length ? '<div class="vchips">' + tags.map(function (t) { return "<span>" + esc(t) + "</span>"; }).join("") + "</div>" : ""]
    ].filter(function (r) { return r[2]; });

    vDet.innerHTML =
      "<h2>" + esc(p.title) + "</h2>" +
      (common ? '<div class="vref">' + esc(common) + (sci ? " · <i>" + esc(sci) + "</i>" : "") + "</div>" : "") +
      (p.about ? '<p class="vabout">' + esc(p.about) + "</p>" : "") +
      (rows.length
        ? '<dl class="vrows">' + rows.map(function (r) {
            return '<div class="vrow"><dt title="' + r[0] + '" aria-label="' + r[0] + '">' + (ICONS[r[1]] || "") + "</dt><dd>" + r[2] + "</dd></div>";
          }).join("") + "</dl>"
        : "");
    vPanel.scrollTop = 0;
  }

  /* ── the strip ── */

  // Scroll offset that puts thumb k on the strip's centre line.
  function thumbTarget(k) {
    var b = vThumbs[k];
    return isPhone()
      ? b.offsetLeft + b.offsetWidth / 2 - vRail.clientWidth / 2
      : b.offsetTop + b.offsetHeight / 2 - vRail.clientHeight / 2;
  }

  function railPos(v) {
    if (v === undefined) return isPhone() ? vRail.scrollLeft : vRail.scrollTop;
    if (isPhone()) vRail.scrollLeft = v; else vRail.scrollTop = v;
  }

  function stopRail() {
    cancelAnimationFrame(railAnim);
    cancelAnimationFrame(momentum);
    railAnim = momentum = 0;
  }

  function scrollRailTo(k, smooth) {
    stopRail();
    var t = thumbTarget(k);
    if (!smooth || reduce) {
      railPos(t);
      return;
    }
    var from = railPos(), d = t - from, t0 = performance.now(), dur = Math.min(520, 240 + Math.abs(d) * 0.6);
    var f = function (now) {
      var x = Math.min(1, (now - t0) / dur);
      railPos(from + d * (1 - Math.pow(1 - x, 3)));
      railAnim = x < 1 ? requestAnimationFrame(f) : 0;
    };
    railAnim = requestAnimationFrame(f);
  }

  // Keep the strip moving at release speed, slowing each frame, then settle on a thumb.
  function glide(v) {
    stopRail();
    var f = function () {
      railPos(railPos() + v);
      v *= 0.94;
      if (Math.abs(v) > 0.6) momentum = requestAnimationFrame(f);
      else { momentum = 0; scrollRailTo(vPos, true); }
    };
    momentum = requestAnimationFrame(f);
  }

  function step(d) {
    var k = Math.max(0, Math.min(LIST.length - 1, vPos + d));
    setActive(k);
    scrollRailTo(k, true);
  }

  // Each frame: the thumb nearest the centre line becomes the photo; thumbs near
  // it ease outward (quadratic falloff).
  function railLoop() {
    var ph = isPhone(), rr = vRail.getBoundingClientRect();
    var c = ph ? rr.left + rr.width / 2 : rr.top + rr.height / 2;
    var R = ph ? 170 : 260, MAX = ph ? 14 : 44, best = -1, bd = 1e9;

    for (var k = 0; k < vThumbs.length; k++) {
      var r = vThumbs[k].getBoundingClientRect();
      var m = ph ? r.left + r.width / 2 : r.top + r.height / 2;
      var d = Math.abs(m - c);
      if (d < bd) { bd = d; best = k; }
      if (d > R + 300 && bumps[k] === 0) continue;
      var tgt = d < R ? Math.pow(1 - d / R, 2) * MAX : 0;
      bumps[k] += (tgt - bumps[k]) * 0.14;
      if (Math.abs(bumps[k] - tgt) < 0.05) bumps[k] = tgt;
      vThumbs[k].style.transform = ph ? "translateY(" + -bumps[k] + "px)" : "translateX(" + bumps[k] + "px)";
    }

    if (best >= 0 && best !== vPos) setActive(best);
    requestAnimationFrame(railLoop);
  }

  /* ── controls ── */

  function setDet(o) {
    detOpen = o;
    viewer.classList.toggle("det", o);
    vDetTop.setAttribute("aria-pressed", o ? "true" : "false");
    vDetTop.querySelector("span").textContent = o ? "Hide details" : "Details";
    vPanel.style.transform = "";
  }

  var hintTimer = 0;
  function showHint(text, ms) {
    clearTimeout(hintTimer);
    vHint.textContent = text;
    requestAnimationFrame(function () { vHint.classList.add("on"); });
    if (ms) hintTimer = setTimeout(function () { vHint.classList.remove("on"); }, ms);
  }

  function showFullHint() {
    if (isFull) showHint(canHover ? "Scroll to browse · Click to exit" : "Swipe to browse · Tap to exit", 5500);
  }

  function setFull(o) {
    isFull = o;
    viewer.classList.toggle("full", o);
    if (o) setDet(false);
    clearTimeout(hintTimer);
    vHint.classList.remove("on");
    if (o) {
      var img = vImgs[vPos];
      if (img && !img.dataset.orig && LIST[vPos].orig) showHint("Loading full resolution…", 0);
      loadOriginal(vPos, showFullHint);
    }
  }

  // Back to where the visitor came from on this site, else to the gallery.
  function closeViewer() {
    var sameSite = document.referrer && document.referrer.indexOf(window.location.host) !== -1;
    if (sameSite && history.length > 1) history.back();
    else window.location.href = "/" + QS;
  }

  vDetTop.addEventListener("click", function () { setDet(!detOpen); });
  document.getElementById("vClose").addEventListener("click", closeViewer);

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      if (isFull) setFull(false); else if (detOpen) setDet(false); else closeViewer();
    } else if (e.key === "f") setFull(!isFull);
    else if (e.key === "ArrowRight" || e.key === "ArrowDown") { e.preventDefault(); step(1); }
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") { e.preventDefault(); step(-1); }
    else if (e.key === "i" || e.key === "d") setDet(!detOpen);
  });

  vTrack.addEventListener("click", function (e) {
    var b = e.target.closest("button");
    if (!b) return;
    var k = +b.dataset.k;
    setActive(k);
    scrollRailTo(k, true);
  });

  // The wheel over the photo drives the strip, so browsing is continuous.
  vStage.addEventListener("wheel", function (e) {
    e.preventDefault();
    stopRail();
    var d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
    if (isPhone()) vRail.scrollLeft += d; else vRail.scrollTop += d;
  }, { passive: false });

  window.addEventListener("resize", function () { if (vPos >= 0) scrollRailTo(vPos, false); });

  // Dragging on the photo scrubs the strip. A slow release moves one photo; a
  // fast one glides through several. A tap on the photo toggles full screen;
  // a tap beside it closes.
  var sw = null;
  vStage.addEventListener("pointerdown", function (e) {
    stopRail();
    sw = { x: e.clientX, y: e.clientY, p0: railPos(), k0: vPos, moved: false, d: 0, hist: [[performance.now(), 0]] };
    vStage.setPointerCapture(e.pointerId);
  });
  vStage.addEventListener("pointermove", function (e) {
    if (!sw) return;
    var dx = e.clientX - sw.x, dy = e.clientY - sw.y;
    if (!sw.moved && Math.hypot(dx, dy) < 6) return;
    sw.moved = true;
    var d = Math.abs(dx) >= Math.abs(dy) ? dx : dy, k = isPhone() ? 0.6 : 1.2;
    sw.d = d;
    railPos(sw.p0 - d * k);
    var now = performance.now();
    sw.hist.push([now, d]);
    while (sw.hist.length > 2 && now - sw.hist[0][0] > 90) sw.hist.shift();
  });
  function endSwipe(e) {
    if (!sw) return;
    var s0 = sw;
    sw = null;
    if (!s0.moved) {
      if (isFull) setFull(false);
      else if (overPhoto(e.clientX, e.clientY)) setFull(true);
      else closeViewer();
      return;
    }
    var h = s0.hist, a = h[0], z = h[h.length - 1];
    var vf = (z[1] - a[1]) / Math.max(16, z[0] - a[0]); // px per ms over the last ~90 ms
    var k = isPhone() ? 0.6 : 1.2;
    if (Math.abs(vf) > 0.45) { glide(-vf * k * 16 * 1.6); return; }
    var dir = Math.abs(s0.d) > 36 ? (s0.d < 0 ? 1 : -1) : 0;
    var t = Math.max(0, Math.min(LIST.length - 1, s0.k0 + dir));
    setActive(t);
    scrollRailTo(t, true);
  }
  vStage.addEventListener("pointerup", endSwipe);
  vStage.addEventListener("pointercancel", function () { if (sw) { sw = null; scrollRailTo(vPos, true); } });

  // When the strip comes to rest on its own, centre the nearest thumb.
  var railIdle = 0;
  vRail.addEventListener("scroll", function () {
    if (sw || railAnim || momentum) return;
    clearTimeout(railIdle);
    railIdle = setTimeout(function () { if (!sw && !railAnim && !momentum) scrollRailTo(vPos, true); }, 160);
  }, { passive: true });
  vRail.addEventListener("pointerdown", stopRail, { passive: true });
  vRail.addEventListener("touchstart", stopRail, { passive: true });

  // Phones: pull the details sheet down to close it.
  var sh = null;
  vPanel.addEventListener("touchstart", function (e) {
    if (!isPhone() || !detOpen) return;
    sh = { y: e.touches[0].clientY, dy: 0, grab: e.target === document.getElementById("vGrab") };
  }, { passive: true });
  vPanel.addEventListener("touchmove", function (e) {
    if (!sh) return;
    var dy = e.touches[0].clientY - sh.y;
    if (dy > 0 && (sh.grab || vPanel.scrollTop <= 0)) {
      e.preventDefault();
      sh.dy = dy;
      vPanel.style.transition = "none";
      vPanel.style.transform = "translateY(" + dy + "px)";
    } else if (sh.dy === 0) {
      sh = null;
    }
  }, { passive: false });
  function endSheet() {
    if (!sh) return;
    var dy = sh.dy;
    sh = null;
    vPanel.style.transition = "";
    vPanel.style.transform = "";
    if (dy > 70) setDet(false);
  }
  vPanel.addEventListener("touchend", endSheet);
  vPanel.addEventListener("touchcancel", endSheet);

  /* ── start on the photo in the URL ── */

  if (!LIST.length) return;
  build();
  var start = Math.max(0, LIST.findIndex(function (p) { return p.slug === DATA.current; }));
  setActive(start);
  requestAnimationFrame(function () {
    scrollRailTo(start, false);
    requestAnimationFrame(railLoop);
  });
})();
