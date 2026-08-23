import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Hono } from 'hono';
import { cors } from 'hono/cors';

import configureRoutes from './configureRoutes';
import { Database } from './database';
import { PermFlags } from '@api/user/User';

type RegisterBody = { token: string; user: { id: number } };

let tempDir = '';
let dbPath = '';
let db: Database;
let app: Hono;

beforeEach(async () => {
    tempDir = mkdtempSync(join(tmpdir(), 'vtcapp-smoke-test-'));
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

async function register(username: string): Promise<RegisterBody> {
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
    return (await response.json()) as RegisterBody;
}

describe('smoke flow', () => {
    it('supports register -> queue -> pull -> evaluate -> fetch results', async () => {
        const director = await register('director-smoke');
        await db.updateUser(director.user.id, { permFlags: PermFlags.IsDirector });

        const student = await register('student-smoke');

        const createStation = await app.request('/v1/stations', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${director.token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ name: 'Smoke Station', criteria: ['Posture'], feedbackItems: ['Tone'] }),
        });
        expect(createStation.status).toBe(200);

        const joinQueue = await app.request('/v1/stations/1/queue', {
            method: 'POST',
            headers: { Authorization: `Bearer ${student.token}` },
        });
        expect(joinQueue.status).toBe(200);

        const pullNext = await app.request('/v1/stations/1/queue/next', {
            method: 'POST',
            headers: { Authorization: `Bearer ${director.token}` },
        });
        expect(pullNext.status).toBe(200);

        const submitEval = await app.request('/v1/evaluations', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${director.token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                userId: student.user.id,
                stationId: 1,
                score: 84,
                comments: 'Great progress',
                criteria: ['mastery'],
                feedbackItems: ['Keep air support'],
                overallStatus: 'mastery',
            }),
        });
        expect(submitEval.status).toBe(200);

        const evalsResponse = await app.request(`/v1/evaluations/${student.user.id}`, {
            headers: { Authorization: `Bearer ${student.token}` },
        });
        expect(evalsResponse.status).toBe(200);
        const evals = (await evalsResponse.json()) as Array<{ stationId: number; score: number }>;
        expect(evals.length).toBeGreaterThan(0);
        expect(evals[0].stationId).toBe(1);
        expect(evals[0].score).toBe(84);

        const notifResponse = await app.request('/v1/notifications', {
            headers: { Authorization: `Bearer ${student.token}` },
        });
        expect(notifResponse.status).toBe(200);
        const notifications = (await notifResponse.json()) as Array<{ title: string; category: string }>;
        expect(notifications.some((n) => n.title.includes('Evaluation Results'))).toBe(true);
        expect(notifications.some((n) => n.category === 'queue')).toBe(true);
    });
});
