const fs = require('fs');

let content = fs.readFileSync('src/components/AdminDashboard.tsx', 'utf8');

const targetStart = `      const adminPin = sessionStorage.getItem("admin_pin") || "1902";
      const adminUsername = sessionStorage.getItem("admin_username") || "ADMIN";

      const { data: rpcRes, error: rpcErr } = await supabase.rpc("admin_delete_activity", {
        p_username: adminUsername,
        p_pin: adminPin,
        p_id: id
      });`;

const replacement = `      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      if (!session?.user?.id) throw new Error('Sesi admin Supabase tidak ditemukan. Silakan login kembali.');

      const { data: rpcRes, error: rpcErr } = await supabase.rpc("admin_delete_activity", {
        p_username: session.user.email || "admin",
        p_pin: "",
        p_id: id
      });`;

content = content.replace(targetStart, replacement);
fs.writeFileSync('src/components/AdminDashboard.tsx', content);
console.log("Updated AdminDashboard.tsx delete RPC");
