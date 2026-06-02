import { useState } from 'react';
import type { FormEvent } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { isDemoMode } from '../demo/mockData';
import { hasAccessToken, setAccessToken } from '../auth/accessToken';

type LocationState = {
  from?: {
    pathname?: string;
  };
};

export function LoginPage() {
  const [token, setToken] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as LocationState | null;
  const destination = state?.from?.pathname ?? '/';

  if (isDemoMode || hasAccessToken()) {
    return <Navigate to="/" replace />;
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedToken = token.trim();

    if (!trimmedToken) {
      setError('Enter the CostLens access token.');
      return;
    }

    setAccessToken(trimmedToken);
    navigate(destination, { replace: true });
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0b0e14] px-4 py-10 text-[#e1e2eb]">
      <section className="w-full max-w-md rounded border border-white/10 bg-[#191c22] p-6 shadow-[0_18px_60px_rgba(0,0,0,0.35)]">
        <div className="mb-6">
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#46eedd]">
            CostLens
          </p>
          <h1 className="mt-3 text-2xl font-bold tracking-tight">
            Unlock dashboard
          </h1>
          <p className="mt-2 text-sm leading-6 text-[#859491]">
            This deployment is protected with a shared access token.
          </p>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <label className="block">
            <span className="text-sm font-semibold text-[#bacac6]">
              Access token
            </span>
            <input
              type="password"
              value={token}
              onChange={(event) => {
                setToken(event.target.value);
                setError('');
              }}
              className="mt-2 w-full rounded border border-white/10 bg-[#0b0e14] px-3 py-3 text-sm text-[#e1e2eb] outline-none transition placeholder:text-[#596562] focus:border-[#46eedd]"
              placeholder="Enter token"
              autoComplete="current-password"
            />
          </label>

          {error ? (
            <div className="rounded border border-[#f97373]/30 bg-[#f97373]/10 px-3 py-2 text-sm text-[#ffb4b4]">
              {error}
            </div>
          ) : null}

          <button
            type="submit"
            className="w-full rounded bg-[#00d1c1] px-4 py-3 text-sm font-bold uppercase tracking-[0.12em] text-[#003732] shadow-[0_0_18px_rgba(0,209,193,0.18)] transition hover:bg-[#46eedd]"
          >
            Continue
          </button>
        </form>
      </section>
    </main>
  );
}
