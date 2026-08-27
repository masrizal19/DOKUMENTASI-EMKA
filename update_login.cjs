const fs = require('fs');
let content = fs.readFileSync('src/components/AdminLogin.tsx', 'utf8');

const targetInput = `if (/^\\d*$/.test(val) && val.length <= 4) {`;
const replacementInput = `if (true) {`;
content = content.replace(targetInput, replacementInput);
content = content.replace(`maxLength={4}`, ``);

const targetHandleSubmit = `      // 1. Primary Method: Try Supabase Edge Function`;
const endHandleSubmit = `      } else {        setIsError(true);        onShowToast("Server sedang tidak dapat dihubungi. Silakan coba lagi.", "error");      }`;

const startIdx = content.indexOf(targetHandleSubmit);
const endIdx = content.indexOf(endHandleSubmit) + endHandleSubmit.length;

if (startIdx !== -1 && endIdx !== -1) {
  const replacement = `      let email = username.trim();
      if (!email.includes('@')) {
        email = \`\${email}@multikarya.sch.id\`;
      }

      // Supabase Auth Integration
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: email,
        password: pin
      });

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
      }`;
  
  content = content.substring(0, startIdx) + replacement + content.substring(endIdx);
  fs.writeFileSync('src/components/AdminLogin.tsx', content);
  console.log("Updated AdminLogin.tsx login logic");
} else {
  console.log("Could not find targets");
}
