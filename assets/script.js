document.addEventListener("DOMContentLoaded", () => {
  const rightBox = document.getElementById("exercise-list");
  const leftBox = document.getElementById("main-container");
  const addText = document.getElementById("add-text");
  const saveButton = document.querySelector(".save-workout button");
  const titleInput = document.getElementById("workout-title");
  const searchInput = document.querySelector(".search-bar input");

  let selected = null;

  const fetchExercises = async () => {
    const res = await fetch("http://127.0.0.1:5000/exercicios");
    const data = await res.json();
    renderExercises(data.exercicios);
  };

  const renderExercises = (exercicios) => {
    rightBox.innerHTML = "";
    exercicios.forEach(ex => {
      const card = document.createElement("div");
      card.className = "exercise-card";
      card.setAttribute("draggable", true);
      card.dataset.id = ex.id;

      card.innerHTML = `
        <div class="exercise-card-drag"><img src="assets/img/main/drag_drop_icon.png" /></div>
        <img src="http://127.0.0.1:5000/${ex.thumbnail}" />
        <div class="exercise-card-description">
          <h1>${ex.titulo}</h1>
          <p>Foco: ${ex.musculo}</p>
          <p>${ex.descricao}</p>
        </div>
        <div class="special-info hidden">
          <div class="reps"><input type="number" placeholder="sets" min="1" step="1"></div>x
          <div class="reps"><input type="number" placeholder="reps" min="1" step="1"></div>
          <div class="card-erase"><i class="fa-solid fa-trash"></i></div>
        </div>
      `;

      rightBox.appendChild(card);
      setupCardEvents(card);
    });
  };

  const setupCardEvents = (card) => {
    card.addEventListener("dragstart", e => {
      selected = card;
      e.dataTransfer.effectAllowed = "move";
    });

    card.querySelector(".card-erase").addEventListener("click", () => {
      // Reseta os inputs antes de mover
      const inputs = card.querySelectorAll("input");
      inputs.forEach(input => input.value = "");

      // Move o card de volta para a direita
      card.classList.remove("show-special", "exercise-card-full");

      // Oculta novamente os campos de sets e reps
      const specialInfo = card.querySelector(".special-info");
      if (specialInfo) {
        specialInfo.classList.add("hidden");
      }

      rightBox.appendChild(card);

      if (!leftBox.querySelector(".exercise-card")) {
        addText.classList.remove("hidden");
      }
    });
  };

  [rightBox, leftBox].forEach(box => {
    box.addEventListener("dragover", e => e.preventDefault());
  });

  leftBox.addEventListener("drop", e => {
    e.preventDefault();
    if (selected) {
      leftBox.appendChild(selected);
      selected.classList.add("show-special", "exercise-card-full");
      if (leftBox.querySelector(".exercise-card")) {
        addText.classList.add("hidden");
      }
      selected = null;
    }
  });

  rightBox.addEventListener("drop", e => {
    e.preventDefault();
    if (selected) {
      rightBox.appendChild(selected);
      selected.classList.remove("show-special", "exercise-card-full");
      if (!leftBox.querySelector(".exercise-card")) {
        addText.classList.remove("hidden");
      }
      selected = null;
    }
  });

  searchInput.addEventListener("input", async () => {
    const termo = searchInput.value.trim().toLowerCase();
    const res = await fetch("http://127.0.0.1:5000/exercicios");
    const data = await res.json();
    const filtrados = data.exercicios.filter(e => e.titulo.toLowerCase().includes(termo));
    renderExercises(filtrados);
  });

  saveButton.addEventListener("click", async () => {
    const cards = document.querySelectorAll("#main-container .exercise-card");
    const tituloTreino = titleInput?.value?.trim();

    if (!tituloTreino || cards.length === 0) {
      alert("Por favor, insira um título e adicione exercícios.");
      return;
    }

    const exercicios = Array.from(cards).map(card => {
      const exercicio_id = parseInt(card.dataset.id);
      const sets = parseInt(card.querySelectorAll("input")[0]?.value || "0");
      const reps = parseInt(card.querySelectorAll("input")[1]?.value || "0");
      return { exercicio_id, sets, reps };
    });

    const payload = {
      titulo: tituloTreino,
      exercicios: exercicios
    };

    const res = await fetch("http://127.0.0.1:5000/treino", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      alert("Treino salvo com sucesso!");
      fetchTreinos();
    } else {
      const err = await res.json();
      alert("Erro ao salvar treino: " + (err.mesage || "Erro desconhecido"));
    }
  });

  const fetchTreinos = async () => {
    const res = await fetch("http://127.0.0.1:5000/treinos");
    const data = await res.json();
    renderTreinos(data.treinos);
  };

  const renderTreinos = (treinos) => {
    const lista = document.getElementById("lista-treinos");
    lista.innerHTML = "";

    treinos.forEach(treino => {
      const card = document.createElement("div");
      card.className = "treino-card";
      card.innerHTML = `
        <h3>${treino.titulo}</h3>
        <p><strong>${treino.total_exercicios}</strong> exercícios</p>
        <button class="carregar-treino">Carregar</button>
      `;

      card.querySelector(".carregar-treino").addEventListener("click", () => {
        carregarTreinoNoMainContainer(treino.id);
      });

      lista.appendChild(card);
    });

    const btnContainer = document.createElement("div");
    btnContainer.className = "add-workout";
    btnContainer.innerHTML = `<button id="novo-treino-btn">+ Novo Treino</button>`;
    lista.appendChild(btnContainer);

    document.getElementById("novo-treino-btn").addEventListener("click", () => {
      leftBox.innerHTML = "";
      addText.classList.remove("hidden");
      titleInput.value = "";
      titleInput.focus();
    });
  };

  const carregarTreinoNoMainContainer = async (treinoId) => {
    const resTreinos = await fetch("http://127.0.0.1:5000/treinos");
    const data = await resTreinos.json();
    const treino = data.treinos.find(t => t.id === treinoId);
    if (!treino) return;

    const resEx = await fetch("http://127.0.0.1:5000/exercicios");
    const allEx = await resEx.json();

    leftBox.innerHTML = "";
    addText.classList.add("hidden");

    for (const ex of treino.exercicios) {
      const exercicioData = allEx.exercicios.find(e => e.id === ex.exercicio_id);
      if (!exercicioData) continue;

      const card = document.createElement("div");
      card.className = "exercise-card show-special exercise-card-full";
      card.dataset.id = exercicioData.id;

      card.innerHTML = `
        <div class="exercise-card-drag"><img src="assets/img/main/drag_drop_icon.png" /></div>
        <img src="http://127.0.0.1:5000/${exercicioData.thumbnail}" />
        <div class="exercise-card-description">
          <h1>${exercicioData.titulo}</h1>
          <p>Foco: ${exercicioData.musculo}</p>
          <p>${exercicioData.descricao}</p>
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
  };

  fetchExercises();
  fetchTreinos();
});
