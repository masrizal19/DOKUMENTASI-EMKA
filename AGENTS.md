-e 
# GALERI EMKA ARCHITECTURE RULES

1. **API Only for Frontend**: The frontend must ONLY use `VITE_API_URL=https://api.mkverse.my.id` to connect to the backend.
2. **No DB Credentials**: NEVER put MySQL credentials (`DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`) in the frontend environment. They belong exclusively on the PHP server.
3. **No Direct DB Connection**: The frontend must NEVER connect directly to the MySQL database. All database interactions must go through the PHP API (`https://api.mkverse.my.id/`).
4. **Supabase Deprecation**: Do not hastily remove Supabase keys (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) until the migration to PHP API is 100% complete for all features (Auth, CRUD, Storage, Settings).
