const fs = require('fs');

let content = fs.readFileSync('src/components/AdminDashboard.tsx', 'utf8');

const target = `      // Pastikan session Supabase valid sebelum memanggil RPC jika menggunakan Auth
      const { data: { session }, error: authErr } = await supabase.auth.getSession();
      if (authErr) {
        console.error("Auth Session Error:", authErr);
      }`;

const replacement = `      // Pastikan session Supabase valid sebelum memanggil RPC jika menggunakan Auth
      const { data: { session }, error: authErr } = await supabase.auth.getSession();
      if (authErr || (!session && adminToken !== "emka_admin_session_active")) {
        console.error("Auth Session Error:", authErr);
        // Clear stale session to avoid PostgREST 401 Unauthorized
        await supabase.auth.signOut().catch(() => {});
      }`;

content = content.replace(target, replacement);

fs.writeFileSync('src/components/AdminDashboard.tsx', content);
console.log("Updated AdminDashboard.tsx auth handling.");
