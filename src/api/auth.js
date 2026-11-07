// The account endpoints (docs/api.md "Accounts", BE2–BE4.5), one small function each.
// They all go through the shared helper (client.js) and return its result object unchanged;
// screens decide what to show with errors.js. None of these are signed or need X-Business.

import { apiRequest } from './client.js';

// GET /api/reference: countries, currencies, languages, payment methods (no sign-in).
export const getReference = () => apiRequest('/api/reference');

// GET /api/legal/current: the privacy notice and terms, with their version (no sign-in).
export const getLegal = () => apiRequest('/api/legal/current');

// POST /api/auth/signup: creates the business and its owner, and signs in. `country` optional (default GH).
export const signUp = ({ name, phone, email, password, businessName, language, country, termsVersion }) =>
  apiRequest('/api/auth/signup', {
    method: 'POST',
    body: { name, phone, email, password, businessName, language, ...(country ? { country } : {}), acceptTerms: true, termsVersion },
  });

// POST /api/auth/signin: phone number or email, and the password.
export const signIn = ({ login, password, country }) =>
  apiRequest('/api/auth/signin', { method: 'POST', body: { login, password, ...(country ? { country } : {}) } });

// POST /api/auth/signout: ends the session on this phone only.
export const signOut = () => apiRequest('/api/auth/signout', { method: 'POST' });

// GET /api/auth/me: who is signed in (also renews the session cookie).
export const getMe = () => apiRequest('/api/auth/me');

// PATCH /api/auth/me: the person's own app language.
export const setMyLanguage = (language) => apiRequest('/api/auth/me', { method: 'PATCH', body: { language } });

// POST /api/auth/change-password (also how staff replace a temporary password).
export const changePassword = ({ currentPassword, newPassword }) =>
  apiRequest('/api/auth/change-password', { method: 'POST', body: { currentPassword, newPassword } });

// POST /api/auth/accept-terms with the version that was shown.
export const acceptTerms = (version) => apiRequest('/api/auth/accept-terms', { method: 'POST', body: { version } });

// POST /api/auth/confirm-email/send: "Send the link again".
export const sendConfirmLink = () => apiRequest('/api/auth/confirm-email/send', { method: 'POST' });

// POST /api/auth/confirm-email with the token from the email link.
export const confirmEmail = (token) => apiRequest('/api/auth/confirm-email', { method: 'POST', body: { token } });

// POST /api/auth/forgot-password: always answers the same, whether or not the account exists.
export const forgotPassword = ({ login, country }) =>
  apiRequest('/api/auth/forgot-password', { method: 'POST', body: { login, ...(country ? { country } : {}) } });

// POST /api/auth/reset-password with the token from the email link and the new password.
export const resetPassword = ({ token, newPassword }) =>
  apiRequest('/api/auth/reset-password', { method: 'POST', body: { token, newPassword } });

// PATCH /api/auth/me/phone: needs the current password.
export const changePhone = ({ currentPassword, newPhone, country }) =>
  apiRequest('/api/auth/me/phone', { method: 'PATCH', body: { currentPassword, newPhone, ...(country ? { country } : {}) } });

// PATCH /api/auth/me/email: needs the current password; the new email waits for its link.
export const changeEmail = ({ currentPassword, newEmail }) =>
  apiRequest('/api/auth/me/email', { method: 'PATCH', body: { currentPassword, newEmail } });

// POST /api/auth/invitations/:membershipId/accept or …/decline.
export const answerInvitation = (membershipId, accept) =>
  apiRequest(`/api/auth/invitations/${encodeURIComponent(membershipId)}/${accept ? 'accept' : 'decline'}`, { method: 'POST' });
