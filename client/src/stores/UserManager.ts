import { type LoginPayload, type LoginResponse } from '@api/auth/Login.ts';
import type { User } from '@api/user/User';
import { Endpoints } from '@client/Endpoints';
import http from '@client/http/HttpClient';

class UserManager {
    private _authToken: string | null = null;
    private _username: string | null = null;
    private _name: string | null = null;

    constructor() {
        http.tokenProvider = this.safeGetAuthToken;

        this.loadFromStorage();
    }

    private safeGetAuthToken(): string | null {
        return this._authToken;
    }

    get isLoggedIn(): boolean {
        return this._authToken !== null &&
            this._username !== null &&
            this._name !== null;
    }

    get authToken(): string {
        if (this._authToken === null) {
            throw "Requested authentication token when user wasn't logged in.";
        }

        return this._authToken;
    }

    get username(): string {
        if (this._username === null) {
            throw "Requested username when user wasn't logged in.";
        }

        return this._username;
    }

    get name(): string {
        if (this._name === null) {
            throw "Requested name when user wasn't logged in.";
        }

        return this._name;
    }

    clear(): void {
        this._authToken = null;
        this._username = null;
        this._name = null;

        this.saveToStorage();
    }

    saveToStorage(): void {
        if (this.isLoggedIn) {
            localStorage.setItem('user_data', JSON.stringify(this));
        } else {
            localStorage.removeItem('user_data');
        }
    }

    loadFromStorage(): void {
        let data = localStorage.getItem('user_data');

        if (data) {
            let self = JSON.parse(data) as UserManager | undefined;

            if (self) {
                this._authToken = self._authToken;
                this._username = self._username;
                this._name = self._name;

                return;
            }
        }

        this.clear();
    }

    private setUser(authToken: string, user: User) {
        this._authToken = authToken;
        this._username = user.username;
        this._name = user.firstName;

        this.saveToStorage();
    }

    setDevUser(authToken: string, username: string, name: string) {
        this._authToken = authToken;
        this._username = username;
        this._name = name;

        this.saveToStorage();

    }

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