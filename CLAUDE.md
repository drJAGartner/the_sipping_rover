# The Sipping Rover — Claude Context

Mobile-first cafe rating and discovery app. Built for a small group of users (alpha). Owner: Joseph Gartner (@drJAGartner).

## Stack

| Layer | Tech |
|-------|------|
| Backend | FastAPI + SQLAlchemy (async/asyncpg) + Alembic |
| Database | PostgreSQL 16 |
| Frontend | React + Vite + TanStack Query + React Router v6 |
| Drag & Drop | @dnd-kit/core + @dnd-kit/sortable |
| Auth | JWT (python-jose), OAuth2PasswordBearer |
| Containers | Docker + Docker Compose |

## Repo Layout

```
backend/
  app/
    main.py             # FastAPI app, CORS, router registration
    config.py           # Settings from env vars (pydantic-settings)
    database.py         # Async engine + session factory
    auth.py             # JWT helpers, get_current_user dependency
    models/             # SQLAlchemy ORM models
      cafe.py           # Cafe (name, address, city, website, photo_url)
      user.py           # User (email, home_cafe_id, hashed_password)
      visit.py          # Visit (user→cafe, rating, notes, has_details)
      tier_list.py      # TierList + TierListEntry
      follow.py         # User follows (unused, scaffolded)
    schemas/            # Pydantic in/out schemas
    routers/
      auth.py           # POST /auth/register, POST /auth/token
      users.py          # GET/PATCH /users/me
      cafes.py          # Cafe CRUD + search + logo fetch
      visits.py         # Visit CRUD + GET /visits/cafe/{id}/mine
      tier_lists.py     # TierList CRUD + seeding
      discovery.py      # Unused discovery endpoint
    services/
      places.py         # Google Places API (textsearch)
      logo_scraper.py   # Scrape apple-touch-icon / img[logo] from cafe websites
  alembic/              # DB migrations (uses psycopg2, not asyncpg)
  Dockerfile            # Dev (hot reload)
  Dockerfile.prod       # Production (2 uvicorn workers, no reload)

frontend/
  src/
    pages/
      LoginPage.jsx / RegisterPage.jsx
      OnboardingPage.jsx      # Home cafe selection on first login
      JournalPage.jsx         # Main journal with pinned home cafe, manual add flow
      CafeDetailPage.jsx      # Cafe info + user's review + edit link
      RateDetailsPage.jsx     # 3-screen characteristic rating (Brew/Vibe/Setup)
      TierListPage.jsx        # Create/edit tier list with drag-and-drop
      TierListViewPage.jsx    # Read-only tier list view + share button
      ProfilePage.jsx         # User profile, home cafe, stats
      BrewTodayPage.jsx       # Daily brew suggestion
    components/
      Layout.jsx              # Bottom nav (Journal, Tier, Profile)
      CafeAvatar.jsx          # Logo/initials avatar; uses photo_url then Google favicon fallback
    api/                      # TanStack Query fetch wrappers (cafes, visits, tierLists, users)
  Dockerfile                  # Dev (Vite dev server)

nginx/
  sipping-rover.conf          # Host Nginx config — SSL termination, /api proxy

docker-compose.yml            # Dev: backend + frontend + db (hot reload, ports exposed)
docker-compose.prod.yml       # Prod: backend + db only (port 8000 bound to localhost)
```

## Key Design Decisions

- **No `/api` prefix in backend routes** — Nginx proxies `/api/` → `http://127.0.0.1:8000/` stripping the prefix
- **VITE_API_URL** is a build-time env var baked by Vite; set to `https://sipping-rover.com/api` in production
- **Logo strategy**: `photo_url` stored in DB (scraped via logo_scraper); `CafeAvatar` falls back to Google favicon service, then initials
- **Cafe deduplication**: not enforced at DB level; external Places API results merged with local by `place_id`
- **Tier lists**: named (not month-locked); seeded from city visits or liked visits; drag-and-drop only (no buttons)
- **Home cafe**: pinned to top of journal with 🏠 icon; shown by name in profile

## Environment Variables

```
POSTGRES_USER=sipping_rover
POSTGRES_PASSWORD=<strong password, no special chars like % $ #>
POSTGRES_DB=sipping_rover
SECRET_KEY=<hex32 from openssl rand -hex 32>
ENVIRONMENT=production
GOOGLE_PLACES_API_KEY=<key>
VITE_API_URL=https://sipping-rover.com/api   # build-time only
```

## Production Deployment

**Server**: AWS EC2 t3.micro, Ubuntu 24.04 LTS  
**Domain**: sipping-rover.com (registered via Route 53)  
**Elastic IP**: associated with the instance (check EC2 console for current IP)  
**SSL**: Let's Encrypt via certbot (auto-renews via systemd timer)

### SSH into server
```bash
ssh -i ~/.ssh/sipping-rover.pem ubuntu@<elastic-ip>
```

### Deploy a backend change
```bash
# On server
cd ~/the_sipping_rover
git pull
docker compose -f docker-compose.prod.yml up -d --build backend
# If there are new migrations:
docker compose -f docker-compose.prod.yml exec backend alembic upgrade head
```

### Deploy a frontend change
```bash
# On server
cd ~/the_sipping_rover
git pull
cd frontend
rm -rf node_modules dist   # only if package.json changed
npm install
VITE_API_URL=https://sipping-rover.com/api npm run build
sudo cp -r dist/* /var/www/sipping-rover/
```

### Deploy both
Run backend steps first, then frontend steps.

### Check logs
```bash
docker compose -f docker-compose.prod.yml logs -f backend
docker compose -f docker-compose.prod.yml logs -f db
sudo nginx -t && sudo systemctl status nginx
```

### Add a new migration
```bash
# Locally
cd backend
alembic revision -m "describe the change"
# Edit the generated file in alembic/versions/
# Test locally, then push and run on server:
docker compose -f docker-compose.prod.yml exec backend alembic upgrade head
```

## Local Development

```bash
docker compose up --build
# Backend: http://localhost:8000
# Frontend: http://localhost:5173
# DB: localhost:5432
```

## API Docs (dev only)
http://localhost:8000/docs
