import { useEffect, useState } from 'react';
import { supabase, supabaseConfigSource } from '@/integrations/supabase/client';

/**
 * Diagnostik environment Supabase. Hanya tampil bila URL berisi ?debug=env.
 * Render di App.tsx (atau layout root) agar bisa diakses di production.
 */
export function EnvDiagnostic() {
  const [show, setShow] = useState(false);
  const [ping, setPing] = useState<'idle' | 'ok' | 'fail'>('idle');
  const [pingMsg, setPingMsg] = useState<string>('');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('debug') !== 'env') return;
    setShow(true);
    supabase.auth
      .getSession()
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
        setPing('fail');
        setPingMsg(e instanceof Error ? e.message : String(e));
      });
  }, []);

  if (!show) return null;

  const maskedUrl = supabaseConfigSource.url.replace(
    /(https?:\/\/)([^.]+)/,
    (_m, p, h) => `${p}${h.slice(0, 6)}…`,
  );

  // Extract project ref from URL (e.g. https://abcdef123456.supabase.co → abcdef123456)
  const projectRef = (() => {
    try {
      const u = new URL(supabaseConfigSource.url);
      return u.hostname.split('.')[0];
    } catch {
      return '?';
    }
  })();
  const EXPECTED_LOVABLE_REF = 'ribjppjnjigiowhjgngu';
  const refMatchesLovable = projectRef === EXPECTED_LOVABLE_REF;

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
        🔧 Supabase Env Diagnostic
      </div>
      <div>URL: <span style={{ color: '#a7f3d0' }}>{maskedUrl}</span></div>
      <div>
        Project ref:{' '}
        <span style={{ color: refMatchesLovable ? '#a7f3d0' : '#fbbf24' }}>
          {projectRef}
        </span>{' '}
        {!refMatchesLovable && (
          <span style={{ color: '#fbbf24', fontSize: 11 }}>
            (≠ Lovable Cloud {EXPECTED_LOVABLE_REF})
          </span>
        )}
      </div>
      <div>
        URL source:{' '}
        <span style={{ color: supabaseConfigSource.urlSource === 'env' ? '#a7f3d0' : '#fca5a5' }}>
          {supabaseConfigSource.urlSource}
        </span>
      </div>
      <div>
        Key source:{' '}
        <span style={{ color: supabaseConfigSource.keySource === 'env' ? '#a7f3d0' : '#fca5a5' }}>
          {supabaseConfigSource.keySource}
        </span>
      </div>
      <div>
        Env keys (VITE_SUPABASE*):{' '}
        <span style={{ color: '#cbd5e1' }}>
          {supabaseConfigSource.envKeysSeen.length
            ? supabaseConfigSource.envKeysSeen.join(', ')
            : '(none)'}
        </span>
      </div>
      <div style={{ marginTop: 6 }}>
        Connection:{' '}
        <span
          style={{
            color: ping === 'ok' ? '#a7f3d0' : ping === 'fail' ? '#fca5a5' : '#fbbf24',
          }}
        >
          {ping === 'idle' ? 'pinging…' : pingMsg}
        </span>
      </div>
      <div style={{ marginTop: 8, opacity: 0.7, fontSize: 11 }}>
        Tutup: hapus <code>?debug=env</code> dari URL.
      </div>
    </div>
  );
}

export default EnvDiagnostic;