document.addEventListener("DOMContentLoaded", () => {
  const API_BASE = "http://localhost:5000";

  // elementos
  const exerciseList = document.getElementById("exercise-list");
  const searchInput = document.querySelector(".exercise-search-bar input");
  const openBtn = document.getElementById("open-upload-popup");
  const closeBtn = document.getElementById("close-upload-popup");
  const popup = document.getElementById("upload-popup");
  const uploadForm = document.getElementById("upload-form");
  const fileInput = document.getElementById("image-input");
  const thumbnail = document.getElementById("thumbnail");

  // cria um container de paginação, se não existir
  let paginationDiv = document.getElementById("pagination");
  if (!paginationDiv) {
    paginationDiv = document.createElement("div");
    paginationDiv.id = "pagination";
    paginationDiv.style.display = "flex";
    paginationDiv.style.gap = "6px";
    paginationDiv.style.margin = "16px 0";
    document.querySelector(".main-exercicios").appendChild(paginationDiv);
  }

  // estado
  let isEditing = false;
  let editingId = null;
  let cachePageItems = []; // itens da página atual (para render e busca local)
  let lastQuery = { q: "", page: 1, per_page: 20, limit_ext: 100 };

  // util: resolve URL de thumbnail
  function resolveThumb(url) {
    if (!url) return "assets/img/main/placeholder.png";
    if (/^https?:\/\//i.test(url)) return url;
    return `${API_BASE}/${url.replace(/^\/+/, "")}`;
  }

  // fetch (pessoais + externos) COM paginação
  async function fetchExercises({ q = "", page = 1, per_page = 20, limit_ext = 100 } = {}) {
    try {
      lastQuery = { q, page, per_page, limit_ext };

      const params = new URLSearchParams();
      if (q) params.set("q", q);
      params.set("page", page);
      params.set("per_page", per_page);
      params.set("limit_ext", limit_ext);

      const url = `${API_BASE}/exercicios/todos?${params.toString()}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`GET /exercicios/todos -> ${res.status}`);
      const data = await res.json();

      cachePageItems = data.items || [];
      renderExercises(cachePageItems);
      renderPagination(data.page, data.pages);
    } catch (err) {
      console.error(err);
      exerciseList.innerHTML = "<p>Erro ao carregar exercícios.</p>";
      paginationDiv.innerHTML = "";
    }
  }

  // render lista
  function renderExercises(exercicios) {
    exerciseList.innerHTML = "";
    if (!exercicios.length) {
      exerciseList.innerHTML = "<p>Nenhum exercício encontrado.</p>";
      return;
    }
    exercicios.forEach(ex => {
      const card = document.createElement("div");
      card.className = "exercise-card";
      card.setAttribute("draggable", "true");

      const imgUrl = resolveThumb(ex.thumbnail);
      const badge = ex.source === "personal" ? "Meu" : "Catálogo";

      const actions = ex.source === "personal" ? `
        <div class="card-edit">
          <div class="card-edit-edit" data-id="${ex.id}"><i class="fa-solid fa-pen"></i></div>
          <div class="card-edit-delete" data-id="${ex.id}"><i class="fa-solid fa-trash"></i></div>
        </div>` : "";

      card.innerHTML = `
        <img src="${imgUrl}" alt="${ex.titulo || ""}"/>
        <div class="exercise-card-description">
          <h1>${ex.titulo || "(sem título)"}</h1>
          <p>Foco: ${ex.musculo || "-"}</p>
          <p>${ex.descricao || ""}</p>
          <span class="badge">${badge}</span>
        </div>
        ${actions}
      `;
      exerciseList.appendChild(card);
    });
  }

  // paginação
  function renderPagination(page, totalPages) {
    paginationDiv.innerHTML = "";

    if (totalPages <= 1) return;

    const makeBtn = (label, p, disabled = false) => {
      const b = document.createElement("button");
      b.textContent = label;
      b.disabled = disabled;
      b.addEventListener("click", () => fetchExercises({ ...lastQuery, page: p }));
      return b;
    };

    // Prev
    paginationDiv.appendChild(makeBtn("«", Math.max(1, page - 1), page <= 1));

    // Simple pages (compact)
    const windowSize = 5;
    let start = Math.max(1, page - Math.floor(windowSize / 2));
    let end = Math.min(totalPages, start + windowSize - 1);
    if (end - start + 1 < windowSize) {
      start = Math.max(1, end - windowSize + 1);
    }

    for (let p = start; p <= end; p++) {
      const btn = makeBtn(String(p), p, p === page);
      if (p === page) {
        btn.style.fontWeight = "700";
        btn.style.borderBottom = "2px solid #333";
      }
      paginationDiv.appendChild(btn);
    }

    // Next
    paginationDiv.appendChild(makeBtn("»", Math.min(totalPages, page + 1), page >= totalPages));
  }

  // busca local (refaz a consulta no backend com q)
  let debounce;
  function applySearch() {
    const termo = (searchInput.value || "").trim().toLowerCase();
    fetchExercises({ ...lastQuery, q: termo, page: 1 });
  }
  searchInput.addEventListener("input", () => {
    clearTimeout(debounce);
    debounce = setTimeout(applySearch, 250);
  });

  // criar/editar pessoais
  uploadForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const titulo = document.getElementById("exercise-name").value.trim();
    const musculo = document.getElementById("muscles").value.trim();
    const descricao = document.getElementById("description").value.trim();
    const file = fileInput.files[0];

    if (!titulo || !musculo || !descricao || (!file && !isEditing)) {
      alert("Preencha todos os campos.");
      return;
    }

    const formData = new FormData();
    formData.append("titulo", titulo);
    formData.append("musculo", musculo);
    formData.append("descricao", descricao);
    if (file) formData.append("imagem", file);

    const method = isEditing ? "PUT" : "POST";
    const endpoint = isEditing
      ? `${API_BASE}/exercicio?id=${editingId}`
      : `${API_BASE}/upload_exercicio`;

    try {
      const res = await fetch(endpoint, { method, body: formData });
      if (!res.ok) throw new Error(`${method} ${endpoint} -> ${res.status}`);
      closePopup();
      // recarrega mantendo filtros/página
      await fetchExercises({ ...lastQuery });
      if (!isEditing) searchInput.value = "";
    } catch (err) {
      console.error(err);
      alert("Erro ao salvar exercício.");
    }
  });

  // deletar / editar pessoais
  exerciseList.addEventListener("click", async (e) => {
    const delBtn = e.target.closest(".card-edit-delete");
    const editBtn = e.target.closest(".card-edit-edit");

    if (delBtn) {
      const id = delBtn.dataset.id;
      if (!id) return;
      if (!confirm("Deseja remover este exercício?")) return;
      try {
        const res = await fetch(`${API_BASE}/exercicio?id=${id}`, { method: "DELETE" });
        if (!res.ok) throw new Error(`DELETE /exercicio?id=${id} -> ${res.status}`);
        await fetchExercises({ ...lastQuery });
      } catch (err) {
        console.error(err);
        alert("Erro ao deletar exercício.");
      }
      return;
    }

    if (editBtn) {
      const id = editBtn.dataset.id;
      // como a paginação só traz os itens da página, procura na página atual
      const exercicio = cachePageItems.find(ex => String(ex.id) === String(id));
      if (exercicio) {
        document.getElementById("exercise-name").value = exercicio.titulo || "";
        document.getElementById("muscles").value = exercicio.musculo || "";
        document.getElementById("description").value = exercicio.descricao || "";
        const imgUrl = resolveThumb(exercicio.thumbnail);
        if (imgUrl) {
          thumbnail.src = imgUrl;
          thumbnail.style.display = "block";
        }
        isEditing = true;
        editingId = id;
        openPopup();
      } else {
        alert("Este item não está na página atual.");
      }
    }
  });

  // preview imagem
  fileInput.addEventListener("change", () => {
    const file = fileInput.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = e => {
        thumbnail.src = e.target.result;
        thumbnail.style.display = "block";
      };
      reader.readAsDataURL(file);
    } else {
      thumbnail.style.display = "none";
      thumbnail.src = "";
    }
  });

  // popup
  function openPopup() { popup.classList.add("open"); }
  function closePopup() {
    popup.classList.remove("open");
    uploadForm.reset();
    thumbnail.style.display = "none";
    thumbnail.src = "";
    isEditing = false;
    editingId = null;
  }
  openBtn.addEventListener("click", () => {
    isEditing = false;
    editingId = null;
    uploadForm.reset();
    thumbnail.style.display = "none";
    openPopup();
  });
  closeBtn.addEventListener("click", closePopup);

  // inicial (página 1, 20 por página, externos até 100)
  fetchExercises({ page: 1, per_page: 20, limit_ext: 100 });
});
