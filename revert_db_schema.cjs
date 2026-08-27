const fs = require('fs');

let content = fs.readFileSync('supabase_schema.sql', 'utf8');

// I will make sure the function admin_save_activity uses RAISE EXCEPTION 'Unauthorized';
const targetStart = `  IF NOT COALESCE(v_is_valid, false) THEN
    -- Check if called by an authenticated Supabase Auth user
    IF auth.uid() IS NULL THEN
      RETURN json_build_object('success', false, 'message', 'Unauthorized: Autentikasi admin gagal atau sesi tidak valid.');
    END IF;
  END IF;`;

const replacement = `  IF NOT COALESCE(v_is_valid, false) THEN
    IF auth.uid() IS NULL THEN
      RAISE EXCEPTION 'Unauthorized';
    END IF;
  END IF;`;

content = content.replace(targetStart, replacement);
fs.writeFileSync('supabase_schema.sql', content);
console.log("Updated schema sql file to use RAISE EXCEPTION 'Unauthorized'");
