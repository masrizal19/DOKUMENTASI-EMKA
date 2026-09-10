# GALERI EMKA ARCHITECTURE RULES

1. **API Only for Frontend**: The frontend connects to the backend exclusively via `https://api.mkverse.my.id/api`.
2. **No DB Credentials**: NEVER put MySQL credentials (`DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`) in the frontend environment. They belong exclusively on the PHP server.
3. **No Direct DB Connection**: The frontend must NEVER connect directly to the MySQL database. All database interactions go through the PHP API (`https://api.mkverse.my.id/api/`).
4. **No Supabase Dependency**: Supabase has been completely removed. All authentication, media storage, CRUD operations, and categories use the PHP backend.
