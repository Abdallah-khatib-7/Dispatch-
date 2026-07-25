import { useState, type FormEvent } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/auth/AuthContext';
import { googleConnectUrl } from '@/lib/api/auth';
import { getStats } from '@/lib/api/applications';
import { ApiError } from '@/lib/api/client';
import { Button } from '@/components/ui/Button';

interface LocationState {
  from?: string;
}

export const AuthPage = () => {
  const { isConnected, connect, disconnect } = useAuth();
  const location = useLocation();
  const [startedConnecting, setStartedConnecting] = useState(false);
  const [pastedToken, setPastedToken] = useState('');
  const [status, setStatus] = useState<'idle' | 'checking' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  if (isConnected) {
    const from = (location.state as LocationState | null)?.from;
    return <Navigate to={from ?? '/app'} replace />;
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const token = pastedToken.trim();
    if (!token) return;
    setStatus('checking');
    setErrorMessage('');
    try {
      // Confirm the pasted value is actually a live bearer token before
      // trusting it -- calls a real, cheap, already-authenticated endpoint.
      connect(token);
      await getStats();
      setStatus('idle');
    } catch (err) {
      disconnect();
      const message =
        err instanceof ApiError
          ? 'That token was rejected by the backend. Copy the apiToken value exactly, with no extra spaces.'
          : 'Could not reach the backend to verify the token. Is it running on the expected port?';
      setErrorMessage(message);
      setStatus('error');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-ink px-4 py-16">
      <div className="w-full max-w-md">
        <div className="mb-8 flex items-center justify-center gap-2">
          <span className="h-4 w-px bg-teal" aria-hidden="true" />
          <span className="font-display text-sm font-semibold tracking-[0.2em] text-white">
            DISPATCH
          </span>
        </div>

        <div className="rounded-xl border border-ink-line bg-ink-raised p-7">
          <h1 className="font-display text-xl font-semibold text-white">
            Connect your Google account
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-mist">
            Dispatch is single-account: whichever Gmail inbox you connect here is the one it reads
            from. There is no separate username or password to create — Google is the login.
          </p>

          <a
            href={googleConnectUrl()}
            target="_blank"
            rel="noreferrer"
            onClick={() => setStartedConnecting(true)}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-md border border-ink-line bg-paper px-4 py-2.5 font-body text-sm font-medium text-ink-text transition-colors hover:bg-paper-raised"
          >
            <GoogleMark />
            Continue with Google
          </a>
          <p className="mt-2 text-center font-data text-xs text-steel">
            Opens in a new tab · requests read-only Gmail access
          </p>

          <div className="mt-8 border-t border-ink-line pt-6">
            <h2 className="font-body text-sm font-medium text-white">
              {startedConnecting ? 'Finish connecting' : 'Already approved access?'}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-mist">
              After you approve access, Google sends you to a page showing raw JSON with an{' '}
              <code className="font-data text-xs text-amber">apiToken</code> field. Copy that
              value and paste it below.
            </p>
            <form onSubmit={handleSubmit} className="mt-4">
              <label htmlFor="token" className="sr-only">
                API token
              </label>
              <textarea
                id="token"
                value={pastedToken}
                onChange={(e) => setPastedToken(e.target.value)}
                placeholder="eyJhbGciOi..."
                rows={3}
                className="w-full resize-none rounded-md border border-ink-line bg-ink px-3 py-2 font-data text-xs text-mist placeholder:text-steel focus:border-teal"
              />
              {status === 'error' && (
                <p className="mt-2 text-sm text-rust" role="alert">
                  {errorMessage}
                </p>
              )}
              <Button
                type="submit"
                variant="primary"
                className="mt-3 w-full"
                disabled={status === 'checking' || pastedToken.trim() === ''}
              >
                {status === 'checking' ? 'Checking token…' : 'Finish connecting'}
              </Button>
            </form>
          </div>
        </div>

        <details className="mt-4 rounded-lg border border-ink-line px-4 py-3">
          <summary className="cursor-pointer font-body text-xs text-steel">
            Why do I have to paste something?
          </summary>
          <p className="mt-2 text-xs leading-relaxed text-steel">
            The OAuth callback is a backend endpoint, not a page in this app — it responds with the
            token as plain JSON rather than redirecting back here with it attached. Pasting it once
            is the honest bridge between the two; after that it's stored in this browser and reused
            automatically.
          </p>
        </details>
      </div>
    </div>
  );
};

const GoogleMark = () => (
  <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden="true">
    <path
      fill="#EA4335"
      d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
    />
    <path
      fill="#4285F4"
      d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
    />
    <path
      fill="#FBBC05"
      d="M10.53 28.59A14.5 14.5 0 0 1 9.77 24c0-1.59.27-3.13.76-4.59l-7.98-6.19A24 24 0 0 0 0 24c0 3.87.92 7.53 2.56 10.78z"
    />
    <path
      fill="#34A853"
      d="M24 48c6.48 0 11.92-2.14 15.89-5.82l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
    />
  </svg>
);
