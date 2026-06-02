const ACCESS_TOKEN_KEY = 'costlens_access_token';
const USER_EMAIL_KEY = 'costlens_user_email';

export function getAccessToken() {
  return localStorage.getItem(ACCESS_TOKEN_KEY) ?? '';
}

export function setAccessToken(token: string, email?: string) {
  localStorage.setItem(ACCESS_TOKEN_KEY, token);

  if (email) {
    localStorage.setItem(USER_EMAIL_KEY, email);
  }
}

export function clearAccessToken() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(USER_EMAIL_KEY);
}

export function hasAccessToken() {
  return getAccessToken().length > 0;
}

export function getUserEmail() {
  return localStorage.getItem(USER_EMAIL_KEY) ?? '';
}
