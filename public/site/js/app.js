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

  var FLOW_CAMERA_KEY = "oww:flow-camera";
  var GRID_SCROLL_KEY = "oww:grid-scroll";

  if ("scrollRestoration" in history) {
    history.scrollRestoration = "manual";
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

  // Dark is the default; light only when the visitor picked it with the toggle.
  var savedTheme = null;
  try {
    savedTheme = localStorage.getItem(KEY);
  } catch (err) {}
  if (savedTheme !== "light") root.classList.add("dark");

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

  // Re-apply the saved theme whenever this page is shown again. The back
  // button restores the previous page from the browser's cache exactly as
  // it was, so a theme picked on the detail page would otherwise be lost
  // until a reload. The storage event keeps other open tabs in sync too.
  function applySavedTheme() {
    var saved = null;

    try {
      saved = localStorage.getItem(KEY);
    } catch (err) {
      return;
    }

    root.classList.toggle("dark", saved !== "light");
    updateThemeIcons();
  }

  window.addEventListener("pageshow", applySavedTheme);

  window.addEventListener("storage", function (e) {
    if (e.key === KEY) {
      applySavedTheme();
    }
  });

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
      // Several filters can be active at once (combined with AND).
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
  // Whether one photo passes the active filters. `get(name)` returns its value
  // for a data attribute name (category, collection, camera, lens, country,
  // state, year) — from a .photo-item's data-* or a Flow photo object.
  // `skipType` leaves one filter type out — used to count the options of
  // that type's own menu against all the other active filters.
  function photoMatchesFilters(get, skipType) {
    var visible = true;

    Object.keys(activeFilters).forEach(function (type) {
      var val = activeFilters[type];

      if (!val || type === skipType) return;

      if (type === "country") {
        var separatorIndex = val.indexOf("::");

        if (separatorIndex === -1) {
          visible = false;
          return;
        }

        var prefix = val.slice(0, separatorIndex);
        var slug = val.slice(separatorIndex + 2).toLowerCase();
        var field = prefix === "country" ? "country" : "state";

        if ((get(field) || "").trim().toLowerCase() !== slug) {
          visible = false;
        }
      } else if ((get(dataAttrMap[type]) || "").trim().toLowerCase() !== val.toLowerCase()) {
        visible = false;
      }
    });

    return visible;
  }

  /* ── Faceted menus ──
     Every live photo (with its filter fields) is embedded in the gallery
     page as #flowData. Each menu's options and counts are recomputed from
     the photos matching all the *other* active filters, so after picking
     one filter the rest only offer values that still have photos. */
  var facetPhotos;

  function getFacetPhotos() {
    if (facetPhotos !== undefined) return facetPhotos;

    var el = document.getElementById("flowData");
    facetPhotos = null;

    if (el) {
      try {
        facetPhotos = JSON.parse(el.textContent || "[]");
      } catch (e) {
        facetPhotos = null;
      }
    }

    return facetPhotos;
  }

  function lowerKey(v) {
    return String(v || "").trim().toLowerCase();
  }

  // { lowercased value: photo count } for one filter type. Location keys
  // are "country::name" / "state::name", matching activeFilters.country.
  function facetCounts(type) {
    var photos = getFacetPhotos();
    var counts = {};

    if (!photos) return null;

    function add(k) {
      if (k) counts[k] = (counts[k] || 0) + 1;
    }

    photos.forEach(function (p) {
      if (!photoMatchesFilters(function (name) { return p[name]; }, type)) return;

      if (type === "country") {
        if (lowerKey(p.country)) add("country::" + lowerKey(p.country));
        if (lowerKey(p.state)) add("state::" + lowerKey(p.state));
      } else {
        add(lowerKey(p[dataAttrMap[type]]));
      }
    });

    return counts;
  }

  // Menu items from the API with counts replaced by faceted ones; options
  // with no matching photos are dropped (except the currently selected one).
  function facetItems(type, items) {
    var counts = facetCounts(type);

    if (!counts || !items) return items;

    var active = lowerKey(activeFilters[type]);

    function keep(name, count) {
      return count > 0 || (active && lowerKey(name) === active);
    }

    // Grouped (cameras, lenses): { brand, models: [{ name, count }] }
    if (items.length && items[0].models) {
      return items
        .map(function (g) {
          return {
            brand: g.brand,
            models: (g.models || [])
              .map(function (m) {
                return { name: m.name, count: counts[lowerKey(m.name)] || 0 };
              })
              .filter(function (m) { return keep(m.name, m.count); }),
          };
        })
        .filter(function (g) { return g.models.length > 0; });
    }

    // Flat (categories, collections, years): { title, count, parent? }
    var mapped = items.map(function (it) {
      return Object.assign({}, it, { count: counts[lowerKey(it.title)] || 0 });
    });
    var kept = mapped.filter(function (it) { return keep(it.title, it.count); });

    // A parent category stays while any of its sub-categories does, so the
    // children keep their place under it.
    return mapped.filter(function (it) {
      return (
        kept.indexOf(it) !== -1 ||
        kept.some(function (k) { return k.parent && k.parent === it.title; })
      );
    });
  }

  var facetMenus = {}; // filter type → re-render its menu

  function refreshFacets() {
    if (!getFacetPhotos()) return;

    Object.keys(facetMenus).forEach(function (type) {
      facetMenus[type]();
    });

    // Each active filter's pill shows how many photos are on screen for it.
    Object.keys(activeFilters).forEach(function (type) {
      if (!activeFilters[type]) return;

      var counts = facetCounts(type);
      activeFilterCounts[type] = counts[lowerKey(activeFilters[type])] || 0;
      updateButtonLabel(type);
    });
  }

  function applyFilters() {
    var photos = document.querySelectorAll(".photo-item");

    photos.forEach(function (el) {
      // The detail page's main photo also uses .photo-item for styling,
      // but it is not part of the filterable Flow/Grid gallery. Flow's own
      // tiles are rebuilt from the filtered set by flowRelayout() below.
      if (el.querySelector("#mainPhoto") || el.classList.contains("flow-tile")) {
        return;
      }

      var visible = photoMatchesFilters(function (name) {
        return el.getAttribute("data-" + name);
      });

      el.style.display = visible ? "" : "none";
    });
    if (flowRelayout) {
      flowRelayout();
    }
    refreshFacets();
  }

  // Filters of different types combine with AND — a photo must match every
  // active one. Picking a value replaces only that type's previous value;
  // picking the already-active value again clears that filter.
  function setFilter(type, value, count) {
    if (activeFilters[type] === value) {
      clearFilter(type);
      return;
    }

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
        var items = data[dataKey];

        facetMenus[filterType] = function () {
          menuEl.innerHTML = renderFn(facetItems(filterType, items));
        };
        facetMenus[filterType]();

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

    function buildLocationHTML() {
      if (locationData.length === 0) {
        return (
          '<p class="px-4 py-3 text-[13px] text-ink/40 dark:text-white/40 italic">' +
          "No locations yet" +
          "</p>"
        );
      }

      return locationData
        .map(function (c) {
          var isExpanded = !!expandedSet[c.country];

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
        var rawCountries = data.countries || [];

        // Counts follow the other active filters (see facetCounts); places
        // with no matching photos are left out, except the selected one.
        function computeLocationData() {
          var counts = facetCounts("country");
          var active = lowerKey(activeFilters.country);

          locationData = rawCountries
            .map(function (c) {
              var states = c.states.map(function (s) {
                return {
                  name: s.name,
                  count: counts ? counts["state::" + lowerKey(s.name)] || 0 : s.count || 0,
                };
              });

              if (counts) {
                states = states.filter(function (s) {
                  return s.count > 0 || active === "state::" + lowerKey(s.name);
                });
              }

              var total = counts
                ? counts["country::" + lowerKey(c.country)] || 0
                : states.reduce(function (a, s) { return a + (s.count || 0); }, 0);

              return { country: c.country, totalCount: total, states: states };
            })
            .filter(function (c) {
              return (
                !counts ||
                c.totalCount > 0 ||
                c.states.length > 0 ||
                active === "country::" + lowerKey(c.country)
              );
            });
        }

        computeLocationData();

        facetMenus.country = function () {
          computeLocationData();
          rerender();
        };

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
          '<p class="px-3 pb-1 text-[10px] tracking-[0.1em] uppercase font-semibold text-ink/35 dark:text-white/35">Countries</p>' +
          '<div id="oww-loc-list" class="max-h-[260px] overflow-y-auto px-1 pb-1">' +
          buildLocationHTML() +
          "</div>" +
          '<p class="px-3 py-2 text-[11px] text-ink/35 dark:text-white/35 border-t border-ink/8 dark:border-white/8 mt-1">Select a country for all its photographs, or expand it to choose a city.</p>';

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

            activeFilters.country = newFilter;
          } else {
            var newFilter = "state::" + val;

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

    // Increases on every photo switch; a load that finishes for an older
    // switch is ignored, so a slow download can't replace a newer photo.
    var mainPhotoToken = 0;
    var MAIN_SIZES = "(max-width: 768px) 100vw, 75vw";

    function loadMainPhoto(token, src, srcset, full) {
      var loader = new Image();

      loader.decoding = "async";

      if (srcset) {
        loader.sizes = MAIN_SIZES;
        loader.srcset = srcset;
      }

      loader.onload = function () {
        if (token !== mainPhotoToken) {
          return;
        }

        // Same srcset/sizes as the loader, so this picks the copy that has
        // just been downloaded and shows it at once from the cache.
        if (srcset) {
          mainPhoto.setAttribute("sizes", MAIN_SIZES);
          mainPhoto.setAttribute("srcset", srcset);
        }

        mainPhoto.src = src;
        mainPhoto.style.visibility = "";
      };

      loader.onerror = function () {
        if (token !== mainPhotoToken) {
          return;
        }

        if (!full || full === src) {
          mainPhoto.style.visibility = "";
          return;
        }

        // The resized copy is missing or blocked: use the original.
        var original = new Image();

        original.decoding = "async";
        original.onload = function () {
          if (token !== mainPhotoToken) {
            return;
          }

          mainPhoto._usedFull = true;
          mainPhoto.removeAttribute("srcset");
          mainPhoto.removeAttribute("sizes");
          mainPhoto.src = full;
          mainPhoto.style.visibility = "";
        };
        original.onerror = function () {
          if (token === mainPhotoToken) {
            mainPhoto.style.visibility = "";
          }
        };
        original.src = full;
      };

      loader.src = src;
    }

    function selectThumb(th) {
      if (!th) return;

      if (mainPhoto) {
        var src = th.getAttribute("data-src");

        var alt = th.getAttribute("data-alt");

        var srcset = th.getAttribute("data-srcset") || "";
        var full = th.getAttribute("data-full") || src;
        var token = ++mainPhotoToken;

        mainPhoto._usedFull = false;
        mainPhoto.setAttribute("data-full", full);
        mainPhoto.removeAttribute("width");
        mainPhoto.removeAttribute("height");
        mainPhoto.removeAttribute("srcset");
        mainPhoto.removeAttribute("sizes");

        // A browser keeps showing the previous image until a new src has
        // fully loaded, so when scrolling fast the old photo stayed up next
        // to the new photo's details. Show this photo's sidebar thumbnail
        // straight away (it is already loaded), then swap in the sharp copy
        // once it is ready, but only if this photo is still the selected one.
        var thumbImg = th.querySelector("img");
        var placeholder = thumbImg && thumbImg.complete && thumbImg.naturalWidth
          ? thumbImg.currentSrc || thumbImg.src
          : "";

        // No loaded thumbnail to show (it is lazy and still off screen):
        // hide the photo until the right one is ready rather than leaving
        // the previous photo up. visibility, not opacity, because the
        // fade-up animation controls opacity.
        mainPhoto.style.visibility = placeholder ? "" : "hidden";
        mainPhoto.src = placeholder || src;

        loadMainPhoto(token, src, srcset, full);
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

        if (elKicker && th.dataset.kicker !== undefined) {
          elKicker.textContent = th.dataset.kicker;
        }

        if (elTitle && th.dataset.title !== undefined) {
          elTitle.textContent = th.dataset.title;
        }

        if (elRef && th.dataset.ref !== undefined) {
          elRef.textContent = th.dataset.ref;
        }

        if (elAbout && th.dataset.about !== undefined) {
          elAbout.textContent = th.dataset.about;
        }

        if (elAltNote && th.dataset.altnote !== undefined) {
          elAltNote.textContent = th.dataset.altnote;
        }

        if (elCollection && th.dataset.collection !== undefined) {
          var collectionText = (th.dataset.collection || "").trim();
          var hasCollection =
            collectionText !== "" && collectionText.toLowerCase() !== "unknown";
          var collectionSection = panel.querySelector('[data-section="collection"]');

          elCollection.textContent = hasCollection ? collectionText : "";

          // Hide the whole "About the collection" block when there is none.
          if (collectionSection) {
            collectionSection.classList.toggle("hidden", !hasCollection);
          }
        }

        // Every field is replaced on each switch, even with an empty value,
        // so nothing from the previously shown photo is left behind.
        if (elCamera && (th.dataset.camera !== undefined || th.dataset.lens !== undefined)) {
          var camera = th.dataset.camera || "";
          var lens = th.dataset.lens || "";

          elCamera.textContent = camera + (camera && lens ? " / " : "");

          if (lens) {
            var lensSpan = document.createElement("span");

            lensSpan.className = "text-amber-600 dark:text-amber-400";
            lensSpan.textContent = lens;
            elCamera.appendChild(lensSpan);
          }
        }

        if (elDate && th.dataset.date !== undefined) {
          elDate.textContent = th.dataset.date;
        }

        // "State, Country" from the server; an empty value clears the
        // previous photo's text instead of leaving it behind.
        if (elLocation && th.dataset.location !== undefined) {
          elLocation.textContent = th.dataset.location;
        }

        if (elCategory && th.dataset.category !== undefined) {
          elCategory.textContent = th.dataset.category;

          var categorySection = panel.querySelector('[data-section="category"]');

          if (categorySection) {
            categorySection.classList.toggle("hidden", !th.dataset.category);
          }
        }

        if (elSettings && th.dataset.settings !== undefined) {
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

      // Already on the first/last photo: stay put. Re-selecting the same
      // photo would replay its fade-in and look like the rail moved.
      if (next === activeIdx) {
        return;
      }

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

        if (i === activeIdx) {
          return;
        }

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

  /* ── Grid view — the wheel and touchpad swipes scroll the strip ──── */

  var strip = document.getElementById("gridStrip");

  if (strip) {
    // Both a normal (vertical) wheel and a sideways touchpad swipe move the
    // strip, and every wheel event is handled here. Left to the browser, a
    // sideways swipe that runs past the first or last photo is taken by
    // Chrome as "go back / forward" and shows its blue arrow.
    strip.addEventListener(
      "wheel",
      function (e) {
        e.preventDefault();

        var d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;

        strip.scrollLeft += e.deltaMode === 1 ? d * 32 : d;
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
    if (!window.matchMedia || !window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
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
        var img = e.target;

        // An image with data-full (detail main photo and sidebar thumbnails) shows a resized
        // copy; if that copy is missing or blocked, fall back to the
        // original once instead of showing a broken image.
        var full = img && img.getAttribute && img.getAttribute("data-full");

        if (full && !img._usedFull && img.currentSrc !== full) {
          img._usedFull = true;
          img.removeAttribute("srcset");
          img.src = full;
          return;
        }

        if (img.classList && img.classList.contains("photo-img")) {
          markLoaded(img);
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

  /* ── Flow view — endless drag canvas ─────────────────────────────── */
  /*
   * Layout:
   *  1. Column width W is fixed per breakpoint; a photo's height is W / its
   *     aspect ratio (no cropping). Taller than 4:5? Its height is capped at
   *     1.25·W and it narrows, centred in its column.
   *  2. Each photo, in order, goes into the currently shortest column.
   *  3. If the set fills ~2 screens each way, the block tiles endlessly in
   *     every direction; each repeat of a column is shifted vertically so
   *     repeats never line up. Otherwise it's shown once, centred.
   * Only tiles near the screen are in the DOM. The tiles are .photo-item
   * links, so the shared "+" cursor and carrying filters into the photo
   * page work as for Grid.
   */
  (function () {
    var field = document.getElementById("flowField");
    var dataEl = document.getElementById("flowData");

    if (!field || !dataEl) {
      return;
    }

    var section = document.getElementById("flowView");
    var hint = document.getElementById("flowHint");
    var emptyMsg = document.getElementById("flowEmpty");
    var ALL = [];

    try {
      ALL = JSON.parse(dataEl.textContent || "[]");
    } catch (e) {
      ALL = [];
    }

    var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var canHover = window.matchMedia("(hover: hover)").matches;
    var DRIFT_DELAY = canHover ? 800 : 250;

    var L = null; // current layout
    var cx = 0, cy = 0, vx = 0, vy = 0;
    var dirty = true, first = true;
    var live = new Map();
    var drag = null, lastInput = performance.now(), drift = 0;
    var dragged = false; // the last press was a drag, not a click
    var onEl = null;

    function isShown() {
      return !section.classList.contains("hidden");
    }

    function metrics() {
      var vw = window.innerWidth;

      if (vw < 768) {
        var mw = Math.round(Math.min(168, Math.max(124, vw / 2.5)));
        return { m: true, W: mw, GX: 26, GY: 34, CAP: 24, C: 7 };
      }

      // Same number of columns visible on any desktop/tablet size; gaps scale with W.
      var n = vw < 1200 ? 4 : 5;
      var W = Math.round(Math.min(420, vw / (n * 1.3)));
      return { m: false, W: W, GX: Math.round(W * 0.3), GY: Math.round(W * 0.28), CAP: 26, C: 11 };
    }

    function layout(list) {
      var M = metrics();
      var W = M.W;
      var C = Math.min(M.C, Math.max(1, list.length));
      var cols = [];
      var i, k;

      for (i = 0; i < C; i++) cols.push({ h: 0, items: [] });

      list.forEach(function (p) {
        // Photos without a stored size fall back to 3:2.
        var r = p.w && p.h ? p.w / p.h : 1.5;
        var h = W / r, w = W;

        if (h > W * 1.25) {
          h = W * 1.25;
          w = h * r;
        }

        var c = 0;
        for (k = 1; k < C; k++) if (cols[k].h < cols[c].h - 1) c = k;

        cols[c].items.push({ p: p, dx: Math.round((W - w) / 2), y: Math.round(cols[c].h), w: Math.round(w), h: Math.round(h) });
        cols[c].h += h + M.CAP + M.GY;
      });

      var BW = C * (W + M.GX) - M.GX;
      var BH = Math.max.apply(null, cols.map(function (c) { return c.h; }));
      var shortest = Math.min.apply(null, cols.map(function (c) { return c.h; }));
      var endless = BW > window.innerWidth * 1.6 && shortest > window.innerHeight * 1.4;

      cols.forEach(function (c, ci) {
        c.x = ci * (W + M.GX);
        c.period = Math.round(c.h);
        c.stag = endless ? Math.round(((ci * 0.618) % 1) * W * 0.9) : 0;
      });

      return { M: M, W: W, GX: M.GX, cols: cols, BW: BW + M.GX, BH: BH, endless: endless };
    }

    // Stable pseudo-random vertical shift for repeat b of column c.
    function hashShift(b, c, period) {
      var v = Math.sin((b + 1) * 12.9898 + (c + 1) * 78.233) * 43758.5453;
      return Math.round((v - Math.floor(v)) * period);
    }

    function makeTile(it) {
      var p = it.p;
      var a = document.createElement("a");

      a.className = "photo-item flow-tile";
      a.href = "/photo/" + encodeURIComponent(p.slug);
      a.draggable = false;
      a.setAttribute("aria-label", p.t || p.alt || "Photo");
      a.style.width = it.w + "px";
      a.style.setProperty("--phh", it.h + "px");
      // Filter values, read by the shared filter code.
      ["category", "collection", "camera", "lens", "country", "state", "year"].forEach(function (k) {
        a.setAttribute("data-" + k, p[k] || "");
      });

      var ph = document.createElement("span");
      ph.className = "flow-ph";
      ph.style.height = it.h + "px";
      // The photo's dominant colour shows until it loads.
      if (p.c) ph.style.background = "color-mix(in srgb, " + p.c + " 35%, var(--flow-ph))";

      var img = document.createElement("img");
      img.className = "photo-img";
      img.alt = p.alt || "";
      img.draggable = false;
      img.decoding = "async";
      img.addEventListener("load", function () { img.classList.add("is-loaded"); });
      // sizes uses the column width (not the tile's own width) so the browser
      // picks the same srcset candidate the background preloader fetched.
      if (p.srcset) {
        img.sizes = L.W + "px";
        img.srcset = p.srcset;
      }
      img.src = p.src;
      // Already in the cache (preloaded, or seen earlier): show it at once,
      // without the fade, so dragging back over it never flashes the colour.
      if (img.complete && img.naturalWidth) img.classList.add("is-loaded", "no-fade");
      ph.appendChild(img);
      a.appendChild(ph);

      ["a", "b", "c", "d"].forEach(function (k) {
        var cn = document.createElement("i");
        cn.className = "flow-cn " + k;
        cn.setAttribute("aria-hidden", "true");
        a.appendChild(cn);
      });

      var cap = document.createElement("span");
      cap.className = "flow-cap";
      cap.textContent = p.t || "";
      a.appendChild(cap);
      return a;
    }

    function render() {
      if (!L) return;

      // Tiles are mounted (and their images requested) this far beyond the
      // screen edges, so a drag reveals photos that have already loaded.
      var vw = window.innerWidth, vh = window.innerHeight;
      var m = Math.round(Math.max(600, Math.max(vw, vh) * 0.75));
      var seen = new Set();
      var b0 = L.endless ? Math.floor((cx - m) / L.BW) : 0;
      var b1 = L.endless ? Math.floor((cx + vw + m) / L.BW) : 0;

      for (var b = b0; b <= b1; b++) {
        L.cols.forEach(function (c, ci) {
          var x = b * L.BW + c.x - cx;
          if (x + L.W < -m || x > vw + m) return;

          var base0 = L.endless ? c.stag + hashShift(b, ci, c.period) - cy : -cy;
          var k0 = 0, k1 = 0;

          if (L.endless) {
            k0 = Math.floor((-m - base0) / c.period) - 1;
            k1 = Math.floor((vh + m - base0) / c.period);
          }

          for (var k = k0; k <= k1; k++) {
            var base = base0 + k * c.period;

            c.items.forEach(function (it, ii) {
              var y = base + it.y;
              if (y + it.h + 40 < -m || y > vh + m) return;

              var key = b + "|" + ci + "|" + k + "|" + ii;
              seen.add(key);
              var el = live.get(key);

              if (!el) {
                el = makeTile(it);
                el.classList.add("is-new");
                el.addEventListener("animationend", function () { el.classList.remove("is-new"); }, { once: true });
                // First paint: tiles ripple in from the centre.
                if (first) {
                  var d = Math.hypot(x + L.W / 2 - vw / 2, y - vh / 2);
                  el.style.animationDelay = (Math.min(d, 1200) / 1200 * 0.6).toFixed(2) + "s";
                }
                field.appendChild(el);
                live.set(key, el);
              }

              el.style.transform = "translate3d(" + (x + it.dx).toFixed(1) + "px," + y.toFixed(1) + "px,0)";
            });
          }
        });
      }

      live.forEach(function (el, key) {
        if (!seen.has(key)) {
          if (el === onEl) setOn(null);
          el.remove();
          live.delete(key);
        }
      });
      first = false;
    }

    // A small set (not endless) stays on screen: it can't be dragged away.
    function clampCam() {
      if (!L || L.endless) return;

      var vw = window.innerWidth, vh = window.innerHeight;
      var pad = L.M.m ? 16 : 48;
      var top = 96, bottom = 120; // room for the header and the filter pill

      function span(size, view, a, b) {
        return size + a + b <= view ? [(size - view) / 2, (size - view) / 2] : [-a, size - view + b];
      }

      var sx = span(L.BW - L.GX, vw, pad, pad);
      var sy = span(L.BH, vh, top, bottom);
      cx = Math.min(Math.max(cx, sx[0]), sx[1]);
      cy = Math.min(Math.max(cy, sy[0]), sy[1]);
    }

    function filteredPhotos() {
      return ALL.filter(function (p) {
        return photoMatchesFilters(function (name) { return p[name]; });
      });
    }

    // The camera is remembered per filter, so coming back from a photo page
    // returns to the same spot.
    function cameraKey() {
      return buildFilterQueryString() + "|" + window.innerWidth;
    }

    function saveCamera() {
      try {
        sessionStorage.setItem(FLOW_CAMERA_KEY, JSON.stringify({ key: cameraKey(), cx: cx, cy: cy }));
      } catch (e) {}
    }

    function savedCamera() {
      try {
        var v = JSON.parse(sessionStorage.getItem(FLOW_CAMERA_KEY) || "null");
        return v && v.key === cameraKey() ? v : null;
      } catch (e) {
        return null;
      }
    }

    /* ── background preloading ──
       Once the first screen has loaded, every photo in the current set is
       fetched quietly at the same size the tiles use, nearest to the camera
       first. A drag then reveals images straight from the browser cache. */
    var PRELOAD_CONCURRENCY = 4;
    var preloaded = new Set(); // "W|slug" already requested
    var preloadQueue = [];
    var preloadInflight = 0;
    var preloadTimer = null;

    function canPreload() {
      var c = navigator.connection;
      return !(c && (c.saveData || /(^|-)2g$/.test(c.effectiveType || "")));
    }

    function pumpPreload() {
      while (preloadInflight < PRELOAD_CONCURRENCY && preloadQueue.length) {
        var job = preloadQueue.shift();
        var key = job.W + "|" + job.p.slug;
        if (preloaded.has(key)) continue;
        preloaded.add(key);
        preloadInflight++;

        var im = new Image();
        im.decoding = "async";
        if ("fetchPriority" in im) im.fetchPriority = "low";
        im.onload = im.onerror = function () {
          preloadInflight--;
          pumpPreload();
        };
        if (job.p.srcset) {
          im.sizes = job.W + "px";
          im.srcset = job.p.srcset;
        }
        im.src = job.p.src;
      }
    }

    function schedulePreload() {
      clearTimeout(preloadTimer);
      preloadQueue = [];
      if (!L || !canPreload()) return;

      // Nearest to the screen centre first (within one copy of the canvas).
      var midX = cx + window.innerWidth / 2, midY = cy + window.innerHeight / 2;
      var jobs = [];
      L.cols.forEach(function (c) {
        c.items.forEach(function (it) {
          var dx = c.x + L.W / 2 - midX, dy = c.stag + it.y + it.h / 2 - midY;
          if (L.endless) {
            dx = ((dx % L.BW) + L.BW * 1.5) % L.BW - L.BW / 2;
            dy = ((dy % c.period) + c.period * 1.5) % c.period - c.period / 2;
          }
          jobs.push({ p: it.p, W: L.W, d: dx * dx + dy * dy });
        });
      });
      jobs.sort(function (a, b) { return a.d - b.d; });

      // Give the photos on screen a head start before filling the cache.
      preloadTimer = setTimeout(function () {
        preloadQueue = jobs;
        pumpPreload();
      }, 1200);
    }

    function rebuild(keepCam) {
      var list = filteredPhotos();

      if (emptyMsg) emptyMsg.hidden = list.length > 0;
      live.forEach(function (el) { el.remove(); });
      live.clear();
      setOn(null);
      L = list.length ? layout(list) : null;

      if (L && !keepCam) {
        var saved = savedCamera();

        if (saved) {
          cx = saved.cx;
          cy = saved.cy;
        } else if (L.endless) {
          cx = Math.round((L.BW - window.innerWidth) / 2);
          cy = Math.round(L.W * 0.2) - 74;
        } else {
          cx = -1e6;
          cy = -1e6;
        }
        clampCam();
      }

      first = true;
      dirty = true;
      schedulePreload();
    }

    /* ── interaction ── */

    function touch() {
      lastInput = performance.now();
    }

    function hideHint() {
      if (hint) hint.classList.add("is-gone");
    }

    function setOn(el) {
      if (onEl === el) return;
      if (onEl) onEl.classList.remove("is-on");
      onEl = el;
      if (el) el.classList.add("is-on");
      field.classList.toggle("is-hovering", !!el);
    }

    field.addEventListener("pointerdown", function (e) {
      if (e.button !== 0) return;
      drag = { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, t: performance.now(), moved: false, id: e.pointerId, vx: 0, vy: 0 };
      dragged = false;
      vx = vy = 0;
      touch();
    });

    window.addEventListener("pointermove", function (e) {
      if (!drag || e.pointerId !== drag.id) return;

      var dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      var now = performance.now(), dt = Math.max(8, now - drag.t);

      if (!drag.moved && Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) > 6) {
        drag.moved = true;
        field.classList.add("is-grabbing");
        field.setPointerCapture(e.pointerId);
        hideHint();
        setOn(null);
      }

      if (drag.moved) {
        cx -= dx;
        cy -= dy;
        drag.vx = -dx / dt * 16;
        drag.vy = -dy / dt * 16;
        dirty = true;
      }

      drag.x = e.clientX;
      drag.y = e.clientY;
      drag.t = now;
      touch();
    });

    function endDrag(e) {
      if (!drag || e.pointerId !== drag.id) return;

      var d = drag;
      drag = null;
      field.classList.remove("is-grabbing");

      if (d.moved) {
        // A flick keeps gliding.
        if (!reduceMotion && performance.now() - d.t < 80) {
          vx = d.vx;
          vy = d.vy;
        }
        dragged = true;
        // Hover again whatever photo is now under the pointer.
        if (canHover) {
          var under = document.elementFromPoint(e.clientX, e.clientY);
          setOn(under && under.closest ? under.closest(".flow-tile") : null);
        }
      }
    }

    window.addEventListener("pointerup", endDrag);
    window.addEventListener("pointercancel", endDrag);

    // The click that ends a drag doesn't open a photo. Opening one remembers
    // where the canvas was.
    field.addEventListener("click", function (e) {
      if (dragged) {
        e.preventDefault();
        e.stopPropagation();
        dragged = false;
        return;
      }
      if (e.target.closest(".flow-tile")) saveCamera();
    }, true);
    window.addEventListener("pagehide", saveCamera);

    field.addEventListener("wheel", function (e) {
      e.preventDefault();
      var k = e.deltaMode === 1 ? 32 : 1;

      if (e.shiftKey && !e.deltaX) {
        cx += e.deltaY * k;
      } else {
        cx += e.deltaX * k;
        cy += e.deltaY * k;
      }

      vx = vy = 0;
      dirty = true;
      touch();
      hideHint();
    }, { passive: false });

    field.addEventListener("keydown", function (e) {
      var d = e.shiftKey ? 500 : 160;
      var mv = { ArrowLeft: [-d, 0], ArrowRight: [d, 0], ArrowUp: [0, -d], ArrowDown: [0, d] }[e.key];

      if (mv) {
        e.preventDefault();
        vx = mv[0] / 12;
        vy = mv[1] / 12;
        touch();
        hideHint();
      }
    });

    // Hover dims the other photos (pointer devices only).
    field.addEventListener("pointerover", function (e) {
      if (!canHover || (drag && drag.moved)) return;
      setOn(e.target.closest(".flow-tile"));
    });
    field.addEventListener("pointerleave", function () { setOn(null); });

    function tick() {
      if (isShown()) {
        if (!drag && (Math.abs(vx) > 0.05 || Math.abs(vy) > 0.05)) {
          cx += vx;
          cy += vy;
          vx *= 0.94;
          vy *= 0.94;
          dirty = true;
        } else if (!drag && !reduceMotion && L && L.endless && !onEl && performance.now() - lastInput > DRIFT_DELAY) {
          // Idle drift: eases in a moment after the last input.
          drift = Math.min(1, drift + 1 / 36);
          cy += 0.18 * drift;
          cx += 0.05 * drift;
          dirty = true;
        }

        if (drag || performance.now() - lastInput <= DRIFT_DELAY || onEl) drift = 0;

        if (dirty) {
          clampCam();
          render();
          dirty = false;
        }
      }
      requestAnimationFrame(tick);
    }

    var resizeTimer = null;
    window.addEventListener("resize", function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () { rebuild(true); clampCam(); }, 150);
    });

    // Filters and the Flow/Grid switch call these (see applyFilters, switchView).
    flowRelayout = function () { rebuild(false); };
    restoreFlowScroll = function () { dirty = true; };

    rebuild(false);
    requestAnimationFrame(tick);
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
