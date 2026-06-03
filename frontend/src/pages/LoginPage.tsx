import { useState } from 'react';
import type { FormEvent } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { apiClient, getApiErrorMessage } from '../api/client';
import { isDemoMode } from '../demo/mockData';
import { hasAccessToken, setAccessToken } from '../auth/accessToken';

type LocationState = {
  from?: {
    pathname?: string;
  };
};

interface AuthResponse {
  accessToken: string;
  user?: {
    id: string;
    email: string;
  };
}

type MaybeWrappedAuthResponse =
  | AuthResponse
  | {
      data?: AuthResponse;
    };

export function LoginPage() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as LocationState | null;
  const destination = state?.from?.pathname ?? '/';

  if (isDemoMode || hasAccessToken()) {
    return <Navigate to="/" replace />;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setIsSubmitting(true);
    setError('');

    try {
      const response = await apiClient.post<AuthResponse>(
        mode === 'login' ? '/auth/login' : '/auth/register',
        {
          email,
          password,
        },
      );

      const auth = normalizeAuthResponse(response.data);

      if (!auth.accessToken) {
        throw new Error('Login response did not include an access token.');
      }

      setAccessToken(auth.accessToken, auth.user?.email ?? email);
      navigate(destination, { replace: true });
    } catch (authError) {
      setError(getApiErrorMessage(authError));
    } finally {
      setIsSubmitting(false);
    }
  }

  function switchMode(nextMode: 'login' | 'register') {
    if (isSubmitting) {
      return;
    }

    setMode(nextMode);
    setError('');
  }

  function normalizeAuthResponse(
    response: MaybeWrappedAuthResponse,
  ): AuthResponse {
    if (!response || typeof response !== 'object') {
      throw new Error(
        'Auth API returned an unexpected response. Check that VITE_API_URL points to /api.',
      );
    }

    if ('accessToken' in response) {
      return response;
    }

    if (
      response.data &&
      typeof response.data === 'object' &&
      'accessToken' in response.data
    ) {
      return response.data;
    }

    throw new Error(
      'Auth API returned an unexpected response. Check that VITE_API_URL points to /api.',
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0b0e14] px-4 py-10 text-[#e1e2eb]">
      <section className="w-full max-w-md rounded border border-white/10 bg-[#191c22] p-6 shadow-[0_18px_60px_rgba(0,0,0,0.35)]">
        <div className="mb-6">
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#46eedd]">
            CostLens
          </p>
          <h1 className="mt-3 text-2xl font-bold tracking-tight">
            {mode === 'login' ? 'Sign in' : 'Create account'}
          </h1>
          <p className="mt-2 text-sm leading-6 text-[#859491]">
            Each CostLens user manages their own AWS accounts and scan data.
          </p>
        </div>

        <div className="mb-5 grid grid-cols-2 rounded border border-white/10 bg-[#0b0e14] p-1">
          <button
            type="button"
            onClick={() => switchMode('login')}
            className={[
              'rounded px-3 py-2 text-sm font-semibold transition',
              mode === 'login'
                ? 'bg-[#00d1c1] text-[#003732]'
                : 'text-[#859491] hover:text-[#e1e2eb]',
            ].join(' ')}
          >
            Login
          </button>
          <button
            type="button"
            onClick={() => switchMode('register')}
            className={[
              'rounded px-3 py-2 text-sm font-semibold transition',
              mode === 'register'
                ? 'bg-[#00d1c1] text-[#003732]'
                : 'text-[#859491] hover:text-[#e1e2eb]',
            ].join(' ')}
          >
            Register
          </button>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <label className="block">
            <span className="text-sm font-semibold text-[#bacac6]">
              Email
            </span>
            <input
              type="email"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                setError('');
              }}
              className="mt-2 w-full rounded border border-white/10 bg-[#0b0e14] px-3 py-3 text-sm text-[#e1e2eb] outline-none transition placeholder:text-[#596562] focus:border-[#46eedd]"
              placeholder="you@example.com"
              autoComplete="email"
              required
            />
          </label>

          <label className="block">
            <span className="text-sm font-semibold text-[#bacac6]">
              Password
            </span>
            <input
              type="password"
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
                setError('');
              }}
              className="mt-2 w-full rounded border border-white/10 bg-[#0b0e14] px-3 py-3 text-sm text-[#e1e2eb] outline-none transition placeholder:text-[#596562] focus:border-[#46eedd]"
              placeholder="Minimum 8 characters"
              autoComplete={
                mode === 'login' ? 'current-password' : 'new-password'
              }
              minLength={8}
              required
            />
          </label>

          {error ? (
            <div className="rounded border border-[#f97373]/30 bg-[#f97373]/10 px-3 py-2 text-sm text-[#ffb4b4]">
              {error}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded bg-[#00d1c1] px-4 py-3 text-sm font-bold uppercase tracking-[0.12em] text-[#003732] shadow-[0_0_18px_rgba(0,209,193,0.18)] transition hover:bg-[#46eedd]"
          >
            {isSubmitting
              ? 'Working'
              : mode === 'login'
                ? 'Sign in'
                : 'Create account'}
          </button>
        </form>
      </section>
    </main>
  );
}
