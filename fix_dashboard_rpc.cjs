const fs = require('fs');

let content = fs.readFileSync('src/components/AdminDashboard.tsx', 'utf8');

// The block to replace:
// from "const adminToken = sessionStorage.getItem("admin_token");"
// to "if (rpcErr || (rpcRes && !rpcRes.success)) {"

const targetStart = `      const adminToken = sessionStorage.getItem("admin_token");`;
const targetEnd = `      if (rpcErr || (rpcRes && !rpcRes.success)) {`;

const startIdx = content.indexOf(targetStart);
const endIdx = content.indexOf(targetEnd);

if (startIdx !== -1 && endIdx !== -1) {
  const replacement = `      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        throw sessionError;
      }
      
      if (!session?.user?.id) {
        throw new Error('Sesi admin Supabase tidak ditemukan. Silakan login kembali.');
      }
      
      const { data: { user } } = await supabase.auth.getUser();
      console.log('[ADMIN AUTH] session:', session);
      console.log('[ADMIN AUTH] user id:', session?.user?.id);
      console.log('[ADMIN AUTH] email:', session?.user?.email);

      const payload = {
        p_id: isEditingExisting ? editingActivity.id : null,
        p_title: activityFormData.title,
        p_date: activityFormData.date || null,
        p_category: activityFormData.category || "Kegiatan Sekolah",
        p_description: activityFormData.description || "",
        p_cover_image: finalCoverUrl || "",
        p_background_image: "",
        p_background_video: finalVideoUrl || null,
        p_google_drive_url: activityFormData.google_drive_url || null,
        p_published: activityFormData.status === "published",
        p_featured: false,
        p_sort_order: 0,
        p_username: session?.user?.email || "admin",
        p_pin: "",
        p_background_video_start: videoTrimStart,
        p_background_video_end: videoTrimEnd,
        p_background_video_loop: videoTrimLoop
      };

      const { data: rpcRes, error: rpcErr } = await supabase.rpc("admin_save_activity", payload);

`;
  content = content.substring(0, startIdx) + replacement + content.substring(endIdx);
  
  // also fix the error logging block
  const errLogTarget = `console.error('ACTIVITY SAVE ERROR DETAILS:', { rpcErr, rpcRes });`;
  const errLogReplacement = `console.error('[ADMIN SAVE] RPC error:', rpcErr || rpcRes);`;
  content = content.replace(errLogTarget, errLogReplacement);

  fs.writeFileSync('src/components/AdminDashboard.tsx', content);
  console.log("Updated AdminDashboard.tsx RPC call");
} else {
  console.log("Could not find targets");
}
