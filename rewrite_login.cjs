const fs = require('fs');

let content = fs.readFileSync('src/components/AdminLogin.tsx', 'utf8');

const targetStart = `    try {
      let authSuccessful = false;`;

const targetEnd = `    } finally {
      setIsLoading(false);
    }`;

const startIdx = content.indexOf(targetStart);
const endIdx = content.indexOf(targetEnd);

if (startIdx !== -1 && endIdx !== -1) {
  const replacement = `    try {
      let email = username.trim();
      if (!email.includes('@')) {
        email = \`\${email}@multikarya.sch.id\`;
      }

      // Supabase Auth Integration
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: email,
        password: pin
      });

      clearTimeout(timeoutId);

      if (authError || !authData.session) {
        setIsError(true);
        onShowToast("Username atau PIN (Password) salah.", "error");
      } else {
        const { data: { user } } = await supabase.auth.getUser();
        console.log('[ADMIN AUTH] session:', authData.session);
        console.log('[ADMIN AUTH] user id:', user?.id);
        console.log('[ADMIN AUTH] email:', user?.email);
        
        sessionStorage.setItem("admin_pin", pin);
        sessionStorage.setItem("admin_username", username.trim());
        sessionStorage.setItem("admin_token", authData.session.access_token);
        
        onShowToast("Login Berhasil! Selamat datang di dashboard admin.", "success");
        onLoginSuccess(authData.session.access_token);
      }
    } catch (err: any) {
      clearTimeout(timeoutId);
      setIsError(true);
      if (isTimeout || err?.message === "TIMEOUT") {
        onShowToast("Koneksi berakhir (timeout). Silakan coba lagi.", "error");
      } else {
        onShowToast("Server sedang tidak dapat dihubungi. Silakan coba lagi.", "error");
      }
`;

  content = content.substring(0, startIdx) + replacement + content.substring(endIdx);
  
  // Also remove the maxLength={4} constraint and regex
  const targetInput = `if (/^\\d*$/.test(val) && val.length <= 4) {`;
  const replacementInput = `if (true) {`;
  content = content.replace(targetInput, replacementInput);
  content = content.replace(`maxLength={4}`, ``);

  fs.writeFileSync('src/components/AdminLogin.tsx', content);
  console.log("Updated AdminLogin.tsx!");
} else {
  console.log("Could not find targets");
}
