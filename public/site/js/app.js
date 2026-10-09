/* public/js/app.js — dark mode, API-driven filter menus, photo filtering, horizontal strip scroll */
(function () {
  var root = document.documentElement;
  var KEY = "oww:theme";

  function updateThemeIcons() {
    var isDark = document.documentElement.classList.contains("dark");

    document.querySelectorAll(".theme-icon-moon").forEach(function (icon) {
      icon.classList.toggle("hidden", isDark);
    });

    document.querySelectorAll(".theme-icon-sun").forEach(function (icon) {
      icon.classList.toggle("hidden", !isDark);
    });
  }

  /* ── Flow / Grid scroll position memory ───────────────────────────── */

  var FLOW_SCROLL_KEY = "oww:flow-scroll";
  var GRID_SCROLL_KEY = "oww:grid-scroll";

  if ("scrollRestoration" in history) {
    history.scrollRestoration = "manual";
  }

  function saveFlowScrollPosition() {
    sessionStorage.setItem(FLOW_SCROLL_KEY, String(window.scrollY));
  }

  function getFlowScrollPosition() {
    var value = sessionStorage.getItem(FLOW_SCROLL_KEY);

    if (value === null) {
      return 0;
    }

    return parseInt(value, 10) || 0;
  }

  function saveGridScrollPosition(strip) {
    sessionStorage.setItem(GRID_SCROLL_KEY, String(strip.scrollLeft));
  }

  function getGridScrollPosition() {
    var value = sessionStorage.getItem(GRID_SCROLL_KEY);

    if (value === null) {
      return null;
    }

    return parseInt(value, 10) || 0;
  }

  if (localStorage.getItem(KEY) === "dark") root.classList.add("dark");

  // Desktop header and the mobile nav panel each have their own copy of this
  // button (same markup, different layout context) — wire both to the same toggle.

  function updateThemeIcons() {
    var isDark = root.classList.contains("dark");

    document.querySelectorAll(".theme-icon-moon").forEach(function (icon) {
      icon.classList.toggle("hidden", isDark);
    });

    document.querySelectorAll(".theme-icon-sun").forEach(function (icon) {
      icon.classList.toggle("hidden", !isDark);
    });
  }

  document.querySelectorAll(".js-theme-toggle").forEach(function (btn) {
    btn.addEventListener("click", function () {
      root.classList.toggle("dark");
      localStorage.setItem(
        KEY,
        root.classList.contains("dark") ? "dark" : "light",
      );
      updateThemeIcons();
    });
  });

  updateThemeIcons();

  /* ── Mobile / tablet header hamburger ────────────────────────────── */
  (function () {
    var toggle = document.getElementById("navToggle");
    var panel = document.getElementById("navPanel");
    var iconOpen = document.getElementById("navIconOpen");
    var iconClose = document.getElementById("navIconClose");

    if (!toggle || !panel) return;

    function setOpen(open) {
      panel.classList.toggle("hidden", !open);

      if (iconOpen) {
        iconOpen.classList.toggle("hidden", open);
      }

      if (iconClose) {
        iconClose.classList.toggle("hidden", !open);
      }

      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    }

    toggle.addEventListener("click", function (e) {
      e.stopPropagation();
      setOpen(panel.classList.contains("hidden"));
    });

    panel.addEventListener("click", function (e) {
      e.stopPropagation();
    });

    document.addEventListener("click", function () {
      setOpen(false);
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") {
        setOpen(false);
      }
    });

    var themeToggle = panel.querySelector(".js-theme-toggle");

    if (themeToggle) {
      themeToggle.addEventListener("click", function () {
        setOpen(false);
      });
    }
  })();

  /* ── Flow / Grid tabs — switch in place, one page, one URL ────────── */
  (function () {
    var flowSection = document.getElementById("flowView");
    var gridSection = document.getElementById("gridView");
    var navButtons = document.querySelectorAll("[data-nav-view]");

    if (!flowSection || !gridSection || navButtons.length === 0) return;

    function setNavActive(view) {
      navButtons.forEach(function (btn) {
        var isActive = btn.getAttribute("data-nav-view") === view;

        if (btn.classList.contains("nav-link-mobile")) {
          btn.classList.toggle("font-medium", isActive);
          btn.classList.toggle("text-ink", isActive);
          btn.classList.toggle("dark:text-white", isActive);
          btn.classList.toggle("text-ink/55", !isActive);
          btn.classList.toggle("dark:text-white/55", !isActive);
        } else {
          btn.classList.toggle("text-[15px]", true);
          btn.classList.toggle("font-medium", isActive);
          btn.classList.toggle("text-ink/40", !isActive);
          btn.classList.toggle("dark:text-white/40", !isActive);
          btn.classList.toggle("hover:text-ink/70", !isActive);
          btn.classList.toggle("dark:hover:text-white/70", !isActive);
          btn.classList.toggle("transition-colors", !isActive);
        }
      });
    }

    function currentView() {
      return gridSection.classList.contains("hidden") ? "flow" : "grid";
    }

    function switchView(view) {
      if (view === currentView()) return;

      if (view === "grid") {
        flowSection.classList.add("hidden");
        gridSection.classList.remove("hidden");

        if (restoreGridScroll) restoreGridScroll();
      } else {
        gridSection.classList.add("hidden");
        flowSection.classList.remove("hidden");

        // Flow skips layout while hidden (it has no width to measure), so
        // catch up on any resize or filter change that happened meanwhile.
        if (flowRelayout) flowRelayout();
        if (restoreFlowScroll) restoreFlowScroll();
      }

      setNavActive(view);
    }

    navButtons.forEach(function (btn) {
      btn.addEventListener("click", function () {
        switchView(btn.getAttribute("data-nav-view"));

        // The mobile nav panel stops click bubbling (see above), so closing
        // it on a tab click has to happen explicitly here too.
        var navPanel = document.getElementById("navPanel");

        if (navPanel && !navPanel.classList.contains("hidden")) {
          navPanel.classList.add("hidden");

          var navToggle = document.getElementById("navToggle");

          if (navToggle) navToggle.setAttribute("aria-expanded", "false");
        }
      });
    });
  })();

  /* ── Mobile / tablet filter bar ───────────────────────────────────── */
  (function () {
    var toggle = document.getElementById("filtersToggle");
    var group = document.getElementById("filtersGroup");

    if (!toggle || !group) return;

    function setOpen(open) {
      group.classList.toggle("hidden", !open);
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    }

    toggle.addEventListener("click", function (e) {
      e.stopPropagation();
      setOpen(group.classList.contains("hidden"));
    });

    group.addEventListener("click", function (e) {
      e.stopPropagation();
    });

    document.addEventListener("click", function () {
      setOpen(false);
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") {
        setOpen(false);
      }
    });
  })();

  /* ── HTML helpers ────────────────────────────────────────────────── */

  function esc(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function escAttr(str) {
    return String(str || "").replace(/"/g, "&quot;");
  }

  /*
   * <img> attributes for a photo from the API: the small resized copy as
   * src, the srcset of resized WebP copies, natural width/height (so the
   * browser reserves the right box) and async decoding. `sizes` is the
   * expected display width. Falls back to the original when the photo has
   * no resized copies yet.
   */
  function photoImgAttrs(p, sizes) {
    var out = ' src="' + escAttr(p.srcSmall || p.src) + '"';

    if (p.srcset) {
      out += ' srcset="' + escAttr(p.srcset) + '" sizes="' + escAttr(sizes) + '"';
    }

    if (p.width && p.height) {
      out += ' width="' + p.width + '" height="' + p.height + '"';
    }

    return out + ' alt="' + escAttr(p.alt) + '" loading="lazy" decoding="async"';
  }

  function photoAspect(p) {
    return p.width && p.height ? p.width / p.height : 0;
  }

  function itemRow(name, count) {
    return (
      '<button type="button" data-name="' +
      escAttr(name) +
      '" data-count="' +
      (count || 0) +
      '"' +
      ' class="oww-filter-item w-full flex items-center justify-between px-4 py-1.5 text-[15px] text-left' +
      ' hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-colors">' +
      "<span>" +
      esc(name) +
      "</span>" +
      '<span class="text-ink/35 dark:text-white/35">[' +
      (count || 0) +
      "]</span>" +
      "</button>"
    );
  }

  function brandHeader(label) {
    return (
      '<p class="px-4 pt-2 pb-1 text-[11px] tracking-[0.06em] uppercase text-ink/40 dark:text-white/40">' +
      esc(label) +
      "</p>"
    );
  }

  function emptyMsg(text) {
    return (
      '<p class="px-4 py-2 text-[13px] text-ink/35 dark:text-white/35 italic">' +
      esc(text) +
      "</p>"
    );
  }

  function buildGroupedHTML(groups) {
    if (!groups || groups.length === 0) {
      return emptyMsg("None found");
    }

    return groups
      .map(function (g) {
        var rows = (g.models || [])
          .map(function (m) {
            return itemRow(m.name, m.count);
          })
          .join("");

        return brandHeader(g.brand) + rows;
      })
      .join("");
  }

  function buildFlatHTML(items, groupByParent) {
    if (!items || items.length === 0) {
      return emptyMsg("None found");
    }

    if (groupByParent) {
      var parentMap = {};
      var topLevel = [];

      items.forEach(function (item) {
        var p = (item.parent || "").trim();

        if (!p || p === "None") {
          topLevel.push(item);
        } else {
          if (!parentMap[p]) {
            parentMap[p] = [];
          }

          parentMap[p].push(item);
        }
      });

      var html = "";

      topLevel.forEach(function (item) {
        var children = parentMap[item.title] || [];

        html += itemRow(item.title, item.count);

        children.forEach(function (c) {
          html += itemRow(c.title, c.count);
        });
      });

      Object.keys(parentMap).forEach(function (p) {
        var exists = topLevel.some(function (t) {
          return t.title === p;
        });

        if (!exists) {
          html += brandHeader(p);

          parentMap[p].forEach(function (c) {
            html += itemRow(c.title, c.count);
          });
        }
      });

      return html || emptyMsg("None found");
    }

    return items
      .map(function (item) {
        return itemRow(item.title, item.count);
      })
      .join("");
  }

  /* ── Photo filtering ─────────────────────────────────────────────── */

  var activeFilters = {
    category: null,
    collection: null,
    camera: null,
    lens: null,
    country: null,
    year: null,
  };

  var resetFiltersBtn = document.getElementById("resetFiltersBtn");

  function updateResetButton() {
    var hasActive = Object.keys(activeFilters).some(function (type) {
      return !!activeFilters[type];
    });

    if (resetFiltersBtn) {
      resetFiltersBtn.classList.toggle("hidden", !hasActive);
    }
  }

  // How many photos match the currently active value for each filter type —
  // shown alongside the value in the filter bar's pill. Populated whenever a
  // value is picked from a dropdown (each menu item already carries its own
  // count) or, for a filter restored from the URL on load, once that menu's
  // data has finished loading and we can look the count up.
  var activeFilterCounts = {
    category: null,
    collection: null,
    camera: null,
    lens: null,
    country: null,
    year: null,
  };

  (function initFiltersFromURL() {
    var qs = window.location.search.substring(1);
    if (!qs) return;
    var pairs = qs.split("&");
    var hasActive = false;
    pairs.forEach(function (pair) {
      // Only one filter is ever active at a time — an older shared link with
      // several filter params keeps just the first one it finds.
      if (hasActive) return;

      var kv = pair.split("=");
      if (kv.length === 2) {
        var key = decodeURIComponent(kv[0]);
        var val = decodeURIComponent(kv[1]);
        if (activeFilters.hasOwnProperty(key)) {
          activeFilters[key] = val;
          hasActive = true;
        }
      }
    });

    if (hasActive) {
      document.addEventListener("DOMContentLoaded", function () {
        Object.keys(activeFilters).forEach(function (key) {
          if (activeFilters[key]) updateButtonLabel(key);
        });
        updateResetButton();
        applyFiltersAfterLoading();
      });
    }
  })();

  var dataAttrMap = {
    category: "category",
    collection: "collection",
    camera: "camera",
    lens: "lens",
    country: "state",
    year: "year",
  };

  var defaultLabels = {
    category: "Category",
    collection: "Collections",
    camera: "Camera",
    lens: "Lens",
    country: "Location",
    year: "Year",
  };

  /*
   * Both Flow and Grid load photos incrementally.
   *
   * When a filter is selected, we load the remaining photos first so the
   * filter can search the complete photo set instead of only the photos
   * currently present in the DOM.
   */
  var flowLoadAll = null;
  var gridLoadAll = null;
  var flowRelayout = null;

  // Set once each view's own IIFE runs, so the Flow/Grid tab switcher below
  // can re-run the same scroll restore it does on a full page load.
  var restoreFlowScroll = null;
  var restoreGridScroll = null;

  function applyFiltersAfterLoading() {
    var hasActive = Object.keys(activeFilters).some(function (k) {
      return !!activeFilters[k];
    });

    if (!hasActive) {
      applyFilters();
      return;
    }

    var tasks = [];

    if (flowLoadAll) {
      tasks.push(flowLoadAll());
    }

    if (gridLoadAll) {
      tasks.push(gridLoadAll());
    }

    Promise.all(tasks).then(function () {
      applyFilters();
    });
  }

  /*
   * Grid is a simple horizontal strip that closes ranks on its own when
   * a child is hidden. Flow positions every photo absolutely (see its
   * own script below), so a hidden photo would leave a hole — hence the
   * flowRelayout() re-run at the end.
   */
  function applyFilters() {
    var photos = document.querySelectorAll(".photo-item");

    photos.forEach(function (el) {
      // The detail page's main photo also uses .photo-item for styling,
      // but it is not part of the filterable Flow/Grid gallery.
      if (el.querySelector("#mainPhoto")) {
        return;
      }

      var visible = true;

      Object.keys(activeFilters).forEach(function (type) {
        var val = activeFilters[type];

        if (!val) return;

        if (type === "country") {
          var separatorIndex = val.indexOf("::");

          if (separatorIndex === -1) {
            visible = false;
            return;
          }

          var prefix = val.slice(0, separatorIndex);
          var slug = val.slice(separatorIndex + 2).toLowerCase();

          if (prefix === "country") {
            var photoCountry = (el.getAttribute("data-country") || "")
              .trim()
              .toLowerCase();

            if (photoCountry !== slug) {
              visible = false;
            }
          } else {
            var photoState = (el.getAttribute("data-state") || "")
              .trim()
              .toLowerCase();

            if (photoState !== slug) {
              visible = false;
            }
          }
        } else {
          var photoVal = (el.getAttribute("data-" + dataAttrMap[type]) || "")
            .trim()
            .toLowerCase();

          if (photoVal !== val.toLowerCase()) {
            visible = false;
          }
        }
      });

      el.style.display = visible ? "" : "none";
    });
    if (flowRelayout) {
      flowRelayout();
    }
  }

  // Only one filter can be active at a time — picking a new one clears
  // whichever else was set, refreshing its button back to its default label.
  function clearOtherFilters(exceptType) {
    Object.keys(activeFilters).forEach(function (type) {
      if (type !== exceptType && activeFilters[type]) {
        activeFilters[type] = null;
        activeFilterCounts[type] = null;

        updateButtonLabel(type);
      }
    });
  }

  function setFilter(type, value, count) {
    clearOtherFilters(type);

    activeFilters[type] = value;
    activeFilterCounts[type] = typeof count === "number" ? count : null;

    updateButtonLabel(type);
    updateResetButton();
    applyFiltersAfterLoading();
    updateURLQuery();
  }

  function clearFilter(type) {
    activeFilters[type] = null;
    activeFilterCounts[type] = null;

    updateButtonLabel(type);
    updateResetButton();
    applyFiltersAfterLoading();
    updateURLQuery();
  }

  function buildFilterQueryString() {
    var parts = [];

    Object.keys(activeFilters).forEach(function (type) {
      var val = activeFilters[type];

      if (val) {
        parts.push(encodeURIComponent(type) + "=" + encodeURIComponent(val));
      }
    });

    return parts.join("&");
  }

  function updateURLQuery() {
    var qs = buildFilterQueryString();
    var newUrl = window.location.pathname;
    if (qs) {
      newUrl += "?" + qs;
    }
    history.replaceState(null, "", newUrl);
  }

  /*
   * Carry active filters into the photo detail page.
   */
  document.addEventListener(
    "click",
    function (e) {
      var link = e.target.closest(".photo-item");

      if (!link) return;

      var qs = buildFilterQueryString();

      if (!qs) return;

      var base = (link.getAttribute("href") || "").split("?")[0];

      link.setAttribute("href", base + "?" + qs);
    },
    true,
  );

  function updateButtonLabel(type) {
    var btnId = type === "collection" ? "collectionsBtn" : type + "Btn";
    var btn = document.getElementById(btnId);

    if (!btn) return;

    var labelEl = btn.querySelector("span");

    if (!labelEl) return;

    var active = activeFilters[type];

    if (active && type === "country" && active.indexOf("::") !== -1) {
      active = active.slice(active.indexOf("::") + 2);
    }

    if (active) {
      var short = active.length > 16 ? active.substring(0, 14) + "…" : active;

      var count = activeFilterCounts[type];

      var countHtml =
        typeof count === "number"
          ? ' <span class="text-ink/40 dark:text-white/40 font-normal">[' +
            count +
            "]</span>"
          : "";

      labelEl.innerHTML =
        defaultLabels[type] +
        ' <span class="ml-1.5 px-2 py-0.5 rounded-[6px] bg-black/5 dark:bg-white/10 text-[13px] text-ink dark:text-white font-medium">' +
        esc(short) +
        countHtml +
        "</span>";

      btn.classList.add("text-ink", "dark:text-white");
      btn.classList.remove(
        "text-ink/75",
        "dark:text-white/75",
        "text-[#c8a03c]",
      );
    } else {
      labelEl.textContent = defaultLabels[type];

      btn.classList.remove("text-ink", "dark:text-white", "text-[#c8a03c]");
      btn.classList.add("text-ink/75", "dark:text-white/75");
    }
  }

  /* ── Generic popup wiring ─────────────────────────────────────────── */

  function wirePopup(menuEl, triggerBtn, filterType) {
    if (!menuEl || !triggerBtn) return;

    triggerBtn.addEventListener("click", function (e) {
      e.stopPropagation();

      var isHidden = menuEl.classList.contains("hidden");

      document.querySelectorAll(".oww-dropdown").forEach(function (d) {
        d.classList.add("hidden");
      });

      menuEl.classList.toggle("hidden", !isHidden);
    });

    menuEl.addEventListener("click", function (e) {
      e.stopPropagation();
    });

    document.addEventListener("click", function () {
      menuEl.classList.add("hidden");
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") {
        document.querySelectorAll(".oww-dropdown").forEach(function (d) {
          d.classList.add("hidden");
        });
      }
    });
  }

  /* ── Wire filter item clicks inside a menu ────────────────────────── */

  function wireFilterItems(menuEl, filterType) {
    if (!menuEl) return;

    menuEl.addEventListener("click", function (e) {
      var btn = e.target.closest(".oww-filter-item");

      if (!btn) return;

      e.stopPropagation();

      var name = btn.getAttribute("data-name") || "";
      var count = Number(btn.getAttribute("data-count")) || 0;

      setFilter(filterType, name, count);

      menuEl.classList.add("hidden");
    });
  }

  // A filter restored from the URL on load has no count yet (the menu data
  // hasn't been fetched at that point) — once a menu finishes loading, look
  // up its currently active value among the freshly rendered items and fill
  // the count in.
  function syncActiveCountFromMenu(menuEl, filterType) {
    var active = activeFilters[filterType];

    if (!active) return;

    var items = menuEl.querySelectorAll(".oww-filter-item");

    for (var i = 0; i < items.length; i++) {
      if (items[i].getAttribute("data-name") === active) {
        activeFilterCounts[filterType] =
          Number(items[i].getAttribute("data-count")) || 0;

        updateButtonLabel(filterType);

        break;
      }
    }
  }

  /* ── Setup a menu: fetch → render → wire ─────────────────────────── */

  function setupMenu(menuId, btnId, apiUrl, dataKey, renderFn, filterType) {
    var menuEl = document.getElementById(menuId);

    var btnEl = document.getElementById(btnId);

    if (!menuEl || !btnEl) return;

    menuEl.classList.add("oww-dropdown");

    wirePopup(menuEl, btnEl, filterType);

    wireFilterItems(menuEl, filterType);

    fetch(apiUrl)
      .then(function (r) {
        return r.json();
      })
      .then(function (data) {
        menuEl.innerHTML = renderFn(data[dataKey]);

        syncActiveCountFromMenu(menuEl, filterType);
      })
      .catch(function () {
        menuEl.innerHTML =
          '<p class="px-4 py-2 text-[13px] text-red-400 italic">Failed to load</p>';
      });
  }

  /* ── Category ────────────────────────────────────────────────────── */

  setupMenu(
    "categoryMenu",
    "categoryBtn",
    "/api/categories",
    "categories",
    function (items) {
      return buildFlatHTML(items, true);
    },
    "category",
  );

  /* ── Collections ─────────────────────────────────────────────────── */

  setupMenu(
    "collectionsMenu",
    "collectionsBtn",
    "/api/collections",
    "collections",
    function (items) {
      return buildFlatHTML(items, false);
    },
    "collection",
  );

  /* ── Camera ──────────────────────────────────────────────────────── */

  setupMenu(
    "cameraMenu",
    "cameraBtn",
    "/api/cameras",
    "cameras",
    buildGroupedHTML,
    "camera",
  );

  /* ── Lens ────────────────────────────────────────────────────────── */

  setupMenu(
    "lensMenu",
    "lensBtn",
    "/api/lenses",
    "lenses",
    buildGroupedHTML,
    "lens",
  );

  /* ── Location ────────────────────────────────────────────────────── */

  (function () {
    var menuEl = document.getElementById("countryMenu");

    var btnEl = document.getElementById("countryBtn");

    if (!menuEl || !btnEl) return;

    menuEl.classList.add("oww-dropdown");

    var locationData = [];
    var expandedSet = {};
    var searchVal = "";

    function buildLocationHTML() {
      var filtered = locationData.filter(function (c) {
        if (!searchVal) return true;

        var q = searchVal.toLowerCase();

        if (c.country.toLowerCase().includes(q)) {
          return true;
        }

        return c.states.some(function (s) {
          return s.name.toLowerCase().includes(q);
        });
      });

      if (filtered.length === 0) {
        return (
          '<p class="px-4 py-3 text-[13px] text-ink/40 dark:text-white/40 italic">' +
          "No results" +
          "</p>"
        );
      }

      return filtered
        .map(function (c) {
          var isExpanded = !!expandedSet[c.country] || searchVal.length > 0;

          var activeVal = activeFilters.country;

          var isCountryActive = activeVal === "country::" + c.country;

          var hasStates = c.states.length > 0;

          var radioHtml =
            '<label class="flex items-center justify-center w-4 h-4 shrink-0 cursor-pointer">' +
            '<input type="radio" name="oww-loc" class="sr-only oww-loc-radio" data-kind="country" data-value="' +
            escAttr(c.country) +
            '">' +
            '<span class="w-3.5 h-3.5 rounded-full border border-ink/30 dark:border-white/30 flex items-center justify-center' +
            (isCountryActive
              ? " border-ink dark:border-white bg-ink dark:bg-white"
              : "") +
            '">' +
            (isCountryActive
              ? '<span class="w-1.5 h-1.5 rounded-full bg-paper dark:bg-ink"></span>'
              : "") +
            "</span></label>";

          var arrowHtml = hasStates
            ? '<button type="button" class="oww-loc-expand ml-auto flex items-center justify-center w-6 h-6 rounded text-ink/40 dark:text-white/40 hover:text-ink dark:hover:text-white transition-colors" data-country="' +
              escAttr(c.country) +
              '">' +
              '<svg viewBox="0 0 16 16" class="w-3 h-3 transition-transform' +
              (isExpanded ? " rotate-180" : "") +
              '" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 6l4 4 4-4"/></svg>' +
              "</button>"
            : '<span class="w-6 ml-auto"></span>';

          var html =
            '<div class="flex items-center gap-2 px-3 py-2 hover:bg-black/[0.03] dark:hover:bg-white/[0.04] rounded-lg cursor-pointer oww-loc-row" data-kind="country" data-value="' +
            escAttr(c.country) +
            '">' +
            radioHtml +
            '<span class="flex-1 text-[14px] text-ink dark:text-white">' +
            esc(c.country) +
            "</span>" +
            '<span class="text-[12px] text-ink/35 dark:text-white/35 mr-1">' +
            c.totalCount +
            "</span>" +
            arrowHtml +
            "</div>";

          if (isExpanded && hasStates) {
            html += c.states
              .map(function (s) {
                var isStateActive = activeVal === "state::" + s.name;

                var stateRadio =
                  '<label class="flex items-center justify-center w-4 h-4 shrink-0 cursor-pointer">' +
                  '<input type="radio" name="oww-loc" class="sr-only oww-loc-radio" data-kind="state" data-value="' +
                  escAttr(s.name) +
                  '">' +
                  '<span class="w-3 h-3 rounded-full border border-ink/25 dark:border-white/25 flex items-center justify-center' +
                  (isStateActive
                    ? " border-ink dark:border-white bg-ink dark:bg-white"
                    : "") +
                  '">' +
                  (isStateActive
                    ? '<span class="w-1.5 h-1.5 rounded-full bg-paper dark:bg-ink"></span>'
                    : "") +
                  "</span></label>";

                return (
                  '<div class="flex items-center gap-2 pl-9 pr-3 py-1.5 hover:bg-black/[0.03] dark:hover:bg-white/[0.04] rounded-lg cursor-pointer oww-loc-row" data-kind="state" data-value="' +
                  escAttr(s.name) +
                  '">' +
                  stateRadio +
                  '<span class="flex-1 text-[13px] text-ink/80 dark:text-white/80">' +
                  esc(s.name) +
                  "</span>" +
                  '<span class="text-[12px] text-ink/30 dark:text-white/30">' +
                  s.count +
                  "</span>" +
                  "</div>"
                );
              })
              .join("");
          }

          return html;
        })
        .join("");
    }

    function rerender() {
      var listEl = menuEl.querySelector("#oww-loc-list");

      if (listEl) {
        listEl.innerHTML = buildLocationHTML();
      }
    }

    // Resolve a "country::X" / "state::X" activeFilters.country value to its
    // matching count in locationData, for the filter-bar pill.
    function lookupLocationCount(filterVal) {
      if (!filterVal) return null;

      if (filterVal.indexOf("country::") === 0) {
        var countryName = filterVal.slice("country::".length);

        for (var i = 0; i < locationData.length; i++) {
          if (locationData[i].country === countryName) {
            return locationData[i].totalCount;
          }
        }

        return null;
      }

      if (filterVal.indexOf("state::") === 0) {
        var stateName = filterVal.slice("state::".length);

        for (var j = 0; j < locationData.length; j++) {
          var states = locationData[j].states;

          for (var k = 0; k < states.length; k++) {
            if (states[k].name === stateName) {
              return states[k].count;
            }
          }
        }

        return null;
      }

      return null;
    }

    fetch("/api/countries")
      .then(function (r) {
        return r.json();
      })
      .then(function (data) {
        locationData = (data.countries || []).map(function (c) {
          var total = c.states.reduce(function (a, s) {
            return a + (s.count || 0);
          }, 0);

          return {
            country: c.country,
            totalCount: total,
            states: c.states,
          };
        });

        // A country/state filter restored from the URL on load has no count
        // yet — now that locationData is here, look it up.
        if (activeFilters.country) {
          activeFilterCounts.country = lookupLocationCount(
            activeFilters.country,
          );

          updateButtonLabel("country");
        }

        menuEl.innerHTML =
          '<div class="flex items-center justify-between px-3 pt-2 pb-1">' +
          '<span class="text-[10px] tracking-[0.12em] uppercase font-semibold text-ink/40 dark:text-white/40">Location</span>' +
          '<button type="button" id="oww-loc-clear" class="text-[12px] text-ink/50 dark:text-white/50 hover:text-ink dark:hover:text-white transition-colors">Clear</button>' +
          "</div>" +
          '<div class="px-3 pb-2">' +
          '<input id="oww-loc-search" type="text" placeholder="Search countries or cities…" autocomplete="off" class="w-full rounded-lg border border-ink/10 dark:border-white/10 bg-ink/[0.03] dark:bg-white/[0.05] px-3 py-1.5 text-[13px] text-ink dark:text-white placeholder:text-ink/30 dark:placeholder:text-white/30 outline-none focus:border-ink/30 dark:focus:border-white/30 transition-colors">' +
          "</div>" +
          '<p class="px-3 pb-1 text-[10px] tracking-[0.1em] uppercase font-semibold text-ink/35 dark:text-white/35">Countries</p>' +
          '<div id="oww-loc-list" class="max-h-[260px] overflow-y-auto px-1 pb-1">' +
          buildLocationHTML() +
          "</div>" +
          '<p class="px-3 py-2 text-[11px] text-ink/35 dark:text-white/35 border-t border-ink/8 dark:border-white/8 mt-1">Select a country for all its photographs, or expand it to choose a city.</p>';

        var searchInput = menuEl.querySelector("#oww-loc-search");

        if (searchInput) {
          searchInput.addEventListener("input", function () {
            searchVal = this.value.trim();

            rerender();
          });

          searchInput.addEventListener("click", function (e) {
            e.stopPropagation();
          });
        }

        var clearBtn = menuEl.querySelector("#oww-loc-clear");

        if (clearBtn) {
          clearBtn.addEventListener("click", function (e) {
            e.stopPropagation();
            activeFilters.country = null;
            activeFilterCounts.country = null;

            updateButtonLabel("country");
            updateResetButton();

            applyFiltersAfterLoading();
            updateURLQuery();

            menuEl.classList.add("hidden");
          });
        }

        menuEl.addEventListener("click", function (e) {
          if (e.target.closest(".oww-loc-radio")) {
            return;
          }

          var expand = e.target.closest(".oww-loc-expand");

          if (expand) {
            e.stopPropagation();

            var c = expand.getAttribute("data-country");

            expandedSet[c] = !expandedSet[c];

            rerender();

            return;
          }

          var row = e.target.closest(".oww-loc-row");

          if (!row) return;

          e.stopPropagation();

          var kind = row.getAttribute("data-kind");

          var val = row.getAttribute("data-value");

          if (kind === "country") {
            expandedSet[val] = !expandedSet[val];

            var newFilter = "country::" + val;

            clearOtherFilters("country");

            activeFilters.country = newFilter;
          } else {
            var newFilter = "state::" + val;

            clearOtherFilters("country");

            activeFilters.country = newFilter;
          }

          activeFilterCounts.country = lookupLocationCount(newFilter);

          updateButtonLabel("country");
          updateResetButton();

          applyFiltersAfterLoading();
          updateURLQuery();

          rerender();

          if (kind === "state" && activeFilters.country) {
            menuEl.classList.add("hidden");
          }
        });
      })
      .catch(function () {
        menuEl.innerHTML =
          '<p class="px-4 py-2 text-[13px] text-red-400 italic">Failed to load</p>';
      });
    btnEl.addEventListener("click", function (e) {
      e.stopPropagation();

      var isHidden = menuEl.classList.contains("hidden");

      document.querySelectorAll(".oww-dropdown").forEach(function (d) {
        d.classList.add("hidden");
      });

      menuEl.classList.toggle("hidden", !isHidden);

      if (!menuEl.classList.contains("hidden")) {
        var si = menuEl.querySelector("#oww-loc-search");

        if (si) {
          setTimeout(function () {
            si.focus();
          }, 50);
        }
      }
    });

    menuEl.addEventListener("click", function (e) {
      e.stopPropagation();
    });

    document.addEventListener("click", function () {
      menuEl.classList.add("hidden");
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") {
        document.querySelectorAll(".oww-dropdown").forEach(function (d) {
          d.classList.add("hidden");
        });
      }
    });
  })();

  /* ── Year ────────────────────────────────────────────────────────── */

  setupMenu(
    "yearMenu",
    "yearBtn",
    "/api/years",
    "years",
    function (items) {
      return buildFlatHTML(items, false);
    },
    "year",
  );

  /* ── Reset filters ───────────────────────────────────────────────── */

  /* ── Reset filters ───────────────────────────────────────────────── */

  if (resetFiltersBtn) {
    resetFiltersBtn.addEventListener("click", function () {
      Object.keys(activeFilters).forEach(function (type) {
        activeFilters[type] = null;
        activeFilterCounts[type] = null;
        updateButtonLabel(type);
      });

      updateResetButton();
      applyFiltersAfterLoading();
      updateURLQuery();
    });
  }

  /* ── Bottom bar pill highlight ───────────────────────────────────── */

  document.querySelectorAll("[data-filter]").forEach(function (b) {
    b.addEventListener("click", function () {
      // Filter logic is handled above.
    });
  });

  /* ── Detail page — vertical thumbnail slider ──────────────────────── */

  (function () {
    var track = document.getElementById("railTrack");

    var viewport = document.getElementById("railViewport");

    var mainPhoto = document.getElementById("mainPhoto");

    if (!track || !viewport) return;

    var realThumbs = Array.prototype.slice.call(
      track.querySelectorAll(".rail-thumb"),
    );

    if (realThumbs.length === 0) return;

    var REAL_COUNT = realThumbs.length;

    // No cloning — the rail stops at the first/last thumb instead of
    // wrapping around and looping forever.
    var CLONE_COUNT = 0;

    realThumbs.forEach(function (el, i) {
      el.dataset.realIndex = String(i);
    });

    // The rail's <img loading="lazy"> only fetches once an element is near
    // the real browser viewport — but the track is one very tall flex column
    // that we move with a CSS transform, so most thumbs sit far outside the
    // viewport at all times regardless of which one is visually centered.
    // The wrap-around thumbs at each end are exactly the ones a first-time
    // visitor is least likely to have scrolled near yet, so without this
    // they're still unfetched the moment the loop reaches them — eager-load
    // just this small set (source thumbs + their clones) upfront instead.
    function forceEagerImage(el) {
      var img = el.querySelector("img");

      if (img) {
        img.loading = "eager";
      }
    }

    function cloneThumb(el) {
      var clone = el.cloneNode(true);

      clone.setAttribute("aria-hidden", "true");
      clone.tabIndex = -1;
      forceEagerImage(clone);

      return clone;
    }

    if (CLONE_COUNT > 0) {
      var headSource = realThumbs.slice(REAL_COUNT - CLONE_COUNT);

      var tailSource = realThumbs.slice(0, CLONE_COUNT);

      headSource.forEach(forceEagerImage);
      tailSource.forEach(forceEagerImage);

      var headClones = headSource.map(cloneThumb);

      var tailClones = tailSource.map(cloneThumb);

      headClones.forEach(function (c) {
        track.insertBefore(c, realThumbs[0]);
      });

      tailClones.forEach(function (c) {
        track.appendChild(c);
      });
    }

    // Rendered order: [tail-of-real clones] + [real thumbs] + [head-of-real clones].
    var els = Array.prototype.slice.call(track.querySelectorAll(".rail-thumb"));

    var REAL_START = CLONE_COUNT;

    var activeIdx = REAL_START;

    if (mainPhoto) {
      for (var mi = 0; mi < REAL_COUNT; mi++) {
        if (
          realThumbs[mi].getAttribute("data-src") ===
          mainPhoto.getAttribute("src")
        ) {
          activeIdx = REAL_START + mi;
          break;
        }
      }
    }

    function centerThumb(idx, animate) {
      var activeThumb = els[idx];

      if (!activeThumb) return;

      var thumbOffsetTop = activeThumb.offsetTop;

      var thumbHeight = activeThumb.offsetHeight;

      var viewportHeight = viewport.clientHeight;

      var targetY = viewportHeight / 2 - (thumbOffsetTop + thumbHeight / 2);

      track.style.transition =
        animate === false ? "none" : "transform 0.45s cubic-bezier(.2,.7,.2,1)";

      track.style.transform = "translateY(" + targetY + "px)";
    }

    function markActive(th) {
      // Intentionally empty.
    }

    function selectThumb(th) {
      if (!th) return;

      if (mainPhoto) {
        var src = th.getAttribute("data-src");

        var alt = th.getAttribute("data-alt");

        mainPhoto.src = src;
        mainPhoto.setAttribute("data-full", th.getAttribute("data-full") || src);
        mainPhoto.alt = alt || "";

        mainPhoto.style.animationDelay = "0s";

        mainPhoto.classList.remove("fade-up");

        void mainPhoto.offsetWidth;

        mainPhoto.classList.add("fade-up");
      }

      var panel = document.getElementById("detailsPanel");

      if (panel) {
        var elKicker = panel.querySelector('[data-field="kicker"]');

        var elTitle = panel.querySelector('[data-field="title"]');

        var elRef = panel.querySelector('[data-field="ref"]');

        var elAbout = panel.querySelector('[data-field="about"]');

        var elAltNote = panel.querySelector('[data-field="altNote"]');

        var elCollection = panel.querySelector('[data-field="collection"]');

        var elCamera = panel.querySelector('[data-field="camera"]');

        var elDate = panel.querySelector('[data-field="date"]');

        var elLocation = panel.querySelector('[data-field="location"]');

        var elCategory = panel.querySelector('[data-field="category"]');

        var elSettings = panel.querySelector('[data-field="settings"]');

        if (elKicker && th.dataset.kicker) {
          elKicker.textContent = th.dataset.kicker;
        }

        if (elTitle && th.dataset.title) {
          elTitle.textContent = th.dataset.title;
        }

        if (elRef && th.dataset.ref) {
          elRef.textContent = th.dataset.ref;
        }

        if (elAbout && th.dataset.about !== undefined) {
          elAbout.textContent = th.dataset.about;
        }

        if (elAltNote && th.dataset.altnote !== undefined) {
          elAltNote.textContent = th.dataset.altnote;
        }

        if (elCollection && th.dataset.collection !== undefined) {
          elCollection.textContent = th.dataset.collection || "Unknown";
        }

        if (elCamera && th.dataset.camera && th.dataset.lens) {
          elCamera.innerHTML =
            th.dataset.camera +
            ' / <span class="text-amber-600 dark:text-amber-400">' +
            th.dataset.lens +
            "</span>";
        }

        if (elDate && th.dataset.date) {
          elDate.textContent = th.dataset.date;
        }

        if (elLocation && th.dataset.location) {
          elLocation.textContent = th.dataset.location;
        }

        if (elCategory && th.dataset.category) {
          elCategory.textContent = th.dataset.category;
        }

        if (elSettings && th.dataset.settings) {
          elSettings.textContent = th.dataset.settings;
        }
      }

      markActive(th);

      var href = th.getAttribute("data-href");

      if (href && window.history.replaceState) {
        window.history.replaceState(null, "", href);
      }
    }

    var offsetsPattern = [44, 28, 16, 8];

    var THUMB_WIDTH = 80;

    var heightPattern = [56, 72, 52, 64, 70, 54, 60];

    function updateDynamicLayout(animate) {
      els.forEach(function (el, i) {
        var dist = Math.abs(i - activeIdx);

        var ml = dist < offsetsPattern.length ? offsetsPattern[dist] : 8;

        var realIdx = Number(el.dataset.realIndex) || 0;

        var h = heightPattern[realIdx % heightPattern.length];

        el.style.transition =
          animate === false
            ? "none"
            : "margin-left 0.4s ease-out, transform 0.3s ease-out, opacity 0.3s ease-out, width 0.3s ease-out, height 0.3s ease-out";

        el.style.marginLeft = ml + "px";

        el.style.width = THUMB_WIDTH + "px";

        el.style.height = h + "px";
      });
    }

    function setActivePhoto(idx) {
      if (els.length === 0) {
        return;
      }

      activeIdx = idx;

      var th = els[activeIdx];

      selectThumb(th);

      updateDynamicLayout(true);

      centerThumb(activeIdx, true);
    }

    function stepActivePhoto(delta) {
      if (els.length === 0) {
        return;
      }

      var next = activeIdx + delta;

      if (next < 0) next = 0;
      if (next > els.length - 1) next = els.length - 1;

      setActivePhoto(next);
    }

    function init() {
      updateDynamicLayout(false);

      centerThumb(activeIdx, false);

      markActive(els[activeIdx]);
    }

    requestAnimationFrame(function () {
      setTimeout(init, 60);
    });

    // Shared by wheel and keyboard so a held-down arrow key can't out-pace
    // the cloned runway (see CLONE_COUNT above) before normalizeAfterSettle
    // gets a chance to fold the index back into range.
    var lastStepTime = 0;

    function throttledStep(delta) {
      var now = Date.now();

      if (now - lastStepTime < 250) {
        return;
      }

      lastStepTime = now;

      stepActivePhoto(delta);
    }

    document.addEventListener(
      "wheel",
      function (e) {
        if (e.target.closest("#detailsPanel")) {
          return;
        }

        if (e.deltaY > 0) {
          throttledStep(1);
        } else if (e.deltaY < 0) {
          throttledStep(-1);
        }
      },
      {
        passive: true,
      },
    );

    document.addEventListener("keydown", function (e) {
      if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
        throttledStep(-1);
      }

      if (e.key === "ArrowDown" || e.key === "ArrowRight") {
        throttledStep(1);
      }
    });

    els.forEach(function (th, i) {
      th.addEventListener("click", function (e) {
        e.preventDefault();

        setActivePhoto(i);
      });
    });
  })();

  /* ── Detail page — click the main photo to expand it full-width ─────── */

  (function () {
    var mainPhoto = document.getElementById("mainPhoto");
    var overlay = document.getElementById("photoZoomOverlay");
    var zoomImg = document.getElementById("photoZoomImg");
    var customCursor = document.getElementById("zoomCursor");

    if (!mainPhoto || !overlay || !zoomImg) return;

    function updateCursor(e) {
      if (!customCursor) return;
      customCursor.style.left = e.clientX + "px";
      customCursor.style.top = e.clientY + "px";
    }

    function openZoom() {
      // The main photo shows a resized copy; zoom loads the original.
      zoomImg.src = mainPhoto.getAttribute("data-full") || mainPhoto.src;
      zoomImg.alt = mainPhoto.alt || "";

      overlay.classList.remove("hidden");
      overlay.classList.add("flex");

      document.body.style.overflow = "hidden";

      if (customCursor) {
        customCursor.classList.remove("opacity-0");
      }
    }

    function closeZoom() {
      overlay.classList.add("hidden");
      overlay.classList.remove("flex");

      document.body.style.overflow = "";

      if (customCursor) {
        customCursor.classList.add("opacity-0");
      }
    }

    mainPhoto.addEventListener("click", openZoom);

    overlay.addEventListener("click", closeZoom);

    overlay.addEventListener("mousemove", updateCursor);

    overlay.addEventListener("mouseenter", function (e) {
      if (customCursor) customCursor.classList.remove("opacity-0");
      updateCursor(e);
    });

    overlay.addEventListener("mouseleave", function () {
      if (customCursor) customCursor.classList.add("opacity-0");
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && !overlay.classList.contains("hidden")) {
        closeZoom();
      }
    });
  })();

  /* ── Detail page — details panel drawer ──────────────────────────── */

  var panel = document.getElementById("detailsPanel");

  var pBtn = document.getElementById("detailToggle");

  var stage = document.getElementById("stage");

  if (panel && pBtn) {
    var plusIcon = document.getElementById("detailPlus");

    var closeIcon = document.getElementById("detailClose");

    var isDesktopLayout = function () {
      return window.matchMedia("(min-width: 768px)").matches;
    };

    pBtn.addEventListener("click", function () {
      var isCurrentlyClosed = panel.classList.contains("translate-x-full");

      if (isCurrentlyClosed) {
        panel.classList.remove("translate-x-full");

        if (plusIcon) {
          plusIcon.classList.add("hidden");
        }

        if (closeIcon) {
          closeIcon.classList.remove("hidden");
        }

        pBtn.classList.remove(
          "bg-white",
          "dark:bg-neutral-900",
          "text-neutral-800",
          "dark:text-white",
          "hover:bg-neutral-100",
          "dark:hover:bg-neutral-800",
        );

        pBtn.classList.add(
          "bg-black",
          "text-white",
          "dark:bg-white",
          "dark:text-black",
          "hover:bg-neutral-900",
          "dark:hover:bg-neutral-100",
        );

        /* if (stage && isDesktopLayout()) {
          stage.style.paddingRight = "380px";
        } */
      } else {
        panel.classList.add("translate-x-full");

        if (plusIcon) {
          plusIcon.classList.remove("hidden");
        }

        if (closeIcon) {
          closeIcon.classList.add("hidden");
        }

        pBtn.classList.remove(
          "bg-black",
          "text-white",
          "dark:bg-white",
          "dark:text-black",
          "hover:bg-neutral-900",
          "dark:hover:bg-neutral-100",
        );

        pBtn.classList.add(
          "bg-white",
          "dark:bg-neutral-900",
          "text-neutral-800",
          "dark:text-white",
          "hover:bg-neutral-100",
          "dark:hover:bg-neutral-800",
        );

        /* if (stage && isDesktopLayout()) {
          stage.style.paddingRight = "120px";
        } */
      }
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && !panel.classList.contains("translate-x-full")) {
        pBtn.click();
      }
    });
  }

  /* ── Detail page — EDITED / RAW ──────────────────────────────────── */

  document.querySelectorAll("[data-take]").forEach(function (b) {
    b.addEventListener("click", function () {
      document.querySelectorAll("[data-take]").forEach(function (o) {
        var on = o === b;

        if (on) {
          o.classList.add(
            "bg-black",
            "text-white",
            "dark:bg-white",
            "dark:text-black",
            "font-semibold",
          );

          o.classList.remove(
            "text-neutral-400",
            "dark:text-neutral-500",
            "hover:text-neutral-700",
            "dark:hover:text-neutral-300",
            "font-medium",
          );
        } else {
          o.classList.remove(
            "bg-black",
            "text-white",
            "dark:bg-white",
            "dark:text-black",
            "font-semibold",
          );

          o.classList.add(
            "text-neutral-400",
            "dark:text-neutral-500",
            "hover:text-neutral-700",
            "dark:hover:text-neutral-300",
            "font-medium",
          );
        }
      });
    });
  });

  /* ── Detail page — ambient sound ─────────────────────────────────── */

  var amb = document.getElementById("ambientBtn");

  if (amb) {
    amb.addEventListener("click", function () {
      amb.classList.toggle("text-ink/55");

      amb.classList.toggle("dark:text-white/55");
    });
  }

  /* ── Grid view — normal wheel scrolls sideways ───────────────────── */

  var strip = document.getElementById("gridStrip");

  if (strip) {
    strip.addEventListener(
      "wheel",
      function (e) {
        if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) {
          return;
        }

        e.preventDefault();

        strip.scrollLeft += e.deltaY;
      },
      {
        passive: false,
      },
    );
  }

  /* ── Photo cursor — Flow, Grid and Detail ───────────────────── */

  /*
   * One shared "+" cursor for every photo, instead of a copy inside each
   * tile. It is position:fixed and moved with a GPU transform once per
   * animation frame, so mousemove does no layout work (no
   * getBoundingClientRect, no left/top writes) and stays smooth while
   * images are loading or decoding.
   */
  (function () {
    if (!window.matchMedia || !window.matchMedia("(hover: hover)").matches) {
      return;
    }

    var cursor = document.createElement("span");

    cursor.className = "photo-plus-cursor";
    cursor.setAttribute("aria-hidden", "true");
    cursor.innerHTML =
      '<svg class="photo-plus-ring" viewBox="0 0 68 68" fill="none">' +
      '<circle cx="34" cy="34" r="32" fill="rgba(255,255,255,0.055)"></circle>' +
      '<g stroke="rgba(255,255,255,0.75)" stroke-width="1.2" stroke-linecap="round">' +
      '<path d="M 22 3.5 A 30.5 30.5 0 0 1 46 3.5"></path>' +
      '<path d="M 64.5 22 A 30.5 30.5 0 0 1 64.5 46"></path>' +
      '<path d="M 46 64.5 A 30.5 30.5 0 0 1 22 64.5"></path>' +
      '<path d="M 3.5 46 A 30.5 30.5 0 0 1 3.5 22"></path>' +
      "</g>" +
      "</svg>" +
      '<svg class="photo-plus-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round">' +
      '<path d="M12 5v14M5 12h14"></path>' +
      "</svg>";

    document.body.appendChild(cursor);

    var activePhoto = null;
    var mouseX = 0;
    var mouseY = 0;
    var frame = 0;

    function render() {
      frame = 0;
      cursor.style.transform =
        "translate3d(" + mouseX + "px, " + mouseY + "px, 0) translate(-50%, -50%)";
    }

    function queueRender() {
      if (!frame) {
        frame = requestAnimationFrame(render);
      }
    }

    function show(photo) {
      if (activePhoto && activePhoto !== photo) {
        activePhoto.classList.remove("cursor-none");
      }

      activePhoto = photo;
      photo.classList.add("cursor-none");
      cursor.classList.add("is-visible");
    }

    function hide() {
      if (activePhoto) {
        activePhoto.classList.remove("cursor-none");
      }

      activePhoto = null;
      cursor.classList.remove("is-visible");
    }

    document.addEventListener(
      "mousemove",
      function (e) {
        mouseX = e.clientX;
        mouseY = e.clientY;

        if (activePhoto) {
          queueRender();
        }
      },
      { passive: true },
    );

    document.addEventListener("mouseover", function (e) {
      var photo = e.target.closest && e.target.closest(".photo-item");

      if (!photo) {
        if (activePhoto) {
          hide();
        }
        return;
      }

      mouseX = e.clientX;
      mouseY = e.clientY;
      render();
      show(photo);
    });

    document.addEventListener("mouseout", function (e) {
      if (!activePhoto) {
        return;
      }

      // Moving between children of the same photo keeps the cursor.
      if (e.relatedTarget && activePhoto.contains(e.relatedTarget)) {
        return;
      }

      // Leaving the window, or onto something that isn't a photo
      // (mouseover then shows it again if it is another photo).
      if (!e.relatedTarget || !e.relatedTarget.closest(".photo-item")) {
        hide();
      }
    });

    // A photo can be hidden or removed under a still mouse (filters,
    // Flow/Grid switch, zoom overlay opening) without any mouseout.
    document.addEventListener("click", function () {
      requestAnimationFrame(function () {
        if (activePhoto && (!activePhoto.isConnected || activePhoto.offsetParent === null)) {
          hide();
        }
      });
    });
  })();

  /* ── Photo fade-in — show each photo once it has loaded ──────────── */

  (function () {
    function markLoaded(img) {
      img.classList.add("is-loaded");
    }

    document.addEventListener(
      "load",
      function (e) {
        if (e.target.classList && e.target.classList.contains("photo-img")) {
          markLoaded(e.target);
        }
      },
      true,
    );

    document.addEventListener(
      "error",
      function (e) {
        if (e.target.classList && e.target.classList.contains("photo-img")) {
          markLoaded(e.target);
        }
      },
      true,
    );

    Array.prototype.forEach.call(document.querySelectorAll(".photo-img"), function (img) {
      if (img.complete) {
        markLoaded(img);
      }
    });
  })();

  /* ── Grid view — infinite horizontal scroll + pagination ─────────── */

  (function () {
    var track = document.getElementById("gridTrack");

    if (!strip || !track) return;

    var copies = Array.prototype.slice.call(
      track.querySelectorAll(".grid-copy"),
    );

    if (copies.length === 0) {
      return;
    }

    var EDGE_TOLERANCE = 4;
    var LOAD_MARGIN = 1200;

    // The wrap-around (jump back by one copy at either end) only works with
    // at least two identical copies side by side. With the single copy
    // index.ejs renders, "one copy" is the whole strip: it would open at
    // the far end, then bounce between both ends on every scroll event.
    var looping = copies.length > 1;

    var copyWidth = 0;

    var pageSize = parseInt(strip.getAttribute("data-page-size"), 10) || 30;

    var offset = parseInt(strip.getAttribute("data-offset"), 10) || 0;

    var hasMore = strip.getAttribute("data-has-more") === "1";

    var loading = false;

    function buildGridItem(p) {
      var a = document.createElement("a");

      a.href = "/photo/" + encodeURIComponent(p.slug);

      a.className =
        "photo-item group relative shrink-0 overflow-visible h-[43.3vh] max-h-[calc(100vh-460px)]";

      a.setAttribute("data-category", p.category || "");

      a.setAttribute("data-collection", p.collection || "");

      a.setAttribute("data-camera", p.camera || "");

      a.setAttribute("data-lens", p.lens || "");

      a.setAttribute("data-country", p.country || "");

      a.setAttribute("data-state", p.state || "");

      a.setAttribute("data-year", p.year || "");

      var gridAspect = photoAspect(p);

      a.innerHTML =
        "<img" +
        photoImgAttrs(
          p,
          gridAspect ? "calc(43.3vh * " + gridAspect.toFixed(4) + ")" : "960px",
        ) +
        ' class="photo-img h-full w-auto object-cover select-none"' +
        (p.color ? ' style="background-color: ' + escAttr(p.color) + '"' : "") +
        ">" +
        // Hover frame (Corners)
        '<span aria-hidden="true" class="pointer-events-none absolute top-0 left-0 w-[44px] h-[48px] -translate-x-[9px] -translate-y-[9px] border-t-2 border-l-2 border-[#F4B508] opacity-0 group-hover:opacity-100 transition-opacity duration-300"></span>' +
        '<span aria-hidden="true" class="pointer-events-none absolute top-0 right-0 w-[44px] h-[48px] translate-x-[9px] -translate-y-[9px] border-t-2 border-r-2 border-[#F4B508] opacity-0 group-hover:opacity-100 transition-opacity duration-300"></span>' +
        '<span aria-hidden="true" class="pointer-events-none absolute bottom-0 left-0 w-[44px] h-[48px] -translate-x-[9px] translate-y-[9px] border-b-2 border-l-2 border-[#F4B508] opacity-0 group-hover:opacity-100 transition-opacity duration-300"></span>' +
        '<span aria-hidden="true" class="pointer-events-none absolute bottom-0 right-0 w-[44px] h-[48px] translate-x-[9px] translate-y-[9px] border-b-2 border-r-2 border-[#F4B508] opacity-0 group-hover:opacity-100 transition-opacity duration-300"></span>' +
        // Caption
        '<span class="pointer-events-none absolute left-1/2 -translate-x-1/2 top-full mt-2.5 whitespace-nowrap font-tight text-[14px] font-medium leading-none tracking-[-0.01em] text-center text-ink dark:text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300">' +
        esc(p.cap) +
        "</span>";

      return a;
    }

    function measure() {
      copyWidth = strip.scrollWidth / copies.length;
    }

    function restoreGridScrollPosition() {
      measure();

      if (copyWidth <= 0) {
        return;
      }

      var savedPosition = getGridScrollPosition();

      if (savedPosition !== null) {
        strip.scrollLeft = savedPosition;
      } else {
        // First visit to Grid: the first photo, or — when looping — the
        // start of the middle copy, so there's room to scroll both ways.
        strip.scrollLeft = looping ? copyWidth : 0;
      }
    }

    // Each Grid photo is as wide as its image, so a photo still downloading
    // (e.g. right after a hard refresh) is 0px wide and shoves the ones
    // after it sideways once it arrives. Keep the strip invisible until the
    // photos have loaded (capped, so one slow image can't hold it blank),
    // then place it and fade it in.
    var revealTimer = null;

    function showGrid() {
      var pending = Array.prototype.slice
        .call(track.querySelectorAll("img"))
        .filter(function (img) {
          return !img.complete;
        });

      if (!pending.length) {
        restoreGridScrollPosition();
        return;
      }

      var left = pending.length;
      var done = false;

      strip.style.transition = "";
      strip.style.opacity = "0";

      function reveal() {
        if (done) {
          return;
        }

        done = true;
        clearTimeout(revealTimer);
        restoreGridScrollPosition();
        strip.style.transition = "opacity .35s ease";
        strip.style.opacity = "1";
      }

      pending.forEach(function (img) {
        function settle() {
          if (--left === 0) {
            reveal();
          }
        }

        img.addEventListener("load", settle, { once: true });
        img.addEventListener("error", settle, { once: true });
      });

      revealTimer = setTimeout(reveal, 2000);
    }

    function loadNextPage() {
      if (loading || !hasMore) {
        return null;
      }

      loading = true;

      return fetch("/api/photos/grid?offset=" + offset + "&limit=" + pageSize)
        .then(function (r) {
          return r.json();
        })
        .then(function (data) {
          if (data && data.success && data.photos && data.photos.length) {
            copies.forEach(function (copyEl) {
              data.photos.forEach(function (p) {
                copyEl.appendChild(buildGridItem(p));
              });
            });

            offset = data.nextOffset;

            applyFilters();
          }

          hasMore = !!(data && data.hasMore);

          loading = false;
        })
        .catch(function () {
          loading = false;
        });
    }

    function loadAllRemaining() {
      if (!hasMore) {
        return Promise.resolve();
      }

      var p = loadNextPage();

      return p ? p.then(loadAllRemaining) : Promise.resolve();
    }

    gridLoadAll = loadAllRemaining;
    restoreGridScroll = showGrid;

    strip.addEventListener("scroll", function () {
      saveGridScrollPosition(strip);

      measure();

      if (copyWidth <= 0) {
        return;
      }

      var maxScrollLeft = strip.scrollWidth - strip.clientWidth;

      // New photos are appended at the end, so only the right end needs
      // them — the left end does too only when it wraps around.
      if (
        hasMore &&
        (strip.scrollLeft >= maxScrollLeft - LOAD_MARGIN ||
          (looping && strip.scrollLeft <= LOAD_MARGIN))
      ) {
        loadNextPage();
      }

      if (!looping) {
        return;
      }

      if (strip.scrollLeft <= EDGE_TOLERANCE) {
        strip.scrollLeft += copyWidth;
      } else if (strip.scrollLeft >= maxScrollLeft - EDGE_TOLERANCE) {
        strip.scrollLeft -= copyWidth;
      }
    });

    window.addEventListener("load", restoreGridScrollPosition);

    window.addEventListener("resize", measure);

    requestAnimationFrame(function () {
      setTimeout(restoreGridScrollPosition, 60);
    });
  })();

  //

  /* ── Flow view — scattered grid layout + infinite scroll ─────────── */

  (function () {
    var canvas = document.getElementById("flowCanvas");

    var sentinel = document.getElementById("flowSentinel");

    if (!canvas || !sentinel) {
      return;
    }

    /* ── Remember Flow's vertical scroll position ─────────────────── */

    window.addEventListener(
      "scroll",
      function () {
        // Switching to the Grid tab hides #flowView, which collapses the
        // document's scrollable height and forces the browser to snap
        // window.scrollY to 0 — that spurious scroll event must not
        // overwrite the position we still want to restore on switching back.
        if (canvas.offsetParent === null) {
          return;
        }

        saveFlowScrollPosition();
      },
      {
        passive: true,
      },
    );

    function restoreFlowScrollPosition() {
      var savedPosition = getFlowScrollPosition();

      window.scrollTo(0, savedPosition);
    }
    /*
     * IMPORTANT:
     *
     * #flowCanvas is a sparse scatter on a fixed grid, not a packed
     * masonry: roughly half the cells are deliberately left empty. The
     * grid is FLOW_COLS columns wide with a fixed row step, and every
     * photo is one of two sizes:
     *
     *  - small: 1 column wide, reserves 1 row
     *  - large: 2 columns wide, reserves 2 rows
     *
     * Width is fixed by the size. A large tile fills its whole 2-row box
     * (cropped to fit); a small tile's height follows its photo's own
     * aspect ratio, capped to its row (see flowSizeTile).
     *
     * Photos are placed in DOM order, row by row. Each row only takes a
     * few new tiles (FLOW_ROW_QUOTA), dropped into seeded-random free
     * columns, with columns that don't touch a neighbor weighted higher —
     * that's what leaves the white space around each photo. Everything is
     * seeded (by slug, and by row index), so re-running the layout on
     * resize, filter or infinite-scroll puts every photo back in the
     * same cell.
     *
     * Placement only depends on each photo's size, not on its image, so
     * it runs immediately; once an image loads, only that tile's height
     * is corrected (flowSizeTile) — nothing else moves.
     */

    // Seeded PRNG (mulberry32) — deterministic per seed.
    function flowRng(seed) {
      var t = seed + 0x6d2b79f5;

      return function () {
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);

        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    }

    function flowSeed(slug) {
      var h = 0;

      for (var i = 0; i < slug.length; i++) {
        h = (Math.imul(31, h) + slug.charCodeAt(i)) | 0;
      }

      return h;
    }

    // Proportions measured from the reference design: column gap is 20%
    // of a column's width, the row step is 1.3x the column step, ~37% of
    // photos are large, and about 2-3 photos start on each row (of 8
    // columns — scaled down for narrower grids).
    var FLOW_GAP_RATIO = 0.2;
    var FLOW_ROW_RATIO = 1.3;
    var FLOW_LARGE_CHANCE = 0.37;
    var FLOW_ROW_QUOTA = [1, 2, 2, 2, 3, 3, 4];
    var FLOW_LOOSE_WEIGHT = 4;

    function flowColumnCount() {
      var w = window.innerWidth;

      if (w <= 560) {
        return 4;
      }

      return 8;
    }

    var flowCols = 8;
    var flowColWidth = 0;
    var flowGap = 0;
    var flowRowStep = 0;
    var flowPadLeft = 0;
    var flowPadTop = 0;
    var flowOcc = [];
    var flowRow = 0;
    var flowRowLeft = 0;
    var flowPatternIndex = 0;

    // Fixed Flow pattern (8 columns), measured from the reference design.
    // Photos fill these slots in DOM order; after the last slot the whole
    // block repeats FLOW_PATTERN_ROWS rows further down. row/col are grid
    // cells, span 2 = large (2 cols x 2 rows), drop = offset within the
    // row as a fraction of the row step.
    var FLOW_PATTERN_ROWS = 9;
    var FLOW_PATTERN = [
      { row: 0, col: 2, span: 1, drop: 0 },
      { row: 0, col: 5, span: 1, drop: 0 },
      { row: 1, col: 0, span: 2, drop: 0 },
      { row: 1, col: 3, span: 1, drop: 0 },
      { row: 1, col: 4, span: 2, drop: 0 },
      { row: 1, col: 7, span: 1, drop: 0 },
      { row: 2, col: 6, span: 1, drop: 0 },
      { row: 3, col: 1, span: 1, drop: 0.05 },
      { row: 3, col: 2, span: 2, drop: 0 },
      { row: 3, col: 6, span: 2, drop: 0 },
      { row: 4, col: 0, span: 1, drop: 0 },
      { row: 4, col: 4, span: 1, drop: 0 },
      { row: 5, col: 1, span: 1, drop: 0 },
      { row: 5, col: 3, span: 2, drop: 0 },
      { row: 5, col: 7, span: 1, drop: 0 },
      { row: 6, col: 0, span: 1, drop: 0 },
      { row: 6, col: 5, span: 1, drop: 0.12 },
      { row: 7, col: 1, span: 2, drop: 0 },
      { row: 7, col: 5, span: 2, drop: 0 },
    ];

    function flowPlacePattern(a) {
      var i = flowPatternIndex++;
      var slot = FLOW_PATTERN[i % FLOW_PATTERN.length];
      var cycle = Math.floor(i / FLOW_PATTERN.length);
      var row = cycle * FLOW_PATTERN_ROWS + slot.row;

      flowOccupy(row, slot.col, slot.span);

      a._flow = { row: row, col: slot.col, span: slot.span, drop: slot.drop };
      a.style.position = "absolute";

      flowSizeTile(a);
      flowWatchImage(a);
    }

    function flowRowQuota(row) {
      var r = flowRng(row * 7919 + 17);
      var q = FLOW_ROW_QUOTA[Math.floor(r() * FLOW_ROW_QUOTA.length)];

      return Math.max(1, Math.round((q * flowCols) / 8));
    }

    function flowStartRow(row) {
      flowRow = row;
      flowRowLeft = flowRowQuota(row);
    }

    function flowFree(row, col) {
      return col >= 0 && col < flowCols && !(flowOcc[row] && flowOcc[row][col]);
    }

    function flowFits(row, col, span) {
      for (var r = row; r < row + span; r++) {
        for (var c = col; c < col + span; c++) {
          if (!flowFree(r, c)) {
            return false;
          }
        }
      }

      return true;
    }

    // Free columns in `row` a tile of `span` fits at, each weighted —
    // a column that leaves an empty cell on both sides counts
    // FLOW_LOOSE_WEIGHT times, so tiles mostly keep white space between
    // them but can still sit side by side now and then.
    function flowCandidates(row, span) {
      var out = [];

      for (var c = 0; c <= flowCols - span; c++) {
        if (!flowFits(row, c, span)) {
          continue;
        }

        var loose = flowFree(row, c - 1) && flowFree(row, c + span);
        var weight = loose ? FLOW_LOOSE_WEIGHT : 1;

        for (var k = 0; k < weight; k++) {
          out.push(c);
        }
      }

      return out;
    }

    function flowOccupy(row, col, span) {
      for (var r = row; r < row + span; r++) {
        while (flowOcc.length <= r) {
          flowOcc.push(new Array(flowCols).fill(false));
        }

        for (var c = col; c < col + span; c++) {
          flowOcc[r][c] = true;
        }
      }
    }

    // Sets a placed tile's size. A large tile always fills its whole
    // 2x2 box — a tall portrait frame, like the reference design — with
    // object-cover cropping whatever doesn't fit. A small tile follows
    // its photo's own aspect ratio (3:4 portrait until the image has
    // loaded), capped to its one row. Either way, plus its small seeded
    // drop within the row.
    function flowSizeTile(a) {
      var t = a._flow;

      if (!t) {
        return;
      }

      if (!a._flowAspect) {
        // Natural size from the server (data-aspect), so the tile gets its
        // final height before the image has even started loading.
        a._flowAspect = parseFloat(a.getAttribute("data-aspect")) || 0;
      }

      var width = t.span * flowColWidth + (t.span - 1) * flowGap;
      var reserved = t.span * flowRowStep - flowGap;
      var aspect = a._flowAspect || 3 / 4;
      var height = t.span > 1 ? reserved : Math.min(width / aspect, reserved);
      var drop = Math.min(t.drop * flowRowStep, Math.max(0, reserved - height));

      a.style.width = width + "px";
      a.style.height = height + "px";

      // Tell the browser the exact rendered width (object-cover may need
      // wider than the tile for a landscape photo in a tall box), so srcset
      // picks the smallest resized copy that is still sharp.
      var img = a._flowImg || (a._flowImg = a.querySelector("img"));

      if (img && img.hasAttribute("srcset")) {
        var needed = Math.ceil(Math.max(width, height * aspect));

        if (img._flowSizes !== needed) {
          img._flowSizes = needed;
          img.sizes = needed + "px";
        }
      }
      a.style.left = flowPadLeft + t.col * (flowColWidth + flowGap) + "px";
      a.style.top = flowPadTop + t.row * flowRowStep + drop + "px";
    }

    function flowWatchImage(a) {
      if (a._flowWatched) {
        return;
      }

      a._flowWatched = true;

      var img = a.querySelector("img");

      if (!img) {
        return;
      }

      function measure() {
        if (img.naturalWidth && img.naturalHeight) {
          a._flowAspect = img.naturalWidth / img.naturalHeight;
          flowSizeTile(a);
        }
      }

      if (img.complete) {
        measure();
      } else {
        img.addEventListener("load", measure, { once: true });
      }
    }

    function flowPlace(a) {
      if (flowCols === 8) {
        flowPlacePattern(a);
        return;
      }

      var r = flowRng(flowSeed(a.getAttribute("data-slug") || ""));
      var span = r() < FLOW_LARGE_CHANCE ? 2 : 1;
      // A few tiles sit slightly below their row line, like the reference.
      var drop = r() < 0.3 ? 0.05 + r() * 0.09 : 0;
      var col;

      for (;;) {
        if (flowRowLeft > 0) {
          var options = flowCandidates(flowRow, span);

          if (options.length) {
            col = options[Math.floor(r() * options.length)];
            break;
          }
        }

        flowStartRow(flowRow + 1);
      }

      flowOccupy(flowRow, col, span);
      flowRowLeft--;

      a._flow = { row: flowRow, col: col, span: span, drop: drop };
      a.style.position = "absolute";

      flowSizeTile(a);
      flowWatchImage(a);
    }

    // Lays out every visible photo from scratch. Cheap enough to re-run
    // on every resize, filter change and infinite-scroll page, and fully
    // deterministic, so photos already on screen never jump.
    function layoutFlow() {
      if (canvas.offsetParent === null) {
        return;
      }

      flowLastWidth = canvas.clientWidth;

      var style = getComputedStyle(canvas);
      var padRight = parseFloat(style.paddingRight) || 0;
      var padBottom = parseFloat(style.paddingBottom) || 0;

      flowPadLeft = parseFloat(style.paddingLeft) || 0;
      flowPadTop = parseFloat(style.paddingTop) || 0;
      flowCols = flowColumnCount();

      var inner = canvas.clientWidth - flowPadLeft - padRight;

      flowColWidth = inner / (flowCols + (flowCols - 1) * FLOW_GAP_RATIO);
      flowGap = flowColWidth * FLOW_GAP_RATIO;
      flowRowStep = (flowColWidth + flowGap) * FLOW_ROW_RATIO;
      flowOcc = [];
      flowPatternIndex = 0;
      flowStartRow(0);

      Array.prototype.slice
        .call(canvas.querySelectorAll(".photo-item"))
        .forEach(function (a) {
          if (a.style.display === "none") {
            a._flow = null;
            return;
          }

          flowPlace(a);
        });

      canvas.style.height =
        Math.max(0, flowPadTop + flowOcc.length * flowRowStep - flowGap + padBottom) +
        "px";
    }

    var flowResizeTimer = null;
    var flowLastWidth = 0;

    canvas.className = "relative px-2 pt-6 pb-18 overflow-visible";
    layoutFlow();
    flowRelayout = layoutFlow;

    // head.ejs keeps #flowCanvas invisible until .is-ready. Wait for the
    // eagerly-loaded (first-screen) photos too, since a small tile only
    // gets its real height once its image loads — capped so one slow
    // image can't hold the whole page blank.
    (function revealFlow() {
      var pending = Array.prototype.slice
        .call(canvas.querySelectorAll('img[loading="eager"]'))
        .filter(function (img) {
          return !img.complete;
        });
      var done = false;

      function reveal() {
        if (done) {
          return;
        }

        done = true;
        canvas.classList.add("is-ready");
      }

      if (!pending.length) {
        reveal();
        return;
      }

      var left = pending.length;

      pending.forEach(function (img) {
        function settle() {
          if (--left === 0) {
            reveal();
          }
        }

        img.addEventListener("load", settle, { once: true });
        img.addEventListener("error", settle, { once: true });
      });

      setTimeout(reveal, 1200);
    })();

    window.addEventListener("resize", function () {
      if (canvas.offsetParent === null) {
        return;
      }

      clearTimeout(flowResizeTimer);
      flowResizeTimer = setTimeout(function () {
        if (canvas.clientWidth !== flowLastWidth) {
          flowLastWidth = canvas.clientWidth;
          layoutFlow();
        }
      }, 150);
    });

    var pageSize = parseInt(canvas.getAttribute("data-page-size"), 10) || 30;

    var offset = parseInt(canvas.getAttribute("data-offset"), 10) || 0;

    var hasMore = canvas.getAttribute("data-has-more") === "1";

    var nextIndex = offset;
    var loading = false;
    function buildPhotoItem(p) {
      var a = document.createElement("a");

      a.href = "/photo/" + encodeURIComponent(p.slug);

      a.className =
        "photo-item group block overflow-visible shadow-sm hover:z-10 focus-visible:z-10";

      a.setAttribute("data-index", nextIndex++);
      a.setAttribute("data-slug", p.slug || "");
      a.setAttribute("data-category", p.category || "");
      a.setAttribute("data-collection", p.collection || "");
      a.setAttribute("data-camera", p.camera || "");
      a.setAttribute("data-lens", p.lens || "");
      a.setAttribute("data-country", p.country || "");
      a.setAttribute("data-state", p.state || "");
      a.setAttribute("data-year", p.year || "");

      if (photoAspect(p)) {
        a.setAttribute("data-aspect", photoAspect(p).toFixed(4));
      }

      a.innerHTML =
        '<div class="relative h-full"' +
        (p.color ? ' style="background-color: ' + escAttr(p.color) + '"' : "") +
        ">" +
        "<img" +
        // flowSizeTile replaces sizes with the tile's exact width once placed
        photoImgAttrs(p, "(max-width: 560px) 50vw, 26vw") +
        ' class="photo-img block w-full h-full object-cover select-none">' +
        // Hover frame
        '<span aria-hidden="true" class="pointer-events-none absolute top-0 left-0 w-[44px] h-[48px] -translate-x-[9px] -translate-y-[9px] border-t-2 border-l-2 border-[#F4B508] opacity-0 group-hover:opacity-100 transition-opacity duration-300"></span>' +
        '<span aria-hidden="true" class="pointer-events-none absolute top-0 right-0 w-[44px] h-[48px] translate-x-[9px] -translate-y-[9px] border-t-2 border-r-2 border-[#F4B508] opacity-0 group-hover:opacity-100 transition-opacity duration-300"></span>' +
        '<span aria-hidden="true" class="pointer-events-none absolute bottom-0 left-0 w-[44px] h-[48px] -translate-x-[9px] translate-y-[9px] border-b-2 border-l-2 border-[#F4B508] opacity-0 group-hover:opacity-100 transition-opacity duration-300"></span>' +
        '<span aria-hidden="true" class="pointer-events-none absolute bottom-0 right-0 w-[44px] h-[48px] translate-x-[9px] translate-y-[9px] border-b-2 border-r-2 border-[#F4B508] opacity-0 group-hover:opacity-100 transition-opacity duration-300"></span>' +
        "</div>" +
        // Caption
        '<span class="pointer-events-none block h-0 mt-2.5 text-center whitespace-nowrap font-tight text-[14px] font-medium leading-none tracking-[-0.01em] text-ink dark:text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300">' +
        esc(p.cap) +
        "</span>";

      return a;
    }

    function appendPhotos(newPhotos) {
      newPhotos.forEach(function (p) {
        var a = buildPhotoItem(p);

        canvas.appendChild(a);
      });

      /*
       * Apply currently active filters after adding new photos — this
       * also re-runs the Flow layout (flowRelayout), which places them.
       */
      applyFilters();
    }

    function loadNextPage() {
      if (loading || !hasMore) {
        return null;
      }

      loading = true;

      return fetch("/api/photos/flow?offset=" + offset + "&limit=" + pageSize)
        .then(function (r) {
          return r.json();
        })
        .then(function (data) {
          if (data && data.success && data.photos && data.photos.length) {
            appendPhotos(data.photos);

            offset = data.nextOffset;
          }

          hasMore = !!(data && data.hasMore);

          if (!hasMore) {
            observer.unobserve(sentinel);
          }

          loading = false;
        })
        .catch(function () {
          loading = false;
        });
    }

    function loadAllRemaining() {
      if (!hasMore) {
        return Promise.resolve();
      }

      var p = loadNextPage();

      return p ? p.then(loadAllRemaining) : Promise.resolve();
    }

    flowLoadAll = loadAllRemaining;
    restoreFlowScroll = restoreFlowScrollPosition;

    // A large rootMargin here would fire loadNextPage() almost immediately
    // on page load (the sentinel is "nearly visible" before the visitor
    // has scrolled at all), fetching a second batch the visitor may never
    // scroll to. Keeping this small means the next page only loads once
    // the visitor has actually scrolled close to the bottom.
    var observer = new IntersectionObserver(
      function (entries) {
        if (entries[0].isIntersecting) {
          loadNextPage();
        }
      },
      {
        rootMargin: "150px 0px",
      },
    );

    if (hasMore) {
      observer.observe(sentinel);
    }

    window.addEventListener("load", restoreFlowScrollPosition);

    requestAnimationFrame(function () {
      setTimeout(restoreFlowScrollPosition, 60);
    });
  })();

  /* ── Photo detail — Back to previous page ─────────────────────────── */

  (function () {
    var backBtn = document.getElementById("photoBackBtn");

    if (!backBtn) return;

    backBtn.addEventListener("click", function (e) {
      e.preventDefault();

      if (
        document.referrer &&
        document.referrer.indexOf(window.location.host) !== -1
      ) {
        window.history.back();
      } else {
        window.location.href = "/";
      }
    });
  })();
})();
