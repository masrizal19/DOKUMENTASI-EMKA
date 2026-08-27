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

      // Check if we have a real Supabase session and if it's expired
      const { data: authData, error: authErr } = await supabase.auth.getSession();
      if (authErr) {
        onShowToast("Sesi kedaluwarsa (JWT expired). Silakan login kembali.", "error");
        setUploadLoading(false);
        setUploadStatusText("");
        return;
      }
`;

content = content.replace(target, replacement);

fs.writeFileSync('src/components/AdminDashboard.tsx', content);
console.log("Updated AdminDashboard.tsx");
