import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.112.4"
import * as bcrypt from "https://deno.land/x/bcrypt@v0.4.1/mod.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { username, pin } = await req.json()

    if (!username || !pin) {
      return new Response(
        JSON.stringify({ success: false, authenticated: false, message: "Username dan PIN diperlukan." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ""
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ""

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ success: false, authenticated: false, message: "Konfigurasi server Supabase belum lengkap." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Fetch the admin credentials case-insensitively using ilike
    const { data: admin, error } = await supabase
      .from('admin_credentials')
      .select('pin_hash, active, is_active')
      .ilike('username', username.trim())
      .maybeSingle()

    if (error || !admin) {
      return new Response(
        JSON.stringify({ success: false, authenticated: false, message: "Username atau PIN salah." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      )
    }

    // Check coalesce(is_active, active, true) = true
    const activeVal = admin.is_active !== null ? admin.is_active : (admin.active !== null ? admin.active : true);
    if (activeVal !== true) {
      return new Response(
        JSON.stringify({ success: false, authenticated: false, message: "Akun admin tidak aktif." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      )
    }

    // Verify bcrypt pin_hash
    const isValid = await bcrypt.compare(pin, admin.pin_hash)
    if (!isValid) {
      return new Response(
        JSON.stringify({ success: false, authenticated: false, message: "Username atau PIN salah." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      )
    }

    return new Response(
      JSON.stringify({ success: true, authenticated: true, username: "ADMIN" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    )

  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, authenticated: false, message: err.message || "Terjadi kesalahan internal." }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    )
  }
})
