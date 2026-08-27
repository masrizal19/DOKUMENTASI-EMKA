const fs = require('fs');

let content = fs.readFileSync('src/components/AdminDashboard.tsx', 'utf8');

const target = `      const adminPin = sessionStorage.getItem("admin_pin") || "1902";
      const adminUsername = sessionStorage.getItem("admin_username") || "ADMIN";`;

const replacement = `      const adminPin = sessionStorage.getItem("admin_pin") || "1902";
      const adminUsername = sessionStorage.getItem("admin_username") || "ADMIN";
      const adminToken = sessionStorage.getItem("admin_token");
      
      if (!adminToken) {
        onShowToast("Sesi admin tidak ditemukan. Silakan login kembali.", "error");
        setUploadLoading(false);
        setUploadStatusText("");
        return;
      }

      // Pastikan session Supabase valid sebelum memanggil RPC jika menggunakan Auth
      const { data: { session }, error: authErr } = await supabase.auth.getSession();
      if (authErr) {
        console.error("Auth Session Error:", authErr);
      }`;

content = content.replace(target, replacement);

fs.writeFileSync('src/components/AdminDashboard.tsx', content);
console.log("Updated AdminDashboard.tsx");
