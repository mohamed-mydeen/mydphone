# Emergency Contact Vault

A production-ready full-stack web application to securely store and instantly access your emergency contacts from any device.

---

## Tech Stack

| Layer      | Technology                        |
|------------|-----------------------------------|
| Frontend   | React 19 + Vite + Tailwind CSS v3 |
| Backend    | FastAPI (Python 3.11+)            |
| Database   | TiDB Cloud (MySQL-compatible)     |
| Auth       | JWT + bcrypt                      |
| Deployment | Vercel (frontend) + Render (API)  |

---

## Project Structure

```
phone book/
├── backend/
│   ├── main.py              # FastAPI app entrypoint
│   ├── config.py            # Settings via pydantic-settings
│   ├── database.py          # SQLAlchemy engine + session
│   ├── models.py            # ORM models (User, Contact)
│   ├── schemas.py           # Pydantic request/response schemas
│   ├── auth.py              # JWT + bcrypt helpers
│   ├── routers/
│   │   ├── auth.py          # /auth/* endpoints
│   │   ├── contacts.py      # /contacts/* endpoints
│   │   └── profile.py       # /profile endpoints
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── api/axios.js         # Axios instance + interceptors
│   │   ├── context/
│   │   │   ├── AuthContext.jsx  # Auth state + login/logout
│   │   │   └── ThemeContext.jsx # Dark/light mode
│   │   ├── components/
│   │   │   ├── Navbar.jsx       # Desktop top bar + mobile tab bar
│   │   │   ├── ContactCard.jsx  # Card with call/edit/delete actions
│   │   │   ├── ContactForm.jsx  # Add / edit form with validation
│   │   │   ├── SearchBar.jsx    # Debounced search input
│   │   │   ├── Avatar.jsx       # Initials avatar with auto colour
│   │   │   ├── Modal.jsx        # Accessible modal dialog
│   │   │   ├── LoadingSpinner.jsx
│   │   │   ├── EmptyState.jsx
│   │   │   └── ProtectedRoute.jsx
│   │   └── pages/
│   │       ├── Login.jsx
│   │       ├── Register.jsx
│   │       ├── ForgotPassword.jsx
│   │       ├── Contacts.jsx     # Main contacts list
│   │       ├── Emergency.jsx    # Emergency search mode
│   │       ├── Profile.jsx      # Account settings
│   │       └── Import.jsx       # CSV import
│   ├── tailwind.config.js
│   ├── vite.config.js
│   └── .env.example
├── schema.sql               # TiDB / MySQL schema
├── render.yaml              # Render deployment config
├── vercel.json              # Vercel deployment config
└── README.md
```

---

## Local Development

### 1. Clone & Setup

```bash
git clone <your-repo-url>
cd "phone book"
```

### 2. Backend

```bash
cd backend

# Create virtual environment
python -m venv venv
venv\Scripts\activate          # Windows
# source venv/bin/activate     # macOS/Linux

# Install dependencies
pip install -r requirements.txt

# Configure environment
copy .env.example .env
# Edit .env with your TiDB Cloud credentials

# Run the API
uvicorn backend.main:app --reload --port 8000
```

API docs available at: `http://localhost:8000/docs`

### 3. Frontend

```bash
cd frontend

# Install dependencies
npm install

# Configure environment
copy .env.example .env
# Edit .env: VITE_API_URL=http://localhost:8000

# Start dev server
npm run dev
```

App available at: `http://localhost:5173`

---

## TiDB Cloud Setup

1. Create a free cluster at [tidbcloud.com](https://tidbcloud.com)
2. Create a database named `emergency_vault`
3. Run `schema.sql` in the TiDB SQL console
4. Copy the connection string — format:
   ```
   mysql+pymysql://username:password@gateway.tidbcloud.com:4000/emergency_vault?ssl_verify_cert=true&ssl_verify_identity=true
   ```
5. Paste it as `DATABASE_URL` in `backend/.env`

---

## Deployment

### Backend → Render

1. Push code to GitHub
2. Create a new **Web Service** on [render.com](https://render.com)
3. Set **Root Directory** to `.` (project root)
4. Set **Build Command**: `pip install -r backend/requirements.txt`
5. Set **Start Command**: `uvicorn backend.main:app --host 0.0.0.0 --port $PORT`
6. Add environment variables:
   - `DATABASE_URL` — your TiDB connection string
   - `SECRET_KEY` — 64-character random string
   - `CORS_ORIGINS` — `["https://your-app.vercel.app"]`

### Frontend → Vercel

1. Import the repo on [vercel.com](https://vercel.com)
2. Set **Root Directory** to `frontend`
3. Set **Framework Preset** to `Vite`
4. Add environment variable:
   - `VITE_API_URL` — your Render backend URL (e.g. `https://emergency-vault-api.onrender.com`)
5. Deploy

---

## API Reference

### Authentication
| Method | Endpoint          | Description       |
|--------|-------------------|-------------------|
| POST   | `/auth/register`  | Create account    |
| POST   | `/auth/login`     | Sign in → JWT     |
| POST   | `/auth/logout`    | Logout (stateless)|

### Contacts
| Method | Endpoint                 | Description               |
|--------|--------------------------|---------------------------|
| GET    | `/contacts`              | List (paginated, filtered)|
| GET    | `/contacts/search?q=`    | Full-text search          |
| GET    | `/contacts/export`       | Download CSV              |
| POST   | `/contacts/import`       | Upload CSV                |
| GET    | `/contacts/:id`          | Get single contact        |
| POST   | `/contacts`              | Create contact            |
| PUT    | `/contacts/:id`          | Update contact            |
| DELETE | `/contacts/:id`          | Delete contact            |

### Profile
| Method | Endpoint   | Description               |
|--------|------------|---------------------------|
| GET    | `/profile` | Get current user          |
| PUT    | `/profile` | Update name/email/password|
| DELETE | `/profile` | Delete account            |

---

## Features

- ✅ JWT authentication (7-day tokens)
- ✅ bcrypt password hashing
- ✅ Instant debounced contact search
- ✅ Alphabetical grouping with section headers
- ✅ Favourite & Emergency contact tags
- ✅ Tap-to-call (`tel:` links)
- ✅ CSV import with validation & error reporting
- ✅ CSV export of all contacts
- ✅ Dark / Light mode with system preference detection
- ✅ Mobile-first design with bottom tab bar
- ✅ Emergency Mode — search-first, zero clutter
- ✅ Pagination
- ✅ Input validation (frontend + backend)
- ✅ CORS protection
- ✅ Rate limiting (slowapi)
- ✅ SQL injection protection via ORM
- ✅ Loading states & toast notifications
- ✅ Empty state screens

---

## Security

- All passwords hashed with bcrypt (cost factor 12)
- JWTs signed with HS256, expire after 7 days
- All contact endpoints require a valid Bearer token
- SQL queries use SQLAlchemy ORM (no raw SQL)
- CORS restricted to configured origins
- Rate limiting on all routes via slowapi

---

## License

MIT
