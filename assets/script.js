document.addEventListener("DOMContentLoaded", () => {
  const API_BASE = "http://localhost:5000";

  // DOM refs
  const rightBox = document.getElementById("exercise-list");
  const leftBox = document.getElementById("main-container");
  const addText = document.getElementById("add-text");
  const saveButton = document.querySelector(".save-workout button");
  const titleInput = document.getElementById("workout-title");
  const searchForm = document.querySelector(".search-bar");
  const searchInput = document.querySelector(".search-bar input");

  // pagination container for sidebar list
  let paginationDiv = document.getElementById("sidebar-pagination");
  if (!paginationDiv) {
    paginationDiv = document.createElement("div");
    paginationDiv.id = "sidebar-pagination";
    paginationDiv.style.display = "flex";
    paginationDiv.style.flexWrap = "wrap";
    paginationDiv.style.gap = "6px";
    paginationDiv.style.justifyContent = "center";
    paginationDiv.style.padding = "10px 0 6px";
    rightBox.parentElement.appendChild(paginationDiv);
  }

  // ================== LIMITS & HELPERS ==================
  const LIMITS = {
    titulo: 100,
    musculo: 50,
    descricao: 255,
    thumbnail: 255
  };
  function clampText(v, max) {
    if (!v) return "";
    v = String(v);
    return v.length > max ? v.slice(0, max) : v;
  }

  // state
  let selected = null;
  let lastQuery = { q: "", page: 1, per_page: 24, limit_ext: 200 };

  function resolveThumb(url) {
    if (!url) return "assets/img/main/placeholder.png";
    if (/^https?:\/\//i.test(url)) return url;
    return `${API_BASE}/${String(url).replace(/^\/+/, "")}`;
  }

  async function fetchJSON(url, opts = {}) {
    const res = await fetch(url, opts);
    if (!res.ok) {
      let detail = "";
      try { detail = await res.text(); } catch {}
      throw new Error(`${opts.method || "GET"} ${url} -> ${res.status} ${detail}`);
    }
    return res.json();
  }

  async function postExercicio(body) {
    const res = await fetch(`${API_BASE}/exercicio`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      const e = new Error(`POST /exercicio -> ${res.status} ${txt}`);
      e.status = res.status;
      e.body = txt;
      throw e;
    }
    return res.json();
  }

  // ================== map external → unified (TRIMMED) ==================
  function mapExternalToUnified(x) {
    const titulo = clampText(x.name || x.titulo || "(sem título)", LIMITS.titulo);
    const musc = (Array.isArray(x.targetMuscles) && x.targetMuscles[0]) ||
                 (Array.isArray(x.bodyParts) && x.bodyParts[0]) || "";
    const descricaoRaw = Array.isArray(x.instructions) ? x.instructions.join(" ") : (x.descricao || "");
    const descricao = clampText(descricaoRaw, LIMITS.descricao);
    const thumbRaw = x.imageUrl || x.gifUrl || x.thumbnail || "";
    const thumbnail = clampText(thumbRaw, LIMITS.thumbnail);

    return { id: null, titulo, musculo: clampText(musc, LIMITS.musculo), descricao, thumbnail, source: "external" };
  }

  // ================== LOAD (merged) WITH PAGINATION ==================
  async function fetchExercises({ q = "", page = 1, per_page = 24, limit_ext = 200 } = {}) {
    lastQuery = { q, page, per_page, limit_ext };

    const params = new URLSearchParams();
    if (q) params.set("q", q);
    params.set("page", page);
    params.set("per_page", per_page);
    params.set("limit_ext", limit_ext);

    // 1) Prefer your unified endpoint
    try {
      const todosUrl = `${API_BASE}/exercicios/todos?${params.toString()}`;
      const data = await fetchJSON(todosUrl);
      const items = Array.isArray(data.items) ? data.items
                 : Array.isArray(data.exercicios) ? data.exercicios
                 : [];
      renderExercises(items);

      const currentPage = Number(data.page ?? page);
      const totalPages =
        Number(data.pages ?? Math.max(1, Math.ceil(Number(data.total ?? items.length) / per_page)));
      renderPagination(currentPage, totalPages);
      return;
    } catch (e) {
      // fallback below
    }

    // 2) Fallback: local + external
    try {
      const localsUrl = `${API_BASE}/exercicios`;
      const defaultUrl = `${API_BASE}/exercicios/default?limit=${encodeURIComponent(limit_ext)}${q ? `&q=${encodeURIComponent(q)}` : ""}`;
      const [localData, externalData] = await Promise.all([
        fetchJSON(localsUrl).catch(() => ({})),
        fetchJSON(defaultUrl).catch(() => ({}))
      ]);

      const localItems = Array.isArray(localData.items) ? localData.items
                        : Array.isArray(localData.exercicios) ? localData.exercicios
                        : [];
      const rawExternal = Array.isArray(externalData.items) ? externalData.items : [];
      const externalItems = rawExternal.map(mapExternalToUnified);

      localItems.forEach(it => { if (!it.source) it.source = "personal"; });

      const normQ = (q || "").trim().toLowerCase();
      const filterByQ = ex => {
        if (!normQ) return true;
        const title = (ex.titulo || ex.name || "").toLowerCase();
        const muscle = (ex.musculo || "").toLowerCase();
        return title.includes(normQ) || muscle.includes(normQ);
      };

      const merged = [...localItems, ...externalItems].filter(filterByQ);
      const totalPages = Math.max(1, Math.ceil(merged.length / per_page));
      const safePage = Math.min(Math.max(1, page), totalPages);
      const start = (safePage - 1) * per_page;
      const pageSlice = merged.slice(start, start + per_page);

      renderExercises(pageSlice);
      renderPagination(safePage, totalPages);
    } catch (err) {
      console.error(err);
      rightBox.innerHTML = "<p style='padding:8px;color:#c00'>Erro ao carregar exercícios.</p>";
      paginationDiv.innerHTML = "";
    }
  }

  function renderExercises(exercicios) {
    rightBox.innerHTML = "";

    if (!exercicios.length) {
      rightBox.innerHTML = `<p style="padding:8px;color:#666">Nenhum exercício encontrado.</p>`;
      return;
    }

    exercicios.forEach(ex => {
      const card = document.createElement("div");
      card.className = "exercise-card";
      card.setAttribute("draggable", "true");

      // metadata for drop handling
      card.dataset.id = ex.id || "";
      card.dataset.source = ex.source || "personal";
      card.dataset.payload = encodeURIComponent(JSON.stringify(ex));

      const imgUrl = resolveThumb(ex.thumbnail || ex.gifUrl || ex.imageUrl);
      const badge = ex.source === "external" ? "Catálogo" : "Meu";

      function truncate(text, max = 100) {
        if (!text) return "";
        return text.length > max ? text.slice(0, max) + "…" : text;
      }

      card.innerHTML = `
        <div class="exercise-card-drag"><img src="assets/img/main/drag_drop_icon.png" /></div>
        <img src="${imgUrl}" />
        <div class="exercise-card-description">        
          <h1>${ex.titulo || ex.name || "(sem título)"}</h1>
          <p>Foco: ${ex.musculo || (ex.targetMuscles && ex.targetMuscles[0]) || "-"}</p>
          <p>${truncate(ex.descricao || "", 100)}</p>
          <span class="badge">${badge}</span>
        </div>
        <div class="special-info hidden">
          <div class="reps"><input type="number" placeholder="sets" min="1" step="1"></div>x
          <div class="reps"><input type="number" placeholder="reps" min="1 step="1"></div>
          <div class="card-erase"><i class="fa-solid fa-trash"></i></div>
        </div>
      `;

      rightBox.appendChild(card);
      setupCardEvents(card);
    });
  }

  function renderPagination(current, total) {
    paginationDiv.innerHTML = "";
    if (total <= 1) return;

    const makeBtn = (label, targetPage, disabled = false) => {
      const b = document.createElement("button");
      b.textContent = label;
      b.disabled = disabled;
      b.style.padding = "6px 10px";
      b.style.borderRadius = "8px";
      b.style.border = "1px solid #eee";
      b.style.background = disabled ? "#f2f2f2" : "#fff";
      b.style.cursor = disabled ? "default" : "pointer";
      if (disabled) b.style.fontWeight = "700";
      b.addEventListener("click", () => {
        if (!disabled) fetchExercises({ ...lastQuery, page: targetPage });
      });
      return b;
    };

    paginationDiv.appendChild(makeBtn("First", 1, current <= 1));
    paginationDiv.appendChild(makeBtn("◀", Math.max(1, current - 1), current <= 1));

    const windowSize = 5;
    let start = Math.max(1, current - Math.floor(windowSize / 2));
    let end = Math.min(total, start + windowSize - 1);
    if (end - start + 1 < windowSize) start = Math.max(1, end - windowSize + 1);

    for (let p = start; p <= end; p++) {
      const btn = makeBtn(String(p), p, p === current);
      if (p === current) {
        btn.style.borderColor = "#ddd";
        btn.style.fontWeight = "700";
      }
      paginationDiv.appendChild(btn);
    }

    paginationDiv.appendChild(makeBtn("▶", Math.min(total, current + 1), current >= total));
    paginationDiv.appendChild(makeBtn("Last", total, current >= total));
  }

  // ============== DRAG/DROP + EXTERNAL → LOCAL CLONE WHEN DROPPED ==============
  function setupCardEvents(card) {
    card.addEventListener("dragstart", e => {
      selected = card;
      e.dataTransfer.effectAllowed = "move";
    });

    card.querySelector(".card-erase")?.addEventListener("click", () => {
      card.querySelectorAll("input").forEach(i => (i.value = ""));
      card.classList.remove("show-special", "exercise-card-full");
      card.querySelector(".special-info")?.classList.add("hidden");
      rightBox.appendChild(card);
      if (!leftBox.querySelector(".exercise-card")) addText.classList.remove("hidden");
    });
  }

  [rightBox, leftBox].forEach(box => {
    box.addEventListener("dragover", e => e.preventDefault());
  });

  leftBox.addEventListener("drop", async (e) => {
    e.preventDefault();
    if (!selected) return;

    // If external, create a local copy first so it has an id
    if (selected.dataset.source === "external") {
      try {
        await ensurePersonalIdForCard(selected);
      } catch (err) {
        console.error(err);
        alert("Não foi possível adicionar este exercício (erro ao clonar).");
        selected = null;
        return;
      }
    }

    leftBox.appendChild(selected);
    selected.classList.add("show-special", "exercise-card-full");
    selected.querySelector(".special-info")?.classList.remove("hidden");
    if (leftBox.querySelector(".exercise-card")) addText.classList.add("hidden");
    selected = null;
  });

  rightBox.addEventListener("drop", e => {
    e.preventDefault();
    if (!selected) return;
    rightBox.appendChild(selected);
    selected.classList.remove("show-special", "exercise-card-full");
    selected.querySelector(".special-info")?.classList.add("hidden");
    if (!leftBox.querySelector(".exercise-card")) addText.classList.remove("hidden");
    selected = null;
  });

  async function ensurePersonalIdForCard(card) {
    if (card.dataset.source === "personal" && card.dataset.id) return;

    let payload;
    try { payload = JSON.parse(decodeURIComponent(card.dataset.payload)); }
    catch { throw new Error("payload inválido do exercício externo"); }

    const tituloRaw = payload.titulo || payload.name || "Exercício";
    const muscRaw = payload.musculo || (payload.targetMuscles && payload.targetMuscles[0]) || "";
    const descRaw = payload.descricao || (Array.isArray(payload.instructions) ? payload.instructions.join(" ") : "");
    const thumbRaw = payload.thumbnail || payload.imageUrl || payload.gifUrl || "";

    const baseBody = {
      titulo: clampText(tituloRaw, LIMITS.titulo),
      musculo: clampText(muscRaw, LIMITS.musculo),
      descricao: clampText(descRaw, LIMITS.descricao),
      thumbnail: clampText(thumbRaw, LIMITS.thumbnail)
    };

    let created;
    try {
      created = await postExercicio(baseBody);
    } catch (err) {
      if (err.status === 409) {
        const body2 = { ...baseBody, titulo: clampText(`${baseBody.titulo} (catálogo)`, LIMITS.titulo) };
        created = await postExercicio(body2);
      } else {
        throw err;
      }
    }

    card.dataset.source = "personal";
    card.dataset.id = String(created.id);

    const badge = card.querySelector(".badge");
    if (badge) badge.textContent = "Meu";

    const img = card.querySelector("img[src]");
    if (img && created.thumbnail) {
      img.src = /^https?:\/\//i.test(created.thumbnail)
        ? created.thumbnail
        : `${API_BASE}/${String(created.thumbnail).replace(/^\/+/, "")}`;
    }

    try {
      const updatedPayload = {
        ...payload,
        id: created.id,
        source: "personal",
        titulo: created.titulo ?? baseBody.titulo,
        musculo: created.musculo ?? baseBody.musculo,
        descricao: created.descricao ?? baseBody.descricao,
        thumbnail: created.thumbnail ?? baseBody.thumbnail
      };
      card.dataset.payload = encodeURIComponent(JSON.stringify(updatedPayload));
    } catch {}
  }

  // ============== SEARCH (server-side q; prevent form reload) ==============
  searchForm.addEventListener("submit", (e) => e.preventDefault());
  let searchDebounce;
  searchInput.addEventListener("input", () => {
    clearTimeout(searchDebounce);
    searchDebounce = setTimeout(() => {
      const q = (searchInput.value || "").trim().toLowerCase();
      fetchExercises({ ...lastQuery, q, page: 1 });
    }, 250);
  });

  // ============== SAVE TREINO ==============
  saveButton.addEventListener("click", async () => {
    const cards = leftBox.querySelectorAll(".exercise-card");
    const tituloTreino = (titleInput?.value || "").trim();

    if (!tituloTreino || cards.length === 0) {
      alert("Por favor, insira um título e adicione exercícios.");
      return;
    }

    const exercicios = Array.from(cards).map(card => {
      const exercicio_id = parseInt(card.dataset.id, 10);
      const inputs = card.querySelectorAll(".reps input");
      const sets = parseInt(inputs[0]?.value || "0", 10);
      const reps = parseInt(inputs[1]?.value || "0", 10);
      return { exercicio_id, sets, reps };
    }).filter(x => Number.isFinite(x.exercicio_id) && x.exercicio_id > 0);

    if (!exercicios.length) {
      alert("Os exercícios adicionados ainda não foram convertidos para o catálogo pessoal.");
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/treino`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ titulo: tituloTreino, exercicios })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.mesage || "Erro ao salvar treino.");
      }
      alert("Treino salvo com sucesso!");
      fetchTreinos();
    } catch (err) {
      console.error(err);
      alert(err.message || "Erro ao salvar treino.");
    }
  });

  // ============== TREINOS LIST (with DELETE) ==============
  async function fetchTreinos() {
    try {
      const data = await fetchJSON(`${API_BASE}/treinos`);
      renderTreinos(data.treinos || []);
    } catch (e) {
      console.warn("Não foi possível carregar treinos:", e.message);
    }
  }

  function renderTreinos(treinos) {
    const lista = document.getElementById("lista-treinos");
    if (!lista) return;
    lista.innerHTML = "";

    treinos.forEach(treino => {
      const card = document.createElement("div");
      card.className = "treino-card";
      card.innerHTML = `
        <h3>${treino.titulo}</h3>
        <p><strong>${treino.total_exercicios}</strong> exercícios</p>
        <div style="display:flex; gap:8px;">
          <button class="carregar-treino">Carregar</button>
          <button class="deletar-treino" style="background:#994848;color:#fff;">Excluir</button>
        </div>
      `;

      card.querySelector(".carregar-treino").addEventListener("click", () => {
        carregarTreinoNoMainContainer(treino.id);
      });
      card.querySelector(".deletar-treino").addEventListener("click", async () => {
        if (!confirm(`Excluir o treino "${treino.titulo}"?`)) return;
        try {
          const res = await fetch(`${API_BASE}/treino?id=${treino.id}`, { method: "DELETE" });
          if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.mesage || "Erro ao excluir treino.");
          }
          fetchTreinos();
        } catch (err) {
          console.error(err);
          alert(err.message || "Erro ao excluir treino.");
        }
      });

      lista.appendChild(card);
    });
  }

  async function carregarTreinoNoMainContainer(treinoId) {
    const treinos = await fetchJSON(`${API_BASE}/treinos`);
    const treino = (treinos.treinos || []).find(t => t.id === treinoId);
    if (!treino) return;

    const allEx = await fetchJSON(`${API_BASE}/exercicios`);

    leftBox.innerHTML = "";
    addText.classList.add("hidden");

    for (const ex of treino.exercicios) {
      const exercicioData = (allEx.exercicios || []).find(e => e.id === ex.exercicio_id);
      if (!exercicioData) continue;

      const card = document.createElement("div");
      card.className = "exercise-card show-special exercise-card-full";
      card.setAttribute("draggable", "true");
      card.dataset.id = exercicioData.id;
      card.dataset.source = "personal";
      card.dataset.payload = encodeURIComponent(JSON.stringify(exercicioData));

      card.innerHTML = `
        <div class="exercise-card-drag"><img src="assets/img/main/drag_drop_icon.png" /></div>
        <img src="${resolveThumb(exercicioData.thumbnail)}" />
        <div class="exercise-card-description">
          <h1>${exercicioData.titulo}</h1>
          <p>Foco: ${exercicioData.musculo}</p>
          <p>${exercicioData.descricao}</p>
          <span class="badge">Meu</span>
        </div>
        <div class="special-info">
          <div class="reps"><input type="number" placeholder="sets" min="1" step="1" value="${ex.sets}"></div>x
          <div class="reps"><input type="number" placeholder="reps" min="1" step="1" value="${ex.reps}"></div>
          <div class="card-erase"><i class="fa-solid fa-trash"></i></div>
        </div>
      `;
      setupCardEvents(card);
      leftBox.appendChild(card);
    }
  }

  // init
  fetchExercises({ page: 1, per_page: 20, limit_ext: 100 });
  fetchTreinos();
});
