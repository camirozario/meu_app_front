# 🏋️‍♀️ Personal Trainer Workout Builder

Esta é uma aplicação web full stack para montagem de treinos personalizados. O usuário pode buscar exercícios, arrastar e soltar na área de treino, configurar séries e repetições, salvar no banco de dados e depois carregar novamente.

## ✨ Funcionalidades

- 🔎 **Busca de exercícios** por título
- 🧱 **Interface drag & drop** para montar treinos
- 📝 **Definição de séries e repetições**
- 💾 **Persistência no banco de dados (SQLite) via API Flask**
- 📦 **Upload de imagens e descrição dos exercícios**
- 📂 **Listagem e carregamento de treinos anteriores**
- 💡 **Design responsivo e visual moderno**

## 🛠 Tecnologias

### Frontend
- HTML5, CSS3 (custom properties) e JavaScript puro
- Estilização com Flexbox e variáveis CSS
- Layout com sidebar fixa e responsiva
- Efeitos visuais com hover, transições e responsividade

### Backend
- Python 3 com Flask
- Flask-OpenAPI3 + Pydantic para validação
- SQLAlchemy + SQLite para persistência
- Upload de imagens e APIs REST

## 🔧 Como rodar localmente

1. Clone o repositório:

```bash
git clone https://github.com/seuusuario/workout-builder.git
cd workout-builder