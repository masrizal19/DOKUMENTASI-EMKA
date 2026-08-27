const fs = require('fs');
let content = fs.readFileSync('src/components/AdminDashboard.tsx', 'utf8');

const target = `      if (rpcErr || (rpcRes && !rpcRes.success)) {
        const errorMsg = rpcErr?.message || rpcRes?.message || "Data kegiatan gagal disimpan.";
        console.error('ACTIVITY SAVE ERROR', { rpcErr, rpcRes });
        onShowToast(\`Data kegiatan gagal disimpan: \${errorMsg}\`, "error");
      }`;

const replacement = `      if (rpcErr || (rpcRes && !rpcRes.success)) {
        const errorMsg = rpcErr?.message || rpcErr?.details || rpcErr?.hint || rpcRes?.message || "Kesalahan tidak diketahui.";
        console.error('ACTIVITY SAVE ERROR DETAILS:', { rpcErr, rpcRes });
        
        let displayError = errorMsg;
        if (errorMsg.includes("JWT expired")) displayError = "Sesi kedaluwarsa (JWT expired). Silakan login ulang.";
        else if (errorMsg.includes("Unauthorized")) displayError = "Akses ditolak (Unauthorized). Pastikan Anda memiliki izin.";
        else if (errorMsg.includes("permission denied")) displayError = "Akses RLS ditolak (Permission Denied).";
        else if (errorMsg.includes("function not found")) displayError = "Fungsi database tidak ditemukan (Function not found).";
        else if (errorMsg.includes("invalid input syntax for type uuid")) displayError = "Format ID tidak valid (Invalid UUID).";
        
        onShowToast(\`Gagal menyimpan: \${displayError}\`, "error");
      }`;

content = content.replace(target, replacement);
fs.writeFileSync('src/components/AdminDashboard.tsx', content);
console.log("Updated error logging.");
