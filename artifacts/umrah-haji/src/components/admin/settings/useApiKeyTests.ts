/**
 * Build the set of "test connection" handlers used by ApiKeysSection.
 * Each handler returns { ok, warn?, message } so ApiKeyGroup can render a banner.
 */
export function buildApiKeyTests(values: Record<string, string>) {
  const get = (k: string) => values[k]?.trim() || "";

  const testSupabase = async () => {
    const url = get("integration_supabase_url");
    const key = get("integration_supabase_anon_key");
    if (!url || !key) return { ok: false, message: "Isi Supabase URL dan Anon Key terlebih dahulu." };
    try {
      const res = await fetch(`${url}/rest/v1/`, {
        headers: { apikey: key, Authorization: `Bearer ${key}` },
        signal: AbortSignal.timeout(8000),
      });
      if (res.ok || res.status === 404 || res.status === 200) {
        return { ok: true, message: `Koneksi Supabase berhasil! (HTTP ${res.status}) URL dan kunci valid.` };
      }
      if (res.status === 401 || res.status === 403) {
        return { ok: false, message: `Autentikasi gagal (HTTP ${res.status}). Periksa Anon Key Anda.` };
      }
      return { ok: false, message: `Supabase merespons HTTP ${res.status}. Periksa konfigurasi.` };
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Network error";
      return { ok: false, message: `Tidak dapat terhubung ke Supabase: ${msg}` };
    }
  };

  const testVapid = async () => {
    const pub  = get("integration_vapid_public_key");
    const priv = get("integration_vapid_private_key");
    if (!pub && !priv) return { ok: false, message: "Masukkan VAPID Public Key dan Private Key." };
    const b64url = /^[A-Za-z0-9\-_]+$/;
    if (pub && (pub.length < 80 || pub.length > 96 || !pub.startsWith("B"))) {
      return { ok: false, warn: true, message: "VAPID Public Key terlihat tidak valid. Harus diawali 'B' dan panjang ~88 karakter (base64url)." };
    }
    if (priv && (priv.length < 38 || priv.length > 50 || !b64url.test(priv))) {
      return { ok: false, warn: true, message: "VAPID Private Key terlihat tidak valid. Harus ~43 karakter base64url." };
    }
    const msgs: string[] = [];
    if (pub)  msgs.push(`Public Key: ${pub.slice(0, 8)}...${pub.slice(-4)} (${pub.length} karakter) ✓`);
    if (priv) msgs.push(`Private Key: ***...${priv.slice(-4)} (${priv.length} karakter) ✓`);
    return { ok: true, message: `Format VAPID terlihat valid.\n${msgs.join("\n")}` };
  };

  const testMidtrans = async () => {
    const serverKey = get("integration_midtrans_server_key");
    const clientKey = get("integration_midtrans_client_key");
    if (!serverKey && !clientKey) return { ok: false, message: "Masukkan Server Key atau Client Key Midtrans." };
    const isSandboxServer = serverKey?.startsWith("SB-Mid-server-");
    const isProdServer    = serverKey?.startsWith("Mid-server-");
    const isSandboxClient = clientKey?.startsWith("SB-Mid-client-");
    const isProdClient    = clientKey?.startsWith("Mid-client-");
    if (serverKey && !isSandboxServer && !isProdServer) {
      return { ok: false, warn: true, message: "Server Key tidak dikenali. Format yang benar: 'SB-Mid-server-...' (sandbox) atau 'Mid-server-...' (produksi)." };
    }
    if (clientKey && !isSandboxClient && !isProdClient) {
      return { ok: false, warn: true, message: "Client Key tidak dikenali. Format yang benar: 'SB-Mid-client-...' (sandbox) atau 'Mid-client-...' (produksi)." };
    }
    const env  = (isSandboxServer || isSandboxClient) ? "Sandbox" : "Produksi";
    const msgs: string[] = [];
    if (serverKey) msgs.push(`Server Key: ${serverKey.slice(0, 14)}...***`);
    if (clientKey) msgs.push(`Client Key: ${clientKey.slice(0, 14)}...***`);
    return { ok: true, message: `Format Midtrans valid — mode ${env}.\n${msgs.join("\n")}` };
  };

  const testFonnte = async () => {
    const apiKey = get("integration_fonnte_api_key");
    const sender = get("integration_fonnte_sender");
    if (!apiKey) return { ok: false, message: "Masukkan Fonnte API Key terlebih dahulu." };
    try {
      const res = await fetch("https://api.fonnte.com/get-devices", {
        method: "GET",
        headers: { Authorization: apiKey },
        signal: AbortSignal.timeout(8000),
      });
      const json = await res.json().catch(() => ({} as Record<string, unknown>));
      const status = (json as { status?: boolean }).status;
      const reason = (json as { reason?: string }).reason;
      const data   = (json as { data?: Array<{ name?: string; device?: string }> }).data;
      if (status === true || res.ok) {
        const deviceInfo = Array.isArray(data) && data.length > 0
          ? `Perangkat terhubung: ${data.map(d => d.name || d.device).join(", ")}`
          : "API Key valid. Belum ada perangkat terhubung.";
        return { ok: true, message: `Koneksi Fonnte berhasil! ${deviceInfo}${sender ? `\nNomor pengirim: ${sender}` : ""}` };
      }
      if (reason === "authorization failed") {
        return { ok: false, message: "API Key Fonnte tidak valid. Periksa kembali kunci Anda di dashboard Fonnte." };
      }
      return { ok: false, message: `Fonnte merespons: ${reason || JSON.stringify(json)}` };
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Network error";
      return { ok: false, message: `Tidak dapat terhubung ke Fonnte: ${msg}` };
    }
  };

  const testSmtp = async () => {
    const host = get("integration_smtp_host");
    const port = get("integration_smtp_port");
    const user = get("integration_smtp_user");
    const pass = get("integration_smtp_pass");
    if (!host) return { ok: false, message: "Masukkan SMTP Host terlebih dahulu." };
    const portNum = parseInt(port || "");
    if (port && (isNaN(portNum) || portNum < 1 || portNum > 65535)) {
      return { ok: false, warn: true, message: "SMTP Port tidak valid. Gunakan port 25, 465, 587, atau 2525." };
    }
    const commonPorts = [25, 465, 587, 2525];
    const portNote = port && !commonPorts.includes(portNum) ? ` (port tidak umum, biasanya 587)` : "";
    const msgs = [
      `Host: ${host}`,
      `Port: ${port || "tidak diset"}${portNote}`,
      `Username: ${user || "tidak diset"}`,
      `Password: ${pass ? "***diset***" : "tidak diset"}`,
    ];
    const allSet = host && port && user && pass;
    return {
      ok: !!allSet,
      warn: !allSet,
      message: allSet
        ? `Konfigurasi SMTP lengkap dan terlihat valid.\n${msgs.join("\n")}\nGunakan tombol "Kirim Email Test" untuk mengirim email sungguhan.`
        : `Konfigurasi SMTP belum lengkap:\n${msgs.join("\n")}`,
    };
  };

  return { testSupabase, testVapid, testMidtrans, testFonnte, testSmtp };
}