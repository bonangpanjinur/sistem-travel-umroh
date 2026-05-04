import { useEffect, useState } from 'react';

/**
 * Diagnostik environment Supabase. Hanya tampil bila URL berisi ?debug=env.
 * Render di App.tsx (atau layout root) agar bisa diakses di production.
 */
export function EnvDiagnostic() {
  const [show, setShow] = useState(false);
  const [ping, setPing] = useState<'idle' | 'ok' | 'fail' | 'unconfigured'>('idle');
  const [pingMsg, setPingMsg] = useState<string>('');
  const [configSource, setConfigSource] = useState<{
    url: string;
    urlSource: string;
    keySource: string;
    envKeysSeen: readonly string[];
  } | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('debug') !== 'env') return;
    setShow(true);

    // Dynamically import to avoid crashing if supabase is not configured
    import('@/integrations/supabase/client')
      .then(({ supabase, supabaseConfigSource }) => {
        setConfigSource(supabaseConfigSource);
        return supabase.auth.getSession();
      })
      .then(({ error }) => {
        if (error) {
          setPing('fail');
          setPingMsg(error.message);
        } else {
          setPing('ok');
          setPingMsg('auth.getSession() OK');
        }
      })
      .catch((e: unknown) => {
        if (e instanceof Error && e.message.includes('tidak terkonfigurasi')) {
          setPing('unconfigured');
          setPingMsg('Set VITE_SUPABASE_URL & VITE_SUPABASE_PUBLISHABLE_KEY di Replit Secrets');
        } else {
          setPing('fail');
          setPingMsg(e instanceof Error ? e.message : String(e));
        }
      });
  }, []);

  if (!show) return null;

  const maskedUrl = configSource?.url
    ? configSource.url.replace(/(https?:\/\/)([^.]+)/, (_m, p, h) => `${p}${h.slice(0, 6)}…`)
    : '(tidak terkonfigurasi)';

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 12,
        right: 12,
        zIndex: 99999,
        maxWidth: 360,
        padding: 14,
        borderRadius: 10,
        background: 'rgba(15,23,42,0.96)',
        color: '#e2e8f0',
        fontFamily: 'ui-monospace, monospace',
        fontSize: 12,
        lineHeight: 1.5,
        boxShadow: '0 10px 30px rgba(0,0,0,0.35)',
      }}
    >
      <div style={{ fontWeight: 700, marginBottom: 6, color: '#fbbf24' }}>
        Supabase Env Diagnostic
      </div>
      <div>URL: <span style={{ color: '#a7f3d0' }}>{maskedUrl}</span></div>
      <div>
        URL source:{' '}
        <span style={{ color: configSource?.urlSource === 'env' ? '#a7f3d0' : '#fca5a5' }}>
          {configSource?.urlSource ?? 'unknown'}
        </span>
      </div>
      <div>
        Key source:{' '}
        <span style={{ color: configSource?.keySource === 'env' ? '#a7f3d0' : '#fca5a5' }}>
          {configSource?.keySource ?? 'unknown'}
        </span>
      </div>
      <div>
        Env keys (VITE_SUPABASE*):{' '}
        <span style={{ color: '#cbd5e1' }}>
          {configSource?.envKeysSeen.length
            ? configSource.envKeysSeen.join(', ')
            : '(none)'}
        </span>
      </div>
      <div style={{ marginTop: 6 }}>
        Connection:{' '}
        <span
          style={{
            color:
              ping === 'ok'
                ? '#a7f3d0'
                : ping === 'unconfigured'
                ? '#fbbf24'
                : ping === 'fail'
                ? '#fca5a5'
                : '#fbbf24',
          }}
        >
          {ping === 'idle' ? 'pinging…' : pingMsg}
        </span>
      </div>
      {(configSource?.urlSource === 'missing' || configSource?.keySource === 'missing') && (
        <div style={{ marginTop: 8, color: '#fca5a5', fontSize: 11 }}>
          Tambahkan VITE_SUPABASE_URL & VITE_SUPABASE_PUBLISHABLE_KEY di Replit Secrets.
        </div>
      )}
      <div style={{ marginTop: 8, opacity: 0.7, fontSize: 11 }}>
        Tutup: hapus <code>?debug=env</code> dari URL.
      </div>
    </div>
  );
}

export default EnvDiagnostic;
