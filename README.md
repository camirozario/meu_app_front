# 🏋️‍♀️ Personal Trainer Workout Builder

Esta é uma aplicação web full stack para montagem de treinos personalizados. O usuário pode buscar exercícios, arrastar e soltar na área de treino, configurar séries e repetições, salvar no banco de dados e depois carregar novamente.# 🌐 Workout Builder Frontend

Frontend estático (HTML, CSS e JS puro) servido em um container Docker utilizando Nginx.

---

## ✨ Funcionalidades

- 🔎 Busca de exercícios por título
- 🧱 Interface drag & drop para montar treinos
- 📝 Definição de séries e repetições
- 💾 Persistência no banco de dados (SQLite) via API Flask
- 📦 Upload de imagens e descrição dos exercícios
- 📂 Listagem e carregamento de treinos anteriores
- 💡 Design responsivo

---

## 🛠 Tecnologias

- HTML5, CSS3 (custom properties) e JavaScript puro
- Estilização com Flexbox e variáveis CSS
- Layout com sidebar fixa e responsiva
- Efeitos visuais com hover, transições e responsividade
- Servido por Nginx em container Docker

---

## 📦 Estrutura do Projeto

my_frontend/
│
├── index.html          # Página principal\
├── css/                # Arquivos de estilo\
├── js/                 # Scripts JavaScript\
├── images/             # Imagens estáticas\
├── Dockerfile          # Arquivo Docker para build\
└── nginx.conf          # Configuração do Nginx\

---

## 🚀 Como rodar localmente com Docker

1. Entre na pasta do frontend:
```
   cd my_app_front
```

2. Construa a imagem Docker:
```
   docker build -t meu_app_front:static .
```

3. Suba o container:
```
   docker run --rm -p 3000:80 meu_app_front:static
```

O site estará disponível em:
👉 http://localhost:3000

---

## 🔗 Integração com a API

O frontend consome dados da API em:
👉 http://localhost:5000

Certifique-se de que o container da API esteja rodando antes de acessar o frontend.

Exemplo para subir a API:
cd meu_app_api
docker compose up --build

A API está estruturada de forma a conectar-se com uma API externa. Como indicado na imagem abaixo
<img width="1017" height="508" alt="Screenshot 2025-09-28 232610" src="https://github.com/user-attachments/assets/3e758796-d41a-4c68-aee6-1dc71605fd7b" />


---

## 🐳 Observações

- O Dockerfile copia todo o conteúdo estático para dentro do Nginx no caminho /usr/share/nginx/html
- O nginx.conf garante que o site funcione mesmo em rotas "deep links" (Single Page Application friendly)
- Caso não precise de SPA, pode remover o nginx.conf e usar a configuração padrão do Nginx
