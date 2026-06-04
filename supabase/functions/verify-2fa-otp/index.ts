// supabase/functions/verify-2fa-otp/index.ts
// Verifies a 6-digit OTP for 2FA. On success:
//   - purpose=setup → enables user_2fa_settings (is_enabled=true, method, phone)
//   - purpose=login → updates last_verified_at (challenge passed for this session)

// @ts-nocheck
import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const token = authHeader.replace('Bearer ', '')
    const { data: claimData, error: claimErr } = await userClient.auth.getClaims(token)
    if (claimErr || !claimData?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    const userId = claimData.claims.sub as string

    const body = await req.json().catch(() => ({}))
    const code = String(body.code || '').trim()
    const purpose = body.purpose === 'login' ? '2fa_login' : '2fa_setup'
    const method = body.method === 'whatsapp' ? 'whatsapp' : 'email'
    const phone: string | undefined = body.phone

    if (!/^\d{6}$/.test(code)) {
      return new Response(JSON.stringify({ error: 'Kode harus 6 digit angka.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const admin = createClient(supabaseUrl, serviceKey)

    const { data: row, error: selErr } = await admin
      .from('otp_codes')
      .select('id, code, expires_at, attempts, max_attempts, is_used')
      .eq('user_id', userId)
      .eq('purpose', purpose)
      .eq('is_used', false)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (selErr) {
      console.error('select otp', selErr)
      return new Response(JSON.stringify({ error: 'Internal error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    if (!row) {
      return new Response(
        JSON.stringify({ error: 'OTP tidak ditemukan / sudah kadaluarsa.' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }
    if (new Date(row.expires_at).getTime() < Date.now()) {
      await admin.from('otp_codes').update({ is_used: true, used_at: new Date().toISOString() }).eq('id', row.id)
      return new Response(JSON.stringify({ error: 'OTP kadaluarsa. Minta kode baru.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    if ((row.attempts ?? 0) >= (row.max_attempts ?? 5)) {
      await admin.from('otp_codes').update({ is_used: true }).eq('id', row.id)
      return new Response(JSON.stringify({ error: 'Terlalu banyak percobaan. Minta kode baru.' }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    if (row.code !== code) {
      await admin.from('otp_codes').update({ attempts: (row.attempts ?? 0) + 1 }).eq('id', row.id)
      return new Response(JSON.stringify({ error: 'Kode salah.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Mark used
    await admin
      .from('otp_codes')
      .update({ is_used: true, used_at: new Date().toISOString() })
      .eq('id', row.id)

    if (purpose === '2fa_setup') {
      const { error: upErr } = await admin
        .from('user_2fa_settings')
        .upsert(
          {
            user_id: userId,
            is_enabled: true,
            method,
            phone_number: method === 'whatsapp' ? phone || null : null,
            last_verified_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' }
        )
      if (upErr) {
        console.error('upsert 2fa', upErr)
        return new Response(JSON.stringify({ error: 'Gagal aktivasi 2FA' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
    } else {
      await admin
        .from('user_2fa_settings')
        .update({ last_verified_at: new Date().toISOString() })
        .eq('user_id', userId)
    }

    return new Response(JSON.stringify({ ok: true, purpose }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    console.error('verify-2fa-otp fatal', e)
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})