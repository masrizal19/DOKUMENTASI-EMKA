import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.112.4"
import * as bcrypt from "https://deno.land/x/bcrypt@v0.4.1/mod.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { username = "ADMIN", pin, action, activity } = await req.json()

    if (!pin || !action) {
      return new Response(
        JSON.stringify({ success: false, message: "PIN dan action diperlukan." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ""
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ""

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ success: false, message: "Konfigurasi server Supabase belum lengkap." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // 1. Verify admin credentials securely
    const { data: admin, error: adminError } = await supabase
      .from('admin_credentials')
      .select('pin_hash, active, is_active')
      .ilike('username', username.trim())
      .maybeSingle()

    if (adminError || !admin) {
      return new Response(
        JSON.stringify({ success: false, message: "Autentikasi admin gagal: Kredensial tidak ditemukan." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      )
    }

    const activeVal = admin.is_active !== null ? admin.is_active : (admin.active !== null ? admin.active : true);
    if (activeVal !== true) {
      return new Response(
        JSON.stringify({ success: false, message: "Akun admin tidak aktif." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      )
    }

    const isValid = await bcrypt.compare(pin, admin.pin_hash)
    if (!isValid) {
      return new Response(
        JSON.stringify({ success: false, message: "PIN admin salah." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      )
    }

    // 2. Perform requested action on public.activities using service role client (bypassing RLS safely)
    let result;
    const now = new Date().toISOString();

    if (action === 'insert') {
      const payload = {
        title: activity.title,
        slug: activity.slug || null,
        date: activity.date || null,
        category: activity.category || "Kegiatan Sekolah",
        description: activity.description || "",
        cover_image: activity.cover_image || "",
        background_image: activity.background_image || "",
        background_video: activity.background_video || null,
        google_drive_url: activity.google_drive_url || null,
        published: activity.published ?? false,
        featured: activity.featured ?? false,
        sort_order: activity.sort_order ?? 0,
        created_at: now,
        updated_at: now
      };

      result = await supabase
        .from('activities')
        .insert(payload)
        .select()
        .single();

    } else if (action === 'update') {
      if (!activity || !activity.id) {
        return new Response(
          JSON.stringify({ success: false, message: "ID kegiatan diperlukan untuk update." }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
        );
      }

      const payload = {
        title: activity.title,
        slug: activity.slug || null,
        date: activity.date || null,
        category: activity.category || "Kegiatan Sekolah",
        description: activity.description || "",
        cover_image: activity.cover_image || "",
        background_image: activity.background_image || "",
        background_video: activity.background_video || null,
        google_drive_url: activity.google_drive_url || null,
        published: activity.published ?? false,
        featured: activity.featured ?? false,
        sort_order: activity.sort_order ?? 0,
        updated_at: now
      };

      result = await supabase
        .from('activities')
        .update(payload)
        .eq('id', activity.id)
        .select()
        .single();

    } else if (action === 'delete') {
      if (!activity || !activity.id) {
        return new Response(
          JSON.stringify({ success: false, message: "ID kegiatan diperlukan untuk delete." }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
        );
      }

      result = await supabase
        .from('activities')
        .delete()
        .eq('id', activity.id);

    } else {
      return new Response(
        JSON.stringify({ success: false, message: "Action tidak dikenal." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    if (result.error) {
      return new Response(
        JSON.stringify({ success: false, message: result.error.message, details: result.error.details, code: result.error.code }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    return new Response(
      JSON.stringify({ success: true, data: result.data }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );

  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, message: err.message || "Terjadi kesalahan internal pada server." }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
})
