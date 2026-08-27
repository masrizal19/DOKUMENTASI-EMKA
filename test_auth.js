import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function check() {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: 'admin@multikarya.sch.id',
    password: 'password123'
  });
  console.log("Login with password123:", error ? error.message : "Success");
}
check();
