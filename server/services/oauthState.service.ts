import crypto from "crypto";

interface OAuthStateData {
    userId: string;
    provider: string;
    codeVerifier: string;
    createdAt?: number;
}

class OAuthStateService {
    private states = new Map<string, OAuthStateData & { createdAt: number }>();
    private readonly TTL = 10 * 60 * 1000; // 10 minutes

    constructor() {
        // Periodic cleanup
        // Use unref() so this timer doesn't prevent the process from exiting if it's the only thing left
        const interval = setInterval(() => this.cleanup(), 60 * 1000);
        if (interval.unref) {
            interval.unref();
        }
    }

    generateState(): string {
        return crypto.randomBytes(32).toString("hex");
    }

    generateCodeVerifier(): string {
        return crypto.randomBytes(32).toString("base64url");
    }

    generateCodeChallenge(verifier: string): string {
        return crypto
            .createHash("sha256")
            .update(verifier)
            .digest("base64url");
    }

    set(state: string, data: OAuthStateData): void {
        this.states.set(state, {
            ...data,
            createdAt: Date.now(),
        });
    }

    consume(state: string): (OAuthStateData & { createdAt: number }) | null {
        const data = this.states.get(state);
        if (!data) return null;

        // Remove immediately (one-time use)
        this.states.delete(state);

        // Check expiration
        if (Date.now() - data.createdAt > this.TTL) {
            return null;
        }

        return data;
    }

    getStats() {
        return {
            activeStates: this.states.size,
        };
    }

    private cleanup() {
        const now = Date.now();
        this.states.forEach((data, state) => {
            if (now - data.createdAt > this.TTL) {
                this.states.delete(state);
            }
        });
    }
}

export const oauthStateService = new OAuthStateService();
