import { startAuthentication, startRegistration } from '@simplewebauthn/browser';
import { ArrowLeft, Fingerprint, KeyRound, LoaderCircle, ShieldCheck } from 'lucide-react';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { apiFetch } from '../api';
import type { Language } from '../i18n';

interface AdminAuthProps {
  children: (logout: () => Promise<void>) => ReactNode;
  lang: Language;
  onBack: () => void;
}

interface SessionState {
  authenticated: boolean;
  configured: boolean;
}

export function AdminAuth({ children, lang, onBack }: AdminAuthProps) {
  const [session, setSession] = useState<SessionState | null>(null);
  const [setupToken, setSetupToken] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    const response = await apiFetch('/api/auth/session');
    if (!response.ok) throw new Error('Unable to check authentication status');
    setSession(await response.json());
  }, []);

  useEffect(() => {
    refresh().catch((reason: unknown) => setError(reason instanceof Error ? reason.message : 'Authentication service unavailable'));
  }, [refresh]);

  const runPasskey = async () => {
    setBusy(true);
    setError('');
    try {
      const registering = !session?.configured;
      const optionsResponse = await apiFetch(registering ? '/api/auth/register/options' : '/api/auth/login/options', {
        method: 'POST',
        headers: registering ? { 'X-Setup-Token': setupToken } : undefined,
      });
      const payload = await optionsResponse.json();
      if (!optionsResponse.ok) throw new Error(payload.error || 'Unable to start Passkey verification');
      const response = registering
        ? await startRegistration({ optionsJSON: payload.options })
        : await startAuthentication({ optionsJSON: payload.options });
      const verifyResponse = await apiFetch(registering ? '/api/auth/register/verify' : '/api/auth/login/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ challengeId: payload.challengeId, response }),
      });
      const verification = await verifyResponse.json();
      if (!verifyResponse.ok || !verification.verified) throw new Error(verification.error || 'Passkey verification failed');
      await refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Passkey verification failed');
    } finally {
      setBusy(false);
    }
  };

  const logout = async () => {
    await apiFetch('/api/auth/logout', { method: 'POST' });
    await refresh();
  };

  if (session?.authenticated) return <>{children(logout)}</>;

  const zh = lang === 'zh';
  return (
    <main className="min-h-screen bg-[#f5f5f7] dark:bg-[#111113] text-[#1d1d1f] dark:text-[#f5f5f7] flex flex-col">
      <header className="h-14 flex items-center px-5 sm:px-8 border-b border-black/[0.06] dark:border-white/[0.08]">
        <button onClick={onBack} className="inline-flex items-center gap-1.5 text-sm text-[#6e6e73] dark:text-[#a1a1a6] hover:text-[#1d1d1f] dark:hover:text-white transition-colors">
          <ArrowLeft className="w-4 h-4" />
          {zh ? '返回状态页' : 'Back to status'}
        </button>
      </header>

      <section className="flex-1 grid lg:grid-cols-[minmax(0,1fr)_minmax(380px,520px)] items-stretch">
        <div className="hidden lg:flex relative overflow-hidden p-14 xl:p-20 flex-col justify-between bg-[#1d1d1f] text-[#f5f5f7]">
          <div className="absolute inset-0 opacity-50" style={{ backgroundImage: 'radial-gradient(circle at 18% 18%, rgba(48,209,88,.28), transparent 32%), radial-gradient(circle at 82% 70%, rgba(10,132,255,.2), transparent 34%)' }} />
          <div className="relative inline-flex items-center gap-2 text-sm font-medium text-white/70">
            <ShieldCheck className="w-4 h-4" /> FlareStatus Control Plane
          </div>
          <div className="relative max-w-xl">
            <p className="text-[clamp(2.3rem,4.5vw,4.8rem)] leading-[0.98] font-semibold tracking-[-0.055em]">
              {zh ? '只有你的设备，能打开控制台。' : 'Your device is the key to the console.'}
            </p>
            <p className="mt-7 max-w-md text-base leading-7 text-white/55">
              {zh ? 'Passkey 使用设备生物识别或系统解锁，不传输密码，也不依赖第三方身份代理。' : 'Passkeys use your device unlock. No password is transmitted, and no external identity proxy is required.'}
            </p>
          </div>
        </div>

        <div className="flex items-center px-6 py-16 sm:px-12 lg:px-14 bg-[#fbfbfd] dark:bg-[#18181b]">
          <div className="w-full max-w-sm mx-auto">
            <div className="w-12 h-12 rounded-2xl bg-[#1d1d1f] dark:bg-[#f5f5f7] text-white dark:text-[#1d1d1f] flex items-center justify-center shadow-sm">
              {session?.configured ? <Fingerprint className="w-6 h-6" /> : <KeyRound className="w-6 h-6" />}
            </div>
            <h1 className="mt-7 text-3xl font-semibold tracking-[-0.035em]">
              {session?.configured ? (zh ? '使用 Passkey 登录' : 'Sign in with Passkey') : (zh ? '创建管理员 Passkey' : 'Create administrator Passkey')}
            </h1>
            <p className="mt-3 text-sm leading-6 text-[#6e6e73] dark:text-[#a1a1a6]">
              {session?.configured
                ? (zh ? '通过 Touch ID、Face ID、安全密钥或系统 PIN 验证身份。' : 'Verify with Touch ID, Face ID, a security key, or your system PIN.')
                : (zh ? '首次设置需要部署环境中的 ADMIN_SETUP_TOKEN。注册完成后，日常登录只使用 Passkey。' : 'First-time setup requires ADMIN_SETUP_TOKEN from the deployment environment. Afterwards, only your Passkey is needed.')}
            </p>

            {!session?.configured && (
              <label className="block mt-8">
                <span className="block text-xs font-semibold mb-2">ADMIN_SETUP_TOKEN</span>
                <input
                  type="password"
                  autoComplete="one-time-code"
                  value={setupToken}
                  onChange={(event) => setSetupToken(event.target.value)}
                  className="w-full h-11 px-3.5 rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-white/[0.06] outline-none focus:ring-2 focus:ring-[#0071e3]/30 focus:border-[#0071e3] text-sm"
                  placeholder={zh ? '粘贴首次设置令牌' : 'Paste first-time setup token'}
                />
              </label>
            )}

            {error && <p role="alert" className="mt-4 text-sm leading-5 text-[#d70015] dark:text-[#ff6961]">{error}</p>}

            <button
              onClick={runPasskey}
              disabled={busy || session === null || (!session.configured && !setupToken)}
              className="mt-7 w-full h-11 rounded-xl bg-[#0071e3] hover:bg-[#0077ed] disabled:opacity-45 disabled:cursor-not-allowed text-white text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors"
            >
              {busy ? <LoaderCircle className="w-4 h-4 animate-spin" /> : <Fingerprint className="w-4 h-4" />}
              {busy ? (zh ? '等待设备验证…' : 'Waiting for device…') : session?.configured ? (zh ? '使用 Passkey 继续' : 'Continue with Passkey') : (zh ? '创建 Passkey' : 'Create Passkey')}
            </button>

            <p className="mt-5 text-[11px] leading-5 text-[#86868b] dark:text-[#77777c]">
              {zh ? 'Passkey 仅能在当前域名使用。更换管理域名后，需要在新域名重新注册。' : 'Passkeys are scoped to this domain. Register again after changing the administration domain.'}
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
