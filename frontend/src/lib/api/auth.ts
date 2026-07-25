import { API_BASE_URL } from './client';

// Full-page/new-tab navigation only -- this is a redirect into Google's
// consent screen, never a fetch. The backend callback it lands on
// (GOOGLE_REDIRECT_URI) responds with a raw JSON page, not a redirect back
// into this app; see AuthPage for how the pasted-token step bridges that.
export const googleConnectUrl = (): string => `${API_BASE_URL}/auth/google`;
