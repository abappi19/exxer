import * as SecureStore from 'expo-secure-store';

const ACCESS_TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';

/**
 * JWT authentication scaffold.
 * For this demo starter, auth is a no-op — all API routes are public.
 * Swap in real token logic when connecting to a production backend.
 */
export class AuthManager {
    async getToken(): Promise<string | null> {
        return SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
    }

    async setToken(token: string): Promise<void> {
        await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, token);
    }

    async getRefreshToken(): Promise<string | null> {
        return SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
    }

    async setRefreshToken(token: string): Promise<void> {
        await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, token);
    }

    /** Attempt to refresh the access token. Returns the new token or null. */
    async refreshToken(baseUrl: string): Promise<string | null> {
        const refresh = await this.getRefreshToken();
        if (!refresh) return null;

        try {
            const res = await fetch(`${baseUrl}/auth/refresh`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refresh_token: refresh }),
            });

            if (!res.ok) return null;
            const { access_token } = await res.json();
            await this.setToken(access_token);
            return access_token;
        } catch {
            return null;
        }
    }
}

export const authManager = new AuthManager();
