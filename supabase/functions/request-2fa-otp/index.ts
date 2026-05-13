// supabase/functions/request-2fa-otp/index.ts
// Generates a 6-digit OTP for 2FA flows (setup or login) and queues delivery
// via WhatsApp (whatsapp_logs) and/or email (email_logs).
//
// Auth: requires a valid JWT (the user has just signed in or is an admin
// configuring their own 2FA).

// @ts-nocheck
import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000))
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
    const userEmail = claimData.claims.email as string | undefined

    const body = await req.json().catch(() => ({}))
    const purpose = body.purpose === 'login' ? '2fa_login' : '2fa_setup'
    const method = (body.method === 'whatsapp' ? 'whatsapp' : 'email') as
      | 'whatsapp'
      | 'email'
    const phoneOverride: string | undefined = body.phone

    const admin = createClient(supabaseUrl, serviceKey)

    // Pull existing 2FA settings (for phone fallback during login)
    const { data: existing } = await admin
      .from('user_2fa_settings')
      .select('phone_number, method')
      .eq('user_id', userId)
      .maybeSingle()

    const phone = phoneOverride?.trim() || existing?.phone_number || ''
    if (method === 'whatsapp' && !phone) {
      return new Response(
        JSON.stringify({ error: 'Nomor WhatsApp belum dikonfigurasi.' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }
    if (method === 'email' && !userEmail) {
      return new Response(
        JSON.stringify({ error: 'Email user tidak ditemukan dari sesi.' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Throttle: max 1 active OTP per minute per user/purpose
    const oneMinAgo = new Date(Date.now() - 60_000).toISOString()
    const { count: recentCount } = await admin
      .from('otp_codes')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('purpose', purpose)
      .gte('created_at', oneMinAgo)
    if ((recentCount ?? 0) >= 1) {
      return new Response(
        JSON.stringify({
          error: 'OTP baru saja dikirim. Tunggu 1 menit sebelum minta lagi.',
        }),
        {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Invalidate previous unused OTPs of same purpose
    await admin
      .from('otp_codes')
      .update({ is_used: true, used_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('purpose', purpose)
      .eq('is_used', false)

    const code = generateOtp()
    const expiresAt = new Date(Date.now() + 5 * 60_000).toISOString()

    const { error: insertErr } = await admin.from('otp_codes').insert({
      user_id: userId,
      code,
      purpose,
      expires_at: expiresAt,
    })
    if (insertErr) {
      console.error('Insert OTP error', insertErr)
      return new Response(JSON.stringify({ error: 'Gagal generate OTP' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const purposeLabel =
      purpose === '2fa_login' ? 'login' : 'aktivasi 2FA'
    const message = `Kode verifikasi ${purposeLabel} Anda: ${code}\nBerlaku 5 menit. Jangan bagikan kode ini ke siapa pun.`

    if (method === 'whatsapp') {
      const { error: waErr } = await admin.from('whatsapp_logs').insert({
        recipient_phone: phone,
        message_content: message,
        status: 'pending',
      })
      if (waErr) console.error('Queue WA error', waErr)
    } else {
      const { error: emErr } = await admin.from('email_logs').insert({
        recipient_email: userEmail,
        subject: 'Kode Verifikasi 2FA',
        body_html: `<p>${message.replace(/\n/g, '<br>')}</p>`,
        template_type: 'two_factor_auth',
        status: 'pending',
        metadata: { purpose },
      })
      if (emErr) console.error('Queue email error', emErr)
    }

    return new Response(
      JSON.stringify({
        ok: true,
        method,
        // Only echo destination hint, never the code itself.
        destination:
          method === 'whatsapp'
            ? phone.replace(/.(?=.{4})/g, '*')
            : userEmail!.replace(/(.{2}).*(@.*)/, '$1***$2'),
        expires_at: expiresAt,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (e) {
    console.error('request-2fa-otp fatal', e)
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})