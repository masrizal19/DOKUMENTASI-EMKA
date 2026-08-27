const fs = require('fs');

let content = fs.readFileSync('src/components/AdminDashboard.tsx', 'utf8');

// For Save
const targetSave = `      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        throw sessionError;
      }`;

const replacementSave = `      let { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
        if (refreshError) throw refreshError;
        session = refreshData.session;
      }`;

content = content.replace(targetSave, replacementSave);

// For Delete
const targetDel = `      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;`;

const replacementDel = `      let { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
        if (refreshError) throw refreshError;
        session = refreshData.session;
      }`;

content = content.replace(targetDel, replacementDel);

fs.writeFileSync('src/components/AdminDashboard.tsx', content);
console.log("Updated AdminDashboard.tsx to refresh session");
