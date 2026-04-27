import { type LoginPayload, type LoginResponse, type RegisterPayload } from '@api/auth/Login.ts';
import { PermFlags, type User } from '@api/user/User';
import { Endpoints } from '@client/Endpoints';
import http from '@client/http/HttpClient';

/** Manages the client user state. */
class UserManager {
    private _authToken: string | null = null;
    private _user: User | null = null;

    private safeGetAuthToken = (): string | null => {
        return this._authToken;
    }

    private saveToStorage(): void {
        if (this.isLoggedIn) {
            localStorage.setItem('user_data', JSON.stringify({
                _authToken: this._authToken,
                _user: this._user
            }));
        } else {
            localStorage.removeItem('user_data');
        }
    }

    private loadFromStorage(): void {
        let data = localStorage.getItem('user_data');

        if (data) {
            let parsed = JSON.parse(data) as {
                _authToken: string | null;
                _user: User | null;
            } | undefined;

            if (parsed) {
                this._authToken = parsed._authToken;
                this._user = parsed._user;
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
        return this._authToken !== null && this._user !== null;
    }

    /** Gets the current user. */
    get currentUser(): User {
        if (!this.isLoggedIn) {
            throw 'Attempted to get current user whilst not logged in.';
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

    async register(payload: RegisterPayload): Promise<boolean> {
        const response = await http.post<LoginResponse>(Endpoints.auth.register, payload);
        if (!response.ok) {
            return false;
        }
        this.setUser(response.body.token, response.body.user);
        return true;
    }

    async loginWithPassword(username: string, password: string): Promise<boolean> {
        let request: LoginPayload = { username, password };
        let response = await http.post<LoginResponse>(Endpoints.auth.login, request);

        if (!response.ok) {
            return false;
        }

        this.setUser(response.body.token, response.body.user);
        return true;
    }

    async updateProfile(updates: Partial<User>): Promise<boolean> {
        if (!this.isLoggedIn) {
            return false;
        }
        const response = await http.put<User>(Endpoints.auth.profile, updates);
        if (!response.ok || !response.body) {
            return false;
        }
        this.setUser(this._authToken!, response.body);
        return true;
    }

    async getAllUsers(): Promise<User[]> {
        const response = await http.get<User[]>(Endpoints.users.list);
        if (!response.ok || !response.body) {
            return [];
        }
        return response.body;
    }

    async submitEvaluation(userId: number, stationId: number, score?: number, comments?: string): Promise<boolean> {
        const response = await http.post(Endpoints.evaluations.submit, {
            userId,
            stationId,
            score,
            comments
        });
        return response.ok;
    }

    async getEvaluationsForUser(userId: number): Promise<any[]> {
        const response = await http.get(Endpoints.evaluations.list(userId));
        if (!response.ok || !response.body) {
            return [];
        }
        return response.body as any[];
    }

    async updateUserPermissions(userId: number, permFlags: number): Promise<boolean> {
        const response = await http.put(Endpoints.users.permissions(userId), { permFlags });
        return response.ok;
    }
};

export default new UserManager();