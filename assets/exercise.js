document.addEventListener("DOMContentLoaded", () => {
  const openBtn = document.getElementById('open-upload-popup');
  const closeBtn = document.getElementById('close-upload-popup');
  const popup = document.getElementById('upload-popup');
  const uploadForm = document.getElementById('upload-form');
  const fileInput = document.getElementById('image-input');
  const thumbnail = document.getElementById('thumbnail');
  const exerciseList = document.getElementById('exercise-list');
  const searchInput = document.querySelector(".exercise-search-bar input");

  let isEditing = false;
  let editingId = null;

  const fetchExercises = async () => {
    const res = await fetch("http://127.0.0.1:5000/exercicios");
    const data = await res.json();
    renderExercises(data.exercicios);
  };

  const renderExercises = (exercicios) => {
    exerciseList.innerHTML = "";
    exercicios.forEach(ex => {
      const card = document.createElement("div");
      card.className = "exercise-card";
      card.setAttribute("draggable", true);

      card.innerHTML = `
       <img src="http://127.0.0.1:5000/${ex.thumbnail}" />
        <div class="exercise-card-description">        
          <h1>${ex.titulo}</h1>
          <p>Foco: ${ex.musculo}</p>
          <p>${ex.descricao}</p>
        </div>
        <div class="card-edit">
          <div class="card-edit-edit" data-id="${ex.id}"><i class="fa-solid fa-pen"></i></div>
          <div class="card-edit-delete" data-id="${ex.id}"><i class="fa-solid fa-trash"></i></div>
        </div>
      `;

      exerciseList.appendChild(card);
    });
  };

  uploadForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const titulo = document.getElementById("exercise-name").value.trim();
    const musculo = document.getElementById("muscles").value.trim();
    const descricao = document.getElementById("description").value.trim();
    const file = fileInput.files[0];

    if (!titulo || !musculo || !descricao || (!file && !isEditing)) {
      alert("Por favor, preencha todos os campos e selecione uma imagem.");
      return;
    }

    const formData = new FormData();
    formData.append("titulo", titulo);
    formData.append("musculo", musculo);
    formData.append("descricao", descricao);
    if (file) formData.append("imagem", file);

    const method = isEditing ? "PUT" : "POST";
    const endpoint = isEditing
      ? `http://127.0.0.1:5000/exercicio?id=${editingId}`
      : "http://127.0.0.1:5000/upload_exercicio";

    await fetch(endpoint, {
      method,
      body: formData
    });

    popup.classList.remove('open');
    uploadForm.reset();
    thumbnail.style.display = 'none';
    thumbnail.src = '';
    isEditing = false;
    editingId = null;

    fetchExercises();
  });

  fileInput.addEventListener('change', () => {
    const file = fileInput.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = e => {
        thumbnail.src = e.target.result;
        thumbnail.style.display = 'block';
      };
      reader.readAsDataURL(file);
    } else {
      thumbnail.style.display = 'none';
      thumbnail.src = '';
    }
  });

  openBtn.addEventListener('click', () => {
    popup.classList.add('open');
  });

  closeBtn.addEventListener('click', () => {
    popup.classList.remove('open');
    uploadForm.reset();
    thumbnail.style.display = 'none';
    thumbnail.src = '';
    isEditing = false;
    editingId = null;
  });

  exerciseList.addEventListener("click", async (e) => {
    if (e.target.closest(".card-edit-delete")) {
      const id = e.target.closest(".card-edit-delete").dataset.id;
      await fetch(`http://127.0.0.1:5000/exercicio?id=${id}`, {
        method: "DELETE"
      });
      fetchExercises();
    }

    if (e.target.closest(".card-edit-edit")) {
      const id = e.target.closest(".card-edit-edit").dataset.id;
      const res = await fetch("http://127.0.0.1:5000/exercicios");
      const data = await res.json();
      const exercicio = data.exercicios.find(ex => ex.id == id);

      if (exercicio) {
        document.getElementById("exercise-name").value = exercicio.titulo;
        document.getElementById("muscles").value = exercicio.musculo;
        document.getElementById("description").value = exercicio.descricao;
        thumbnail.src = exercicio.thumbnail;
        thumbnail.style.display = "block";

        isEditing = true;
        editingId = id;
        popup.classList.add("open");
      }
    }
  });

  searchInput.addEventListener("input", async () => {
    const res = await fetch("http://127.0.0.1:5000/exercicios");
    const data = await res.json();
    const termo = searchInput.value.trim().toLowerCase();
    const filtrados = data.exercicios.filter(e => e.titulo.toLowerCase().includes(termo));
    renderExercises(filtrados);
  });

  fetchExercises();
});
