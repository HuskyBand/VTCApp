import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Hono } from 'hono';
import { cors } from 'hono/cors';

import configureRoutes from './configureRoutes';
import { Database } from './database';
import { PermFlags } from '@api/user/User';

type RegisteredUser = {
    id: number;
    username: string;
    email: string;
    firstName: string;
    lastName: string;
    instrument: string;
    permFlags: number;
};

type RegisterResponse = {
    token: string;
    user: RegisteredUser;
};

let tempDir = '';
let dbPath = '';
let db: Database;
let app: Hono;

beforeEach(async () => {
    tempDir = mkdtempSync(join(tmpdir(), 'vtcapp-server-test-'));
    dbPath = join(tempDir, 'test.db');
    db = new Database(dbPath);
    await db.ready();

    const routes = new Hono();
    routes.use(cors());
    configureRoutes(routes, db);

    app = new Hono();
    app.route('/', routes);
    app.route('/v1', routes);
});

afterEach(async () => {
    await db.ready();
    await db.close();
    rmSync(tempDir, { recursive: true, force: true });
});

async function registerAndToken(username: string, isDirector = false): Promise<RegisterResponse> {
    const response = await app.request('/v1/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            username,
            password: 'password123',
            email: `${username}@example.com`,
            firstName: 'Test',
            lastName: username,
            instrument: 'Trumpet',
        }),
    });

    expect(response.status).toBe(200);
    const body = (await response.json()) as RegisterResponse;

    if (isDirector) {
        await db.updateUser(body.user.id, { permFlags: PermFlags.IsDirector });
    }

    return body;
}

