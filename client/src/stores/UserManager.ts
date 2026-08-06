import { type LoginPayload, type LoginResponse, type RegisterPayload } from '@api/auth/Login.ts';
import { PermFlags, type User } from '@api/user/User';
import TestPermissionOverride, { GlobalTier } from '@client/stores/TestPermissionOverride';
import type { StationRole } from '@api/station/StationRole';
import { Endpoints } from '@client/Endpoints';
import http from '@client/http/HttpClient';

/** Manages the client user state. */
class UserManager {
    private _authToken: string | null = null;
    private _user: User | null = null;
    private handlingSessionExpiry = false;

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

    private updatePermissionFromUser(user: User | null): void {
        if (!user) {
            TestPermissionOverride.tier = GlobalTier.BandMember;
            return;
        }

        switch (user.permFlags & PermFlags.LevelMask) {
            case PermFlags.IsDirector:
                TestPermissionOverride.tier = GlobalTier.Director;
                break;
            case PermFlags.IsLeadership:
            case PermFlags.IsAssistant:
                TestPermissionOverride.tier = GlobalTier.Elevated;
                break;
            default:
                TestPermissionOverride.tier = GlobalTier.BandMember;
                break;
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
                this.updatePermissionFromUser(this._user);
                return;
            }
        }

        this.clear();
    }

    constructor() {
        http.tokenProvider = this.safeGetAuthToken;
        http.onUnauthorized = this.handleSessionExpired;
        this.loadFromStorage();
    }

    /** Clears the stale session and sends the user back to login after their token expires/becomes invalid. */
    private handleSessionExpired = (): void => {
        if (this.handlingSessionExpiry || !this.isLoggedIn) {
            return;
        }
        this.handlingSessionExpiry = true;
        this.clear();
        window.location.href = '/login';
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

    /** Checks whether or not the current user has elevated status (Leadership, TA, or equivalent). */
    get isElevated(): boolean {
        if (!this.isLoggedIn) {
            return false;
        }

        const level = this._user!.permFlags & PermFlags.LevelMask;
        return level === PermFlags.IsLeadership || level === PermFlags.IsAssistant;
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
        this.updatePermissionFromUser(user);
        this.saveToStorage();
    }

    async register(payload: RegisterPayload): Promise<{ success: boolean; message?: string }> {
        const response = await http.post<LoginResponse>(Endpoints.auth.register, payload);
        if (!response.ok) {
            const body = response.body as unknown as { error?: string } | undefined;
            return { success: false, message: body?.error };
        }
        this.setUser(response.body.token, response.body.user);
        return { success: true };
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

    async getNotifications(): Promise<Array<{ id: number; title: string; message: string; senderName: string; createdAt: string; category: 'general' | 'queue' | 'broadcast' }>> {
        const response = await http.get(Endpoints.notifications.list);
        if (!response.ok || !response.body) {
            return [];
        }
        return response.body as Array<{ id: number; title: string; message: string; senderName: string; createdAt: string; category: 'general' | 'queue' | 'broadcast' }>;
    }

    async createNotification(title: string, message: string): Promise<boolean> {
        const response = await http.post(Endpoints.notifications.create, {
            title,
            message
        });
        return response.ok;
    }

    async getStationQueue(stationId: number): Promise<Array<{ id: number; stationId: number; userId: number; name: string; position: number; requestedAt: string; status: string }>> {
        const response = await http.get(Endpoints.STATION_QUEUE(stationId));
        if (!response.ok || !response.body) {
            return [];
        }
        return response.body as Array<{ id: number; stationId: number; userId: number; name: string; position: number; requestedAt: string; status: string }>;
    }

    async joinStationQueue(stationId: number): Promise<{ success: boolean; message?: string }> {
        const response = await http.post(Endpoints.STATION_QUEUE(stationId), {});
        const body = response.body as any;
        return {
            success: response.ok,
            message: body?.message ?? (response.ok ? 'Joined queue.' : response.statusText)
        };
    }

    async leaveStationQueue(stationId: number): Promise<{ success: boolean; message?: string }> {
        const response = await http.delete(Endpoints.STATION_QUEUE(stationId));
        const body = response.body as any;
        return {
            success: response.ok,
            message: body?.message ?? (response.ok ? 'Left queue.' : response.statusText)
        };
    }

    async takeNextStationQueue(stationId: number): Promise<{ success: boolean; message?: string; removedEntry?: { id: number; stationId: number; userId: number; requestedAt: string; status: string } }> {
        const response = await http.post(Endpoints.STATION_QUEUE_NEXT(stationId), {});
        const body = response.body as any;
        return {
            success: response.ok,
            message: body?.error ?? body?.message ?? (response.ok ? 'Pulled next student.' : response.statusText),
            removedEntry: response.ok ? body?.removedEntry : undefined
        };
    }

    async getOverview(): Promise<any> {
        const response = await http.get(Endpoints.admin.overview);
        if (!response.ok || !response.body) {
            return null;
        }
        return response.body;
    }

    async getStation(stationId: number): Promise<{ id: number; name: string; criteria: string[]; feedbackItems: string[]; role: StationRole; instructorNotes?: string[] } | null> {
        const response = await http.get<{ id: number; name: string; criteria: string[]; feedbackItems: string[]; role: StationRole; instructorNotes?: string[] }>(`/stations/${stationId}`);
        if (!response.ok || !response.body) return null;
        return response.body;
    }

    async submitEvaluation(
        userId: number,
        stationId: number,
        score?: number,
        comments?: string,
        criteria?: string[],
        feedbackItems?: string[],
        overallStatus?: string
    ): Promise<boolean> {
        const response = await http.post(Endpoints.evaluations.submit, {
            userId,
            stationId,
            score,
            comments,
            criteria,
            feedbackItems,
            overallStatus
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

    async setStationRole(userId: number, stationId: number, role: StationRole): Promise<boolean> {
        const response = await http.put(Endpoints.users.stationRole(userId, stationId), { role });
        return response.ok;
    }

    async getUserStationRoles(userId: number): Promise<Array<{ stationId: number; stationName: string; role: StationRole }>> {
        const response = await http.get(Endpoints.users.stationRoles(userId));
        if (!response.ok || !response.body) return [];
        return response.body as Array<{ stationId: number; stationName: string; role: StationRole }>;
    }

    // Station management
    async getStations(): Promise<Array<{ id: number; name: string; criteria: string[]; feedbackItems: string[]; role: StationRole; instructorNotes?: string[] }> | null> {
        const response = await http.get('/stations');
        if (!response.ok || !response.body) {
            return null;
        }
        return response.body as Array<{ id: number; name: string; criteria: string[]; feedbackItems: string[]; role: StationRole; instructorNotes?: string[] }>;
    }

    async createStation(name: string, criteria: string[], feedbackItems?: string[], instructorNotes?: string[]): Promise<boolean> {
        const response = await http.post('/stations', { name, criteria, feedbackItems: feedbackItems ?? [], instructorNotes: instructorNotes ?? [] });
        return response.ok;
    }

    async updateStation(id: number, name?: string, criteria?: string[], feedbackItems?: string[], instructorNotes?: string[]): Promise<boolean> {
        const updates: any = {};
        if (name !== undefined) updates.name = name;
        if (criteria !== undefined) updates.criteria = criteria;
        if (feedbackItems !== undefined) updates.feedbackItems = feedbackItems;
        if (instructorNotes !== undefined) updates.instructorNotes = instructorNotes;
        const response = await http.put(`/stations/${id}`, updates);
        return response.ok;
    }

    async deleteStation(id: number): Promise<boolean> {
        const response = await http.delete(`/stations/${id}`);
        return response.ok;
    }
};

export default new UserManager();