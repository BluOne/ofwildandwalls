// OF Wild & Walls Admin — vanilla JS: table sort, header search, dynamic metadata fields,
// modal, pill toggles, delete confirmation.
(function () {
  "use strict";

  // ---- header search: filters rows of the page's table ---------------------
  const search = document.getElementById("admin-search");
  const table = document.querySelector("[data-table]");
  const rowCount = document.getElementById("row-count");
  const footerCount = document.getElementById("footer-count");

  function filter() {
    if (!table || !search) return;
    const q = search.value.trim().toLowerCase();
    const rows = table.tBodies[0].rows;
    let shown = 0;
    for (const tr of rows) {
      const hay = Object.values(tr.dataset).join(" ").toLowerCase();
      const hit = !q || hay.indexOf(q) > -1;
      tr.hidden = !hit;
      if (hit) shown++;
    }
    if (rowCount) rowCount.textContent = shown;
    if (footerCount) footerCount.textContent = shown + " of " + rows.length + " photos";
  }
  if (search) search.addEventListener("input", filter);

  // ---- click-to-sort headers ----------------------------------------------
  let sortKey = "date";
  let sortDir = "desc";
  const sortState = document.getElementById("sort-state");

  function paintArrows() {
    document.querySelectorAll(".sort").forEach(btn => {
      const span = btn.querySelector("span");
      if (span) span.textContent = btn.dataset.key === sortKey ? (sortDir === "asc" ? "▲" : "▼") : "";
      btn.classList.toggle("font-semibold", btn.dataset.key === sortKey);
    });
    if (sortState) sortState.textContent = "Sorted by " + sortKey + ", " + (sortDir === "asc" ? "ascending" : "descending");
  }

  function sortRows() {
    if (!table) return;
    const body = table.tBodies[0];
    const dir = sortDir === "asc" ? 1 : -1;
    Array.from(body.rows)
      .sort((a, b) => {
        const rawA = a.dataset[sortKey] || "";
        const rawB = b.dataset[sortKey] || "";
        const numA = Number(rawA);
        const numB = Number(rawB);
        if (!isNaN(numA) && !isNaN(numB) && rawA.trim() !== "" && rawB.trim() !== "") {
          return numA < numB ? -dir : numA > numB ? dir : 0;
        }
        const av = rawA.toLowerCase();
        const bv = rawB.toLowerCase();
        return av < bv ? -dir : av > bv ? dir : 0;
      })
      .forEach(tr => body.appendChild(tr));
    paintArrows();
  }

  document.querySelectorAll(".sort").forEach(btn => {
    btn.addEventListener("click", () => {
      const key = btn.dataset.key;
      sortDir = key === sortKey && sortDir === "asc" ? "desc" : "asc";
      sortKey = key;
      sortRows();
    });
  });
  if (table && table.dataset.table === "photos") sortRows();

  // ---- dynamic metadata fields -------------------------------------------
  const meta = document.querySelector("[data-meta]");
  if (meta) {
    const rows = meta.querySelector("[data-meta-rows]");
    const panel = meta.querySelector("[data-meta-new]");
    const startBtn = meta.querySelector("[data-meta-start]");
    const keyInput = meta.querySelector("[data-new-key]");
    const valInput = meta.querySelector("[data-new-value]");
    const count = meta.querySelector("[data-meta-count]");

    const sync = () => { if (count) count.textContent = rows.querySelectorAll("[data-meta-row]").length; };

    function addRow(key, value) {
      const row = document.createElement("div");
      row.className = "grid items-center gap-2.5";
      row.style.gridTemplateColumns = "minmax(140px, 200px) minmax(0, 1fr) 34px";
      row.setAttribute("data-meta-row", "");
      row.innerHTML =
        '<input class="field bg-sand text-xs uppercase tracking-wide text-[#4a443e]" name="meta_key">' +
        '<input class="field" name="meta_value">' +
        '<button type="button" title="Remove field" data-meta-remove class="h-[34px] w-[34px] rounded-full border border-line2 bg-white text-[15px] leading-none text-mute hover:bg-sand">&times;</button>';
      row.children[0].value = key;
      row.children[1].value = value;
      rows.appendChild(row);
      sync();
    }

    function openPanel(open) {
      panel.classList.toggle("hidden", !open);
      startBtn.classList.toggle("hidden", open);
      if (open) keyInput.focus();
    }

    function commit() {
      const k = keyInput.value.trim();
      if (!k) return keyInput.focus();
      addRow(k, valInput.value.trim());
      keyInput.value = "";
      valInput.value = "";
      openPanel(false);
    }

    startBtn.addEventListener("click", () => openPanel(true));
    meta.querySelector("[data-meta-cancel]").addEventListener("click", () => openPanel(false));
    meta.querySelector("[data-meta-commit]").addEventListener("click", commit);
    [keyInput, valInput].forEach(el =>
      el.addEventListener("keydown", e => {
        if (e.key === "Enter") { e.preventDefault(); commit(); }
        if (e.key === "Escape") openPanel(false);
      })
    );
    meta.addEventListener("click", e => {
      const btn = e.target.closest("[data-meta-remove]");
      if (!btn) return;
      btn.closest("[data-meta-row]").remove();
      sync();
    });
  }

  // ---- pill checkboxes (Flow / Grid / Featured) ---------------------------
  document.querySelectorAll("[data-toggle-pill]").forEach(cb => {
    cb.addEventListener("change", () => {
      const pill = cb.closest("label");
      const on = cb.checked;
      pill.className = "cursor-pointer rounded-full px-4 py-2 text-xs " +
        (on ? "border border-amber bg-amber/15 font-semibold text-amberink" : "border border-line2 bg-white text-mute");
    });
  });

  // ---- modal --------------------------------------------------------------
  function setModal(id, open) {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.toggle("hidden", !open);
    el.classList.toggle("grid", open);
  }
  document.querySelectorAll("[data-open-modal]").forEach(btn =>
    btn.addEventListener("click", () => setModal(btn.dataset.openModal, true))
  );
  document.querySelectorAll("[data-modal]").forEach(modal => {
    modal.addEventListener("click", e => { if (e.target === modal) modal.classList.replace("grid", "hidden"); });
    modal.querySelectorAll("[data-close-modal]").forEach(btn =>
      btn.addEventListener("click", () => modal.classList.replace("grid", "hidden"))
    );
  });
  document.addEventListener("keydown", e => {
    if (e.key !== "Escape") return;
    document.querySelectorAll("[data-modal]").forEach(m => m.classList.replace("grid", "hidden"));
  });

  // ---- delete confirmation ------------------------------------------------
  document.querySelectorAll("form[data-confirm]").forEach(form =>
    form.addEventListener("submit", e => { if (!confirm(form.dataset.confirm)) e.preventDefault(); })
  );
  document.querySelectorAll("[data-confirm-click]").forEach(btn =>
    btn.addEventListener("click", e => { if (!confirm(btn.dataset.confirmClick)) e.preventDefault(); })
  );
})();
