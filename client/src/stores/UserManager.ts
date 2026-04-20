import { type LoginPayload, type LoginResponse } from '@api/auth/Login.ts';
import { PermFlags, type User } from '@api/user/User';
import { Endpoints } from '@client/Endpoints';
import http from '@client/http/HttpClient';

/** Manages the client user state. */
class UserManager {
    private _authToken: string | null = null;
    private _user: User | null = null;

    private safeGetAuthToken(): string | null {
        return this._authToken;
    }

    private saveToStorage(): void {
        if (this.isLoggedIn) {
            localStorage.setItem('user_data', JSON.stringify(this));
        } else {
            localStorage.removeItem('user_data');
        }
    }

    private loadFromStorage(): void {
        let data = localStorage.getItem('user_data');

        if (data) {
            let self = JSON.parse(data) as UserManager | undefined;

            if (self) {
                this._authToken = self._authToken;
                this._user = self._user;

                return;
            }
        }

        this.clear();
    }

    constructor() {
        http.tokenProvider = this.safeGetAuthToken;

        this.loadFromStorage();
    }

    /** Checks if the client is logged in as a user. */
    get isLoggedIn(): boolean {
        return this._authToken !== null &&
            this._user !== null;
    }

    /** Gets the current user. */
    get currentUser(): User {
        if (!this.isLoggedIn) {
            throw "Attempted to get current user whilst not logged in.";
        }

        return this._user!;
    }

    /** Checks whether or not the current user is a section leader. */
    get isLeadership(): boolean {
        if (!this.isLoggedIn) {
            return false;
        }

        return (this._user!.permFlags & PermFlags.LevelMask) == PermFlags.IsLeadership;
    }

    /** Checks whether or not the current user is a teaching assistant. */
    get isTA(): boolean {
        if (!this.isLoggedIn) {
            return false;
        }

        return (this._user!.permFlags & PermFlags.LevelMask) == PermFlags.IsAssistant;
    }

    /** Checks whether or not the current user is a band director. */
    get isDirector(): boolean {
        if (!this.isLoggedIn) {
            return false;
        }

        return (this._user!.permFlags & PermFlags.LevelMask) == PermFlags.IsDirector;
    }

    /** Clears the local auth cache, essentially logging the client out of the current account. */
    clear(): void {
        this._authToken = null;
        this._user = null;

        this.saveToStorage();
    }

    /** Manually sets the local auth cache. */
    setUser(authToken: string, user: User) {
        this._authToken = authToken;
        this._user = user;

        this.saveToStorage();
    }

    /** Sends a login request to the server with the provided username and password. */
    async loginWithPassword(username: string, password: string): Promise<boolean> {
        let request: LoginPayload = { username, password };
        let response = await http.post<LoginResponse>(Endpoints.AUTH_LOGIN, request);

        if (!response.ok) {
            return false;
        }

        this.setUser(response.body.token, response.body.user);
        return true;
    }
};

export default new UserManager();