# TaskScheduler — frontend + backend 


na backende ist do docker-compose.yml a spustit vsetky 3 services 
na fronte bude treba spustit  npm run dev (popripade npm install)
potom na na frontende v koznole o + ENTER (alebo do prehliadaca zadat http://localhost:5173)









Podrobnosti rozne vygenerovane AI netreba citat :D : 

Requirements
- Node.js 18\+ and npm
- PHP 8.1\+
- Composer
- MySQL / MariaDB

Frontend (in `frontend` or project root)
1. Install
   npm install

2. Dev
   npm run dev
   Set `VITE_API_BASE` in `\.env` if backend is on different URL (e.g. `VITE_API_BASE=http://localhost:8080`).

3. Build / preview
   npm run build
   npm run preview

Backend (PHP)
1. Install
   composer install

2. Env
   copy `\.env.example` to `\.env` and set:
- `DB_HOST`, `DB_NAME`, `DB_USER`, `DB_PASS`
- `APP_URL` (e.g. `http://localhost:8080`)
- `CORS_ALLOWED_ORIGINS` include `http://localhost:5173`
- `ADMIN_USER_ID` (optional)

3. Database
   Import schema or run migrations:
   mysql -u your_user -p your_db < database/schema.sql

Create admin example (generate password hash):
php -r "echo password_hash('adminpassword', PASSWORD_DEFAULT).PHP_EOL;"

4. Run (dev)
   php -S localhost:8080 -t public

CORS & credentials (ensure these are enabled on backend)
- `Access-Control-Allow-Origin` must include frontend origin
- `Access-Control-Allow-Credentials: true`
- Frontend must send cookies: fetch with `credentials: 'include'` or axios with `withCredentials: true`

Session cookie note
- If using cross-origin auth, set session cookie params so browser sends cookie (e.g. `SameSite=None` and `Secure=true` when using HTTPS)

Quick API endpoints
- Login: `POST /?c=login`
- Me: `GET /?c=login&a=me`





