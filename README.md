# README (Execucao Local + Notas Tecnicas)
## 1) Requisitos

- PostgreSQL instalado e em execucao
- Python 3.9+
- Node.js 20+
- npm

## 2) Configuracao da Base de Dados

Criar a base de dados:

```bash
psql -U postgres -c "CREATE DATABASE escondidinho_db;"
```

Nota:

- A ligacao à base de dados esta definida em `backend/database.py`:
  - `host="localhost"`
  - `database="escondidinho_db"`
  - `user="postgres"`
  - `password="123456"`
- Se no teu ambiente for diferente, ajusta esses valores.

## 3) Como correr o Backend

### macOS / Linux

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install fastapi "uvicorn[standard]" psycopg2-binary pydantic
python seed.py
uvicorn main:app --reload
```

Backend: `http://localhost:8000`

### Windows (PowerShell)

```powershell
cd backend
py -3 -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install fastapi "uvicorn[standard]" psycopg2-binary pydantic
python seed.py
uvicorn main:app --reload
```

Backend: `http://localhost:8000`

## 4) Como correr o Frontend

### macOS / Linux / Windows

```bash
cd frontend
npm install
npm run dev
```

Frontend: `http://localhost:5173`

Rotas principais:

- Cliente: `http://localhost:5173/cliente`
- Cozinha: `http://localhost:5173/cozinha`

## 5) Diagrama da Base de Dados (ER)

<img width="954" height="838" alt="image" src="https://github.com/user-attachments/assets/98fda0fe-0f54-4dbb-bf69-90d330f3184c" />


## 6) Fluxo de Dados (Cliente -> API -> Cozinha)

<img width="1247" height="554" alt="image" src="https://github.com/user-attachments/assets/edf68c55-a3de-4787-b78f-752a4e092038" />

## 7) Decisoes arquiteturais relevantes

- **Separacao frontend/backend**: React no cliente e FastAPI na API para manter responsabilidades claras.
- **Modelo relacional**: `pratos`, `pedidos`, `linkar_pedido` para representar corretamente itens, pedidos e quantidades.
- **Kanban de cozinha**: estados explicitos (`order_preview` ate `concluded`) para refletir fluxo operacional real.
- **Tempo real com SSE**: escolhido por ser unidirecional (backend -> cozinha), simples e sem dependencia extra no browser.
- **Fallback manual**: botao "Atualizar" mantido para robustez.

## 8) O que melhoraria com mais tempo

- Configuracao por variaveis de ambiente (DB, CORS, URLs).
- Connection pooling e melhor gestao de concorrencia no backend.
- Testes automatizados (unitarios e integracao) para API e frontend.
- Escalar SSE para multi-instancia com Redis Pub/Sub.
- Melhorar observabilidade (logs estruturados e metricas).

## 9) Outras informacões relevantes

- O frontend usa `VITE_API_URL` opcional; sem essa variavel usa `http://localhost:8000`.
- O bonus de tempo real ja esta implementado no endpoint `GET /pedidos/stream`.
- O projeto tambem inclui bonus Kanban com drag-and-drop no dashboard de cozinha.