describe('configureRoutes', () => {
    it('returns health status', async () => {
        const response = await app.request('/v1/_health');
        expect(response.status).toBe(200);
        expect(await response.text()).toContain('in order');
    });

    it('enforces director permission for station creation', async () => {
        const member = await registerAndToken('member-user');
        const director = await registerAndToken('director-user', true);

        const memberCreate = await app.request('/v1/stations', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${member.token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ name: 'Station 1', criteria: ['Posture'] }),
        });
        expect(memberCreate.status).toBe(403);

        const directorCreate = await app.request('/v1/stations', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${director.token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ name: 'Station 1', criteria: ['Posture'], feedbackItems: ['Tone'] }),
        });
        expect(directorCreate.status).toBe(200);

        const stationsResponse = await app.request('/v1/stations', {
            headers: { Authorization: `Bearer ${member.token}` },
        });
        expect(stationsResponse.status).toBe(200);
        const stations = (await stationsResponse.json()) as Array<{ id: number; name: string }>;
        expect(stations).toHaveLength(1);
        expect(stations[0].name).toBe('Station 1');
    });

    it('allows joining and viewing a station queue', async () => {
        const director = await registerAndToken('director-queue', true);
        const student = await registerAndToken('student-queue');

        await app.request('/v1/stations', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${director.token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ name: 'Queue Station', criteria: ['Rhythm'] }),
        });

        const join = await app.request('/v1/stations/1/queue', {
            method: 'POST',
            headers: { Authorization: `Bearer ${student.token}` },
        });
        expect(join.status).toBe(200);

        const queueResponse = await app.request('/v1/stations/1/queue', {
            headers: { Authorization: `Bearer ${student.token}` },
        });
        expect(queueResponse.status).toBe(200);

        const queue = (await queueResponse.json()) as Array<{ userId: number; position: number }>;
        expect(queue).toHaveLength(1);
        expect(queue[0].userId).toBe(student.user.id);
        expect(queue[0].position).toBe(1);
    });

    it('blocks non-eligible evaluation submit unless override header is set', async () => {
        const evaluator = await registerAndToken('evaluator-user');
        const target = await registerAndToken('target-user');

        const blocked = await app.request('/v1/evaluations', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${evaluator.token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                userId: target.user.id,
                stationId: 1,
                score: 60,
                comments: 'Good attempt',
                criteria: ['developing'],
                feedbackItems: ['Timing'],
                overallStatus: 'developing',
            }),
        });
        expect(blocked.status).toBe(403);

        const allowed = await app.request('/v1/evaluations', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${evaluator.token}`,
                'Content-Type': 'application/json',
                'X-Test-Permission': 'evaluator',
            },
            body: JSON.stringify({
                userId: target.user.id,
                stationId: 1,
                score: 80,
                comments: 'Great progress',
                criteria: ['mastery'],
                feedbackItems: [],
                overallStatus: 'mastery',
            }),
        });
        expect(allowed.status).toBe(200);

        const evaluationBody = (await allowed.json()) as { id: number };
        expect(evaluationBody.id).toBeTypeOf('number');
    });

    it('returns current user via auth/me and updates profile without allowing permission escalation', async () => {
        const member = await registerAndToken('profile-user');

        const meResponse = await app.request('/v1/auth/me', {
            headers: { Authorization: `Bearer ${member.token}` },
        });
        expect(meResponse.status).toBe(200);
        const me = (await meResponse.json()) as RegisteredUser;
        expect(me.username).toBe('profile-user');

        const updateResponse = await app.request('/v1/auth/profile', {
            method: 'PUT',
            headers: {
                Authorization: `Bearer ${member.token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                firstName: 'Updated',
                permFlags: PermFlags.IsDirector,
            }),
        });
        expect(updateResponse.status).toBe(200);
        const updated = (await updateResponse.json()) as RegisteredUser;
        expect(updated.firstName).toBe('Updated');
        expect(updated.permFlags).toBe(PermFlags.IsBandMember);
    });

    it('allows only directors to create broadcasts', async () => {
        const member = await registerAndToken('member-broadcast');
        const director = await registerAndToken('director-broadcast', true);

        const memberPost = await app.request('/v1/notifications', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${member.token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ title: 'Nope', message: 'Should fail' }),
        });
        expect(memberPost.status).toBe(403);

        const directorPost = await app.request('/v1/notifications', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${director.token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ title: 'Reminder', message: 'Wear uniforms' }),
        });
        expect(directorPost.status).toBe(200);

        const memberList = await app.request('/v1/notifications', {
            headers: { Authorization: `Bearer ${member.token}` },
        });
        expect(memberList.status).toBe(200);
        const notifications = (await memberList.json()) as Array<{ title: string }>;
        expect(notifications.some((n) => n.title === 'Reminder')).toBe(true);
    });

    it('permits stations/feedback only for elevated roles or override', async () => {
        const director = await registerAndToken('director-feedback', true);
        const member = await registerAndToken('member-feedback');

        await app.request('/v1/stations', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${director.token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                name: 'Feedback Station',
                criteria: ['Tone'],
                feedbackItems: ['Rhythm'],
            }),
        });

        const memberDenied = await app.request('/v1/stations/feedback', {
            headers: { Authorization: `Bearer ${member.token}` },
        });
        expect(memberDenied.status).toBe(403);

        const memberOverride = await app.request('/v1/stations/feedback', {
            headers: {
                Authorization: `Bearer ${member.token}`,
                'X-Test-Permission': 'instructor',
            },
        });
        expect(memberOverride.status).toBe(200);
        const stations = (await memberOverride.json()) as Array<{ name: string; feedbackItems: string[] }>;
        expect(stations.some((s) => s.name === 'Feedback Station')).toBe(true);
        expect(stations[0].feedbackItems).toBeDefined();
    });

    it('pulls next queue member and removes them from queue', async () => {
        const director = await registerAndToken('director-pull', true);
        const student = await registerAndToken('student-pull');

        await app.request('/v1/stations', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${director.token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ name: 'Queue Pull Station', criteria: ['Articulation'] }),
        });

        await app.request('/v1/stations/1/queue', {
            method: 'POST',
            headers: { Authorization: `Bearer ${student.token}` },
        });

        const pullResponse = await app.request('/v1/stations/1/queue/next', {
            method: 'POST',
            headers: { Authorization: `Bearer ${director.token}` },
        });
        expect(pullResponse.status).toBe(200);
        const pulled = (await pullResponse.json()) as { removedEntry: { userId: number } };
        expect(pulled.removedEntry.userId).toBe(student.user.id);

        const queueResponse = await app.request('/v1/stations/1/queue', {
            headers: { Authorization: `Bearer ${student.token}` },
        });
        const queue = (await queueResponse.json()) as Array<{ userId: number }>;
        expect(queue).toHaveLength(0);
    });
});
