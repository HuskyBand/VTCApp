# Permissions Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split the conflated global-tier/per-station permission model into two independent axes (global `PermFlags` tier + computed-or-overridden per-station role), retire the unused `Instructor` path in `UserPermission`, and let a director grant per-station Instructor/Evaluator status manually.

**Architecture:** Server computes a per-station `StationRole` (`'participant' | 'instructor' | 'evaluator'`) for every (user, station) pair — global tier short-circuit, then a director-set override row, then the existing score-based `canTeach`/`canEvaluate` math. The client stops computing eligibility itself and just renders whatever `role` the server returns alongside station data. `UserPermission`/`PermissionManager` are deleted; the global tier lives on `PermFlags` + `UserManager` helpers, and the QA test-permission override shrinks to global-tier-only.

**Tech Stack:** TypeScript, Hono (server), React 19 + Vite (client), sqlite3 (server/src/database.ts), shared types in `packages/api` (import alias `@api`).

## Global Constraints

- No test framework exists in this repo (no Jest/Vitest/Mocha in either `package.json`, no `*.test.ts` files anywhere). Do not add one. Verification in this plan uses (a) one `npx tsx`-runnable assert-based self-check for the one piece of pure, non-trivial logic (score → role), and (b) manual curl / dev-server click-through steps for everything else that talks to the DB or renders UI.
- `PermFlags` storage values do not change: `IsBandMember=0`, `IsLeadership=1`, `IsAssistant=2`, `IsDirector=3`, `LevelMask=3` (`packages/api/src/user/User.ts`). No DB migration needed for `users.permFlags`.
- New DB columns/tables follow the existing migration pattern in `server/src/database.ts`: `PRAGMA table_info(...)` check + `ALTER TABLE ... ADD COLUMN` inside `initTables()`, run on every server start.
- Last-station cutoff stays the existing magic number `6` (matches current `stationId >= 6` checks in `configureRoutes.ts`) — not made configurable, out of scope.
- Only `role === 'evaluator'` may submit an evaluation or pull from a station queue (`canSubmitEvaluation`). `'instructor'` is view-only. This is an intentional behavior change from today (today `canTeach` also allowed submission) — approved in the design spec.
- `X-Test-Permission` QA override keeps only `band_member` / `elevated` / `dr_jahlas`. `evaluator` / `instructor` are removed from it since those are now per-station, not global.
- Run `npx tsc -b` (or `npm run build` in `client/`, `tsc` in `server/`) after each task touching TypeScript to catch type errors before moving on — there's no test suite to catch them otherwise.

---

## File Structure

**New files:**
- `packages/api/src/station/StationRole.ts` — shared `StationRole` type + pure `computeStationRoleFromScores()` (no DB dependency, has the one self-check).
- `server/src/stationRole.ts` — `resolveStationRole(db, user, stationId)`: global tier short-circuit → director override → `computeStationRoleFromScores`.
- `client/src/stores/TestPermissionOverride.ts` — replaces the global-tier-only slice of `PermissionManager`'s responsibility (the QA `X-Test-Permission` override store).

**Deleted files:**
- `client/src/stores/PermissionManager.ts` (retired; global tier lives on `UserManager`, per-station role comes from the server).

**Modified files (server):** `server/src/database.ts`, `server/src/configureRoutes.ts`.

**Modified files (client):** `client/src/http/HttpClient.ts`, `client/src/stores/UserManager.ts`, `client/src/Endpoints.ts`, `client/src/components/ProtectedRoute.tsx`, `client/src/App.tsx`, `client/src/components/BottomNav.tsx`, `client/src/components/pages/HomePage.tsx`, `client/src/components/pages/PermissionManagementPage.tsx`, `client/src/components/pages/EvaluateSelectStation.tsx`, `client/src/components/pages/EvaluationForm.tsx`, `client/src/components/pages/StationFeedbackView.tsx`, `client/src/components/pages/StationDetail.tsx`, `client/src/components/pages/StationManagement.tsx`, `client/src/components/pages/DirectorOverview.tsx`, `client/src/utils/evaluationHelpers.ts`.

---

### Task 1: Shared `StationRole` type + pure role calculator

**Files:**
- Create: `packages/api/src/station/StationRole.ts`

**Interfaces:**
- Produces: `export type StationRole = 'participant' | 'instructor' | 'evaluator'` and `export function computeStationRoleFromScores(currentScore: number | null | undefined, nextScore: number | null | undefined, isLastStation: boolean): StationRole` — used by Task 3 (server resolver) and by every client file that types a station's `role` field.

- [ ] **Step 1: Write the file with an inline self-check**

```ts
export type StationRole = 'participant' | 'instructor' | 'evaluator';

/**
 * Pure score-to-role math, factored out of the old canSubmitEvaluation so it's
 * testable without a database. `evaluator` needs mastery (>=80) here and a pass
 * (>=50) at the next station; `instructor` needs a pass (>=50) here and a pass
 * at the next station; anything else is `participant`.
 */
export function computeStationRoleFromScores(
    currentScore: number | null | undefined,
    nextScore: number | null | undefined,
    isLastStation: boolean
): StationRole {
    const isMastery = (score?: number | null) => score !== undefined && score !== null && score >= 80;
    const hasPassed = (score?: number | null) => score !== undefined && score !== null && score >= 50;

    const currentMastery = isMastery(currentScore);
    const currentPassed = hasPassed(currentScore);
    const nextPassed = isLastStation || hasPassed(nextScore);

    if (currentMastery && nextPassed) return 'evaluator';
    if ((currentPassed || currentMastery) && nextPassed) return 'instructor';
    return 'participant';
}

function demo() {
    const assertEqual = (actual: StationRole, expected: StationRole, label: string) => {
        if (actual !== expected) throw new Error(`${label}: expected ${expected}, got ${actual}`);
    };

    assertEqual(computeStationRoleFromScores(undefined, undefined, false), 'participant', 'no scores at all');
    assertEqual(computeStationRoleFromScores(30, 90, false), 'participant', 'below 50 at current station');
    assertEqual(computeStationRoleFromScores(60, undefined, false), 'participant', 'passed here, next not started');
    assertEqual(computeStationRoleFromScores(60, 60, false), 'instructor', 'passed here, passed next');
    assertEqual(computeStationRoleFromScores(85, 60, false), 'evaluator', 'mastery here, passed next');
    assertEqual(computeStationRoleFromScores(85, 30, false), 'participant', 'mastery here but next not passed');
    assertEqual(computeStationRoleFromScores(85, undefined, true), 'evaluator', 'mastery at last station, no next station to check');
    assertEqual(computeStationRoleFromScores(60, undefined, true), 'instructor', 'passed at last station, no next station to check');

    console.log('StationRole self-check passed.');
}

if (import.meta.url === `file://${process.argv[1]}`) {
    demo();
}
```

- [ ] **Step 2: Run the self-check**

Run: `npx tsx packages/api/src/station/StationRole.ts`
Expected: `StationRole self-check passed.` printed, exit code 0.

- [ ] **Step 3: Commit**

```bash
git add packages/api/src/station/StationRole.ts
git commit -m "Add shared StationRole type and pure score-to-role calculator"
```

---

### Task 2: DB schema — `instructorNotes` column + `station_role_overrides` table

**Files:**
- Modify: `server/src/database.ts`

**Interfaces:**
- Consumes: nothing new.
- Produces: `Station.instructorNotes: string[]`; `Database.getStationRoleOverride(userId, stationId): Promise<'instructor' | 'evaluator' | null>`; `Database.setStationRoleOverride(userId, stationId, role: 'instructor' | 'evaluator'): Promise<void>`; `Database.deleteStationRoleOverride(userId, stationId): Promise<void>` — consumed by Task 3's `resolveStationRole` and Task 5's override endpoints.

- [ ] **Step 1: Add the `instructorNotes` column migration and `station_role_overrides` table**

In `server/src/database.ts`, extend the existing `stations` PRAGMA-check block (around line 96-100) to also add `instructorNotes`, and add a new `CREATE TABLE IF NOT EXISTS` for overrides right after the existing `station_queue` table (around line 137):

```ts
        this.db.all('PRAGMA table_info(stations)', [], (err, rows: any[]) => {
            if (!err && Array.isArray(rows) && !rows.some((row) => row.name === 'feedbackItems')) {
                this.db.run("ALTER TABLE stations ADD COLUMN feedbackItems TEXT NOT NULL DEFAULT '[]'");
            }
            if (!err && Array.isArray(rows) && !rows.some((row) => row.name === 'instructorNotes')) {
                this.db.run("ALTER TABLE stations ADD COLUMN instructorNotes TEXT NOT NULL DEFAULT '[]'");
            }
        });
```

```ts
        this.db.run(`
            CREATE TABLE IF NOT EXISTS station_role_overrides (
                userId INTEGER NOT NULL,
                stationId INTEGER NOT NULL,
                role TEXT NOT NULL CHECK(role IN ('instructor', 'evaluator')),
                PRIMARY KEY (userId, stationId),
                FOREIGN KEY (userId) REFERENCES users(id)
            )
        `);
```

- [ ] **Step 2: Update the `Station` type**

```ts
export type Station = {
    id?: number;
    name: string;
    criteria: string[];
    feedbackItems: string[];
    instructorNotes: string[];
    createdAt?: string;
};
```

- [ ] **Step 3: Update `createStation`, `getAllStations`, `getStationById`, `updateStation` for `instructorNotes`**

```ts
    createStation(station: { name: string; criteria: string[]; feedbackItems?: string[]; instructorNotes?: string[] }): Promise<{ id: number }> {
        return new Promise((resolve, reject) => {
            const sql = `INSERT INTO stations (name, criteria, feedbackItems, instructorNotes) VALUES (?, ?, ?, ?)`;
            this.db.run(
                sql,
                [station.name, JSON.stringify(station.criteria), JSON.stringify(station.feedbackItems ?? []), JSON.stringify(station.instructorNotes ?? [])],
                function(err) {
                    if (err) {
                        reject(err);
                        return;
                    }

                    resolve({ id: this.lastID });
                }
            );
        });
    }

    getAllStations(): Promise<Station[]> {
        return new Promise((resolve, reject) => {
            this.db.all(
                'SELECT id, name, criteria, feedbackItems, instructorNotes, createdAt FROM stations ORDER BY id ASC',
                [],
                (err, rows) => {
                    if (err) { reject(err); return; }
                    const stations = (rows as any[]).map(row => ({
                        ...row,
                        criteria: JSON.parse(row.criteria),
                        feedbackItems: row.feedbackItems ? JSON.parse(row.feedbackItems) : [],
                        instructorNotes: row.instructorNotes ? JSON.parse(row.instructorNotes) : []
                    }));
                    resolve(stations);
                }
            );
        });
    }

    getStationById(id: number): Promise<Station | null> {
        return new Promise((resolve, reject) => {
            this.db.get(
                'SELECT id, name, criteria, feedbackItems, instructorNotes, createdAt FROM stations WHERE id = ?',
                [id],
                (err, row) => {
                    if (err) { reject(err); return; }
                    if (!row) { resolve(null); return; }
                    resolve({
                        ...row as Station,
                        criteria: JSON.parse((row as any).criteria),
                        feedbackItems: (row as any).feedbackItems ? JSON.parse((row as any).feedbackItems) : [],
                        instructorNotes: (row as any).instructorNotes ? JSON.parse((row as any).instructorNotes) : []
                    });
                }
            );
        });
    }

    updateStation(id: number, updates: { name?: string; criteria?: string[]; feedbackItems?: string[]; instructorNotes?: string[] }): Promise<void> {
        return new Promise((resolve, reject) => {
            const fields = [];
            const values = [];

            if (updates.name !== undefined) {
                fields.push('name = ?');
                values.push(updates.name);
            }

            if (updates.criteria !== undefined) {
                fields.push('criteria = ?');
                values.push(JSON.stringify(updates.criteria));
            }

            if (updates.feedbackItems !== undefined) {
                fields.push('feedbackItems = ?');
                values.push(JSON.stringify(updates.feedbackItems));
            }

            if (updates.instructorNotes !== undefined) {
                fields.push('instructorNotes = ?');
                values.push(JSON.stringify(updates.instructorNotes));
            }

            if (fields.length === 0) {
                resolve();
                return;
            }

            const sql = `UPDATE stations SET ${fields.join(', ')} WHERE id = ?`;
            values.push(id);

            this.db.run(sql, values, function(err) {
                if (err) {
                    reject(err);
                    return;
                }

                resolve();
            });
        });
    }
```

- [ ] **Step 4: Add override read/write/delete methods**

Add these methods to the `Database` class, near the other station methods:

```ts
    getStationRoleOverride(userId: number, stationId: number): Promise<'instructor' | 'evaluator' | null> {
        return new Promise((resolve, reject) => {
            this.db.get(
                'SELECT role FROM station_role_overrides WHERE userId = ? AND stationId = ?',
                [userId, stationId],
                (err, row) => {
                    if (err) { reject(err); return; }
                    resolve(row ? (row as { role: 'instructor' | 'evaluator' }).role : null);
                }
            );
        });
    }

    setStationRoleOverride(userId: number, stationId: number, role: 'instructor' | 'evaluator'): Promise<void> {
        return new Promise((resolve, reject) => {
            this.db.run(
                `INSERT INTO station_role_overrides (userId, stationId, role) VALUES (?, ?, ?)
                 ON CONFLICT(userId, stationId) DO UPDATE SET role = excluded.role`,
                [userId, stationId, role],
                (err) => { if (err) reject(err); else resolve(); }
            );
        });
    }

    deleteStationRoleOverride(userId: number, stationId: number): Promise<void> {
        return new Promise((resolve, reject) => {
            this.db.run(
                'DELETE FROM station_role_overrides WHERE userId = ? AND stationId = ?',
                [userId, stationId],
                (err) => { if (err) reject(err); else resolve(); }
            );
        });
    }
```

- [ ] **Step 5: Verify it compiles and the migration runs**

Run: `cd server && npx tsc --noEmit`
Expected: no errors.

Run: `cd server && rm -f vtc.db && npx tsx -e "import { Database } from './src/database.ts'; new Database('./vtc.db');" && sqlite3 vtc.db ".schema stations" ".schema station_role_overrides"`
Expected: `stations` schema shows an `instructorNotes` column (via the `CREATE TABLE`, since this is a fresh DB); `station_role_overrides` table exists with the `CHECK` constraint. (If `vtc.db` already has data you care about, skip the `rm -f` and instead confirm the `ALTER TABLE` path by running against the existing `server/vtc.db` and checking `PRAGMA table_info(stations)` includes `instructorNotes`.)

- [ ] **Step 6: Commit**

```bash
git add server/src/database.ts
git commit -m "Add instructorNotes column and station_role_overrides table"
```

---

### Task 3: Server-side `resolveStationRole`

**Files:**
- Create: `server/src/stationRole.ts`

**Interfaces:**
- Consumes: `Database` (Task 2's `getStationRoleOverride`, `getLatestEvaluationForUserStation`), `User` + `PermFlags` from `@api/user/User`, `computeStationRoleFromScores` from `@api/station/StationRole` (Task 1).
- Produces: `export async function resolveStationRole(db: Database, user: User & { id: number }, stationId: number): Promise<StationRole>` — consumed by Task 4 (routes) and Task 5 (override endpoints).

- [ ] **Step 1: Write the resolver**

```ts
import type { Database } from './database';
import type { User } from '@api/user/User';
import { PermFlags } from '@api/user/User';
import { computeStationRoleFromScores, type StationRole } from '@api/station/StationRole';

export type { StationRole };

const LAST_STATION_ID = 6;

export async function resolveStationRole(
    db: Database,
    user: User & { id: number },
    stationId: number
): Promise<StationRole> {
    if (
        user.permFlags === PermFlags.IsDirector ||
        user.permFlags === PermFlags.IsLeadership ||
        user.permFlags === PermFlags.IsAssistant
    ) {
        return 'evaluator';
    }

    const override = await db.getStationRoleOverride(user.id, stationId);
    if (override) {
        return override;
    }

    const currentStation = await db.getLatestEvaluationForUserStation(user.id, stationId);
    const isLastStation = stationId >= LAST_STATION_ID;
    const nextStation = isLastStation ? null : await db.getLatestEvaluationForUserStation(user.id, stationId + 1);

    return computeStationRoleFromScores(currentStation?.score, nextStation?.score, isLastStation);
}
```

- [ ] **Step 2: Verify it compiles**

Run: `cd server && npx tsc --noEmit`
Expected: no errors. (No standalone runtime check here — this function's only logic beyond Task 1's pure calculator is DB plumbing and the global-tier short-circuit, which Task 4's manual verification steps exercise end-to-end against the real server.)

- [ ] **Step 3: Commit**

```bash
git add server/src/stationRole.ts
git commit -m "Add resolveStationRole: global tier, then override, then computed score"
```

---

### Task 4: Wire `resolveStationRole` into existing routes

**Files:**
- Modify: `server/src/configureRoutes.ts`

**Interfaces:**
- Consumes: `resolveStationRole` from `./stationRole` (Task 3).
- Produces: `GET /stations/:id` and `GET /stations` now return `role` (and `instructorNotes` when `role !== 'participant'`); `POST /stations` / `PUT /stations/:id` accept `instructorNotes`.

- [ ] **Step 1: Import the resolver and drop the now-dead local helpers**

At the top of `server/src/configureRoutes.ts`, add:

```ts
import { resolveStationRole } from './stationRole';
```

Remove the now-unused local `isMastery`/`hasPassed` definitions (lines 96-97) — their only remaining logic lives in `computeStationRoleFromScores` (Task 1) and `buildOverview`'s inline literal comparisons (`latest.score >= 80` etc., which are untouched and don't need the helpers).

- [ ] **Step 2: Narrow `isElevatedOverride`, simplify `canSubmitEvaluation`**

Replace (line 100):

```ts
    const isElevatedOverride = (overridePermission?: string) => overridePermission === 'evaluator' || overridePermission === 'elevated' || overridePermission === 'dr_jahlas' || overridePermission === 'instructor';
```

with:

```ts
    const isElevatedOverride = (overridePermission?: string) => overridePermission === 'elevated' || overridePermission === 'dr_jahlas';
```

Replace the whole `canSubmitEvaluation` function (lines 102-131):

```ts
    const canSubmitEvaluation = async (currentUserId: number, stationId: number, overridePermission?: string): Promise<boolean> => {
        const currentUser = await db.getUserById(currentUserId);
        if (!currentUser) {
            return false;
        }

        if (isDirectorOverride(overridePermission) || isElevatedOverride(overridePermission)) {
            return true;
        }

        const role = await resolveStationRole(db, currentUser, stationId);
        return role === 'evaluator';
    };
```

- [ ] **Step 3: Simplify `buildOverview`'s evaluator count using the shared resolver**

Replace the `stations` construction inside `buildOverview` (lines 163-208) — this also deletes the now-redundant `nextStationId`/`nextKey`/`hasCurrentMastery`/`hasNextPass` local duplication of the same math `resolveStationRole` already does:

```ts
        const stations = await Promise.all(allStations.map(async (station) => {
            const stationId = station.id!;
            let mastery = 0;
            let proficient = 0;
            let developing = 0;
            let notStarted = 0;
            let evaluatorCount = 0;

            await Promise.all(users.map(async (user) => {
                const key = `${user.id}:${stationId}`;
                const latest = latestByUserStation.get(key);

                if (!latest || latest.score === null || latest.score === undefined) {
                    notStarted += 1;
                } else if (latest.score >= 80) {
                    mastery += 1;
                } else if (latest.score >= 50) {
                    proficient += 1;
                } else {
                    developing += 1;
                }

                const role = await resolveStationRole(db, user, stationId);
                if (role === 'evaluator') {
                    evaluatorCount += 1;
                }
            }));

            return {
                stationId,
                name: station.name,
                mastery,
                proficient,
                developing,
                notStarted,
                evaluatorCount,
                totalUsers: users.length
            };
        }));
```

- [ ] **Step 4: Add `role`/`instructorNotes` to `GET /stations/:id`**

Replace the route (lines 435-442):

```ts
    // Public (any authenticated user) station lookup — role/instructorNotes are per-caller
    routes.get('/stations/:id', authMiddleware, async (c) => {
        const userId = (c as any).userId as number;
        const stationId = parseInt(c.req.param('id'));
        const currentUser = await db.getUserById(userId);
        if (!currentUser) {
            return c.json({ error: 'Unauthorized' }, 401);
        }

        const station = await db.getStationById(stationId);
        const base = station ?? { id: stationId, name: `Station ${stationId}`, criteria: [], feedbackItems: [], instructorNotes: [] };
        const role = await resolveStationRole(db, currentUser, stationId);

        return c.json({
            id: base.id,
            name: base.name,
            criteria: base.criteria,
            feedbackItems: base.feedbackItems,
            role,
            ...(role !== 'participant' ? { instructorNotes: base.instructorNotes } : {})
        });
    });
```

- [ ] **Step 5: Add `role`/`instructorNotes` to `GET /stations`**

Replace the route (lines 444-447):

```ts
    routes.get('/stations', authMiddleware, async (c) => {
        const userId = (c as any).userId as number;
        const currentUser = await db.getUserById(userId);
        if (!currentUser) {
            return c.json({ error: 'Unauthorized' }, 401);
        }

        const stations = await db.getAllStations();
        const withRoles = await Promise.all(stations.map(async (station) => {
            const role = await resolveStationRole(db, currentUser, station.id!);
            return {
                id: station.id,
                name: station.name,
                criteria: station.criteria,
                feedbackItems: station.feedbackItems,
                role,
                ...(role !== 'participant' ? { instructorNotes: station.instructorNotes } : {})
            };
        }));
        return c.json(withRoles);
    });
```

- [ ] **Step 6: Accept `instructorNotes` on create/update**

In the `POST /stations` handler, replace the body type + create call (around lines 591-593):

```ts
        const body = await c.req.json() as { name: string; criteria: string[]; feedbackItems?: string[]; instructorNotes?: string[] };
        const station = await db.createStation(body);
        return c.json(station);
```

In the `PUT /stations/:id` handler, replace the body type (around lines 604-606):

```ts
        const stationId = parseInt(c.req.param('id'));
        const updates = await c.req.json() as { name?: string; criteria?: string[]; feedbackItems?: string[]; instructorNotes?: string[] };
        await db.updateStation(stationId, updates);
```

- [ ] **Step 7: Verify with the running server**

Run: `cd server && npx tsc --noEmit`
Expected: no errors.

Run: `cd server && npm run dev` (leave running), then in another shell, register/log in a fresh band-member test user and hit the stations endpoints:

```bash
TOKEN=$(curl -s -X POST http://localhost:3000/v1/auth/register -H 'Content-Type: application/json' \
  -d '{"username":"roletest","password":"pass1234","email":"roletest@example.com","firstName":"Role","lastName":"Test","instrument":"Trumpet"}' \
  | node -pe 'JSON.parse(require("fs").readFileSync(0)).token')
curl -s http://localhost:3000/v1/stations/1 -H "Authorization: Bearer $TOKEN"
```

Expected: JSON includes `"role":"participant"` and no `instructorNotes` key (this fresh user has no evaluation history and isn't Elevated/Director).

- [ ] **Step 8: Commit**

```bash
git add server/src/configureRoutes.ts
git commit -m "Wire resolveStationRole into station and evaluation routes"
```

---

### Task 5: Director per-station role override endpoints

**Files:**
- Modify: `server/src/configureRoutes.ts`

**Interfaces:**
- Consumes: `resolveStationRole`, `db.setStationRoleOverride`, `db.deleteStationRoleOverride` (Tasks 2-3).
- Produces: `PUT /users/:userId/stations/:stationId/role` and `GET /users/:userId/stations/roles`, both director-only — consumed by Task 15 (`DirectorOverview.tsx`).

- [ ] **Step 1: Add the two routes**

Add these directly after the existing `routes.put('/users/:id/permissions', ...)` handler (after line 276), matching its director-only auth pattern exactly:

```ts
    routes.put('/users/:userId/stations/:stationId/role', authMiddleware, async (c) => {
        const currentUserId = (c as any).userId as number;
        const targetUserId = parseInt(c.req.param('userId'));
        const stationId = parseInt(c.req.param('stationId'));
        const testPermission = c.req.header('X-Test-Permission');
        const currentUser = await db.getUserById(currentUserId);
        if (!currentUser || (currentUser.permFlags !== PermFlags.IsDirector && !isDirectorOverride(testPermission ?? undefined))) {
            return c.json({ error: 'Forbidden' }, 403);
        }

        const { role } = await c.req.json() as { role: string };
        if (role !== 'participant' && role !== 'instructor' && role !== 'evaluator') {
            return c.json({ error: 'role must be participant, instructor, or evaluator' }, 400);
        }

        if (role === 'participant') {
            await db.deleteStationRoleOverride(targetUserId, stationId);
        } else {
            await db.setStationRoleOverride(targetUserId, stationId, role);
        }

        return c.json({ success: true });
    });

    routes.get('/users/:userId/stations/roles', authMiddleware, async (c) => {
        const currentUserId = (c as any).userId as number;
        const targetUserId = parseInt(c.req.param('userId'));
        const testPermission = c.req.header('X-Test-Permission');
        const currentUser = await db.getUserById(currentUserId);
        if (!currentUser || (currentUser.permFlags !== PermFlags.IsDirector && !isDirectorOverride(testPermission ?? undefined))) {
            return c.json({ error: 'Forbidden' }, 403);
        }

        const targetUser = await db.getUserById(targetUserId);
        if (!targetUser) {
            return c.json({ error: 'User not found' }, 404);
        }

        const stations = await db.getAllStations();
        const roles = await Promise.all(stations.map(async (station) => ({
            stationId: station.id!,
            stationName: station.name,
            role: await resolveStationRole(db, targetUser, station.id!)
        })));

        return c.json(roles);
    });
```

- [ ] **Step 2: Verify with the running server**

Run: `cd server && npx tsc --noEmit`
Expected: no errors.

With the dev server running and a director account's token (`$DIRECTOR_TOKEN`) and a band-member target user id (`$TARGET_ID`):

```bash
curl -s -X PUT http://localhost:3000/v1/users/$TARGET_ID/stations/1/role \
  -H "Authorization: Bearer $DIRECTOR_TOKEN" -H 'Content-Type: application/json' \
  -d '{"role":"instructor"}'

curl -s http://localhost:3000/v1/users/$TARGET_ID/stations/roles \
  -H "Authorization: Bearer $DIRECTOR_TOKEN"
```

Expected: first call returns `{"success":true}`; second call's array includes `{"stationId":1,...,"role":"instructor"}`. Then re-run the first call with `"role":"participant"` and confirm the second call's station-1 entry reverts to whatever the score-based computation gives (`"participant"` for a fresh user).

Also confirm 403 for a non-director token:

```bash
curl -s -o /dev/null -w '%{http_code}\n' -X PUT http://localhost:3000/v1/users/$TARGET_ID/stations/1/role \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -d '{"role":"instructor"}'
```

Expected: `403`.

- [ ] **Step 3: Commit**

```bash
git add server/src/configureRoutes.ts
git commit -m "Add director-only per-station role override endpoints"
```

---

### Task 6: `TestPermissionOverride` store (replaces `PermissionManager`'s global-tier override slice)

**Files:**
- Create: `client/src/stores/TestPermissionOverride.ts`
- Delete: `client/src/stores/PermissionManager.ts`

**Interfaces:**
- Produces: `export enum GlobalTier { BandMember = 'band_member', Elevated = 'elevated', Director = 'dr_jahlas' }`, default-exported store with `.tier` getter/setter, `.getLabel(tier)`, `.getAllTiers()` — consumed by Task 7 (`HttpClient.ts`) and Task 8/10 (`UserManager.ts`, `HomePage.tsx`).

- [ ] **Step 1: Create the store**

```ts
export enum GlobalTier {
    BandMember = 'band_member',
    Elevated = 'elevated',
    Director = 'dr_jahlas'
}

const tierLabels: Record<GlobalTier, string> = {
    [GlobalTier.BandMember]: 'Band Member',
    [GlobalTier.Elevated]: 'Elevated (SL/DM/Leadership)',
    [GlobalTier.Director]: 'Dr. Jahlas'
};

let currentTier = GlobalTier.BandMember;

const TestPermissionOverride = {
    get tier(): GlobalTier {
        return currentTier;
    },

    set tier(tier: GlobalTier) {
        currentTier = tier;
    },

    getLabel(tier: GlobalTier): string {
        return tierLabels[tier];
    },

    getAllTiers(): GlobalTier[] {
        return Object.values(GlobalTier);
    }
};

export default TestPermissionOverride;
```

- [ ] **Step 2: Delete the old store**

```bash
rm client/src/stores/PermissionManager.ts
```

(Leave its imports in other files broken for now — Tasks 7-15 fix every call site. Don't run the client build until Task 15 is done; `tsc -b` will show a wall of errors until then, which is expected mid-refactor.)

- [ ] **Step 3: Commit**

```bash
git add -A client/src/stores/TestPermissionOverride.ts client/src/stores/PermissionManager.ts
git commit -m "Replace PermissionManager with TestPermissionOverride (global tier only)"
```

---

### Task 7: `HttpClient.ts` — use `TestPermissionOverride`

**Files:**
- Modify: `client/src/http/HttpClient.ts`

**Interfaces:**
- Consumes: `TestPermissionOverride`, `GlobalTier` (Task 6).

- [ ] **Step 1: Swap the import and the header-building logic**

Replace (line 2):

```ts
import PermissionManager, { UserPermission } from '@client/stores/PermissionManager';
```

with:

```ts
import TestPermissionOverride, { GlobalTier } from '@client/stores/TestPermissionOverride';
```

Replace (lines 63-66):

```ts
        const overridePermission = PermissionManager.permission;
        if (!url.includes('://') && overridePermission && overridePermission !== UserPermission.BandMember) {
            headers['X-Test-Permission'] = overridePermission;
        }
```

with:

```ts
        const overrideTier = TestPermissionOverride.tier;
        if (!url.includes('://') && overrideTier && overrideTier !== GlobalTier.BandMember) {
            headers['X-Test-Permission'] = overrideTier;
        }
```

- [ ] **Step 2: Commit**

```bash
git add client/src/http/HttpClient.ts
git commit -m "Point HttpClient's test-permission header at TestPermissionOverride"
```

---

### Task 8: `UserManager.ts` — collapse tiers, wire override store, add station-role methods

**Files:**
- Modify: `client/src/stores/UserManager.ts`
- Modify: `client/src/Endpoints.ts`

**Interfaces:**
- Consumes: `TestPermissionOverride`, `GlobalTier` (Task 6); `StationRole` from `@api/station/StationRole` (Task 1).
- Produces: `UserManager.isElevated: boolean` (replaces `isTA`/`isLeadership`); `UserManager.getStation`/`getStations` now return `role`/`instructorNotes`; `UserManager.setStationRole(userId, stationId, role)`; `UserManager.getUserStationRoles(userId)` — consumed by Tasks 9-15.

- [ ] **Step 1: Add endpoints for the new routes**

In `client/src/Endpoints.ts`, replace the `users` block:

```ts
    users: {
        list: '/users',
        permissions: (userId: number) => `/users/${userId}/permissions`,
        stationRole: (userId: number, stationId: number) => `/users/${userId}/stations/${stationId}/role`,
        stationRoles: (userId: number) => `/users/${userId}/stations/roles`
    },
```

- [ ] **Step 2: Swap the `PermissionManager` import and `updatePermissionFromUser`**

Replace (line 3):

```ts
import PermissionManager, { UserPermission } from '@client/stores/PermissionManager';
```

with:

```ts
import TestPermissionOverride, { GlobalTier } from '@client/stores/TestPermissionOverride';
import type { StationRole } from '@api/station/StationRole';
```

Replace `updatePermissionFromUser` (lines 28-48):

```ts
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
```

- [ ] **Step 3: Collapse `isTA`/`isLeadership` into `isElevated`**

Replace both getters (lines 100-116):

```ts
    /** Checks whether or not the current user has elevated status (Leadership, TA, or equivalent). */
    get isElevated(): boolean {
        if (!this.isLoggedIn) {
            return false;
        }

        const level = this._user!.permFlags & PermFlags.LevelMask;
        return level === PermFlags.IsLeadership || level === PermFlags.IsAssistant;
    }
```

- [ ] **Step 4: Update `getStation`/`getStations` return types**

Replace `getStation` (previously around lines 244-248):

```ts
    async getStation(stationId: number): Promise<{ id: number; name: string; criteria: string[]; feedbackItems: string[]; role: StationRole; instructorNotes?: string[] } | null> {
        const response = await http.get<{ id: number; name: string; criteria: string[]; feedbackItems: string[]; role: StationRole; instructorNotes?: string[] }>(`/stations/${stationId}`);
        if (!response.ok || !response.body) return null;
        return response.body;
    }
```

Replace `getStations` (previously around lines 291-297):

```ts
    async getStations(): Promise<Array<{ id: number; name: string; criteria: string[]; feedbackItems: string[]; role: StationRole; instructorNotes?: string[] }> | null> {
        const response = await http.get('/stations');
        if (!response.ok || !response.body) {
            return null;
        }
        return response.body as Array<{ id: number; name: string; criteria: string[]; feedbackItems: string[]; role: StationRole; instructorNotes?: string[] }>;
    }
```

- [ ] **Step 5: Add `instructorNotes` to `createStation`/`updateStation`**

Replace both methods (previously around lines 299-311):

```ts
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
```

- [ ] **Step 6: Add the director override methods**

Add near `updateUserPermissions`:

```ts
    async setStationRole(userId: number, stationId: number, role: StationRole): Promise<boolean> {
        const response = await http.put(Endpoints.users.stationRole(userId, stationId), { role });
        return response.ok;
    }

    async getUserStationRoles(userId: number): Promise<Array<{ stationId: number; stationName: string; role: StationRole }>> {
        const response = await http.get(Endpoints.users.stationRoles(userId));
        if (!response.ok || !response.body) return [];
        return response.body as Array<{ stationId: number; stationName: string; role: StationRole }>;
    }
```

- [ ] **Step 7: Commit**

```bash
git add client/src/stores/UserManager.ts client/src/Endpoints.ts
git commit -m "UserManager: collapse isTA/isLeadership into isElevated, add station-role methods"
```

---

### Task 9: `ProtectedRoute.tsx`, `App.tsx`, `BottomNav.tsx` — nav/admin gating swaps

**Files:**
- Modify: `client/src/components/ProtectedRoute.tsx`
- Modify: `client/src/App.tsx`
- Modify: `client/src/components/BottomNav.tsx`

**Interfaces:**
- Consumes: `UserManager.isDirector`, `UserManager.isElevated`, `UserManager.getStations()` (Task 8).

- [ ] **Step 1: Simplify `ProtectedRoute`'s prop shape**

Replace the whole file:

```tsx
import type { ReactNode } from "react";
import { Navigate } from "react-router";

interface ProtectedRouteProps {
    children: ReactNode;
    requiredPermission: () => boolean;
    fallbackRoute?: string;
}

export default function ProtectedRoute({
    children,
    requiredPermission,
    fallbackRoute = '/'
}: ProtectedRouteProps) {
    if (!requiredPermission()) {
        return <Navigate to={fallbackRoute} replace />;
    }

    return <>{children}</>;
}
```

- [ ] **Step 2: Update `App.tsx`'s four `ProtectedRoute` usages**

Add the import:

```tsx
import UserManager from "./stores/UserManager";
```

Replace every occurrence of:

```tsx
requiredPermission={(pm) => pm.canViewAdmin()}
```

with:

```tsx
requiredPermission={() => UserManager.isDirector}
```

(Four occurrences: the `/permissions`, `/admin/overview`, `/admin/stations`, and `/admin/edit-vtc` routes.)

- [ ] **Step 3: Rewrite `BottomNav.tsx` to use `isDirector`/`isElevated` and per-station roles from the server**

Replace the whole file:

```tsx
import { useEffect, useState } from "react";
import { Link } from "react-router";
import UserManager from "@client/stores/UserManager";

export default function BottomNav() {
    const canViewAdmin = UserManager.isDirector;
    const [canEvaluateAnywhere, setCanEvaluateAnywhere] = useState(UserManager.isDirector || UserManager.isElevated);
    const [hasAnyStationRole, setHasAnyStationRole] = useState(UserManager.isDirector || UserManager.isElevated);

    useEffect(() => {
        const loadStationAccess = async () => {
            if (!UserManager.isLoggedIn) return;
            if (UserManager.isDirector || UserManager.isElevated) {
                setCanEvaluateAnywhere(true);
                setHasAnyStationRole(true);
                return;
            }
            try {
                const stations = await UserManager.getStations();
                const evaluatorSomewhere = (stations ?? []).some((s) => s.role === 'evaluator');
                const roleSomewhere = (stations ?? []).some((s) => s.role === 'evaluator' || s.role === 'instructor');
                setCanEvaluateAnywhere(evaluatorSomewhere);
                setHasAnyStationRole(roleSomewhere);
            } catch {
                setCanEvaluateAnywhere(false);
                setHasAnyStationRole(false);
            }
        };
        loadStationAccess();
    }, []);

    const showEvaluate = canViewAdmin || canEvaluateAnywhere;
    const showQR = UserManager.isLoggedIn && !canViewAdmin;

    return (
        <nav className="bottom-nav">
            <Link to="/" className="nav-item">Home</Link>
            {showQR && <Link to="/get-evaluated" className="nav-item">My QR</Link>}
            {showEvaluate && <Link to="/evaluate" className="nav-item">Evaluate</Link>}
            {hasAnyStationRole && !canViewAdmin && <Link to="/station-reference" className="nav-item">Reference</Link>}
            <Link to="/profile" className="nav-item">Profile</Link>
            {canViewAdmin && <Link to="/admin/overview" className="nav-item">Director</Link>}
        </nav>
    );
}
```

- [ ] **Step 4: Commit**

```bash
git add client/src/components/ProtectedRoute.tsx client/src/App.tsx client/src/components/BottomNav.tsx
git commit -m "Swap PermissionManager admin/nav gating for UserManager.isDirector/isElevated"
```

---

### Task 10: `HomePage.tsx`, `PermissionManagementPage.tsx` — dropdown + admin swaps

**Files:**
- Modify: `client/src/components/pages/HomePage.tsx`
- Modify: `client/src/components/pages/PermissionManagementPage.tsx`

**Interfaces:**
- Consumes: `TestPermissionOverride`, `GlobalTier` (Task 6); `UserManager.isDirector`, `isElevated` (Task 8).

- [ ] **Step 1: `HomePage.tsx` — swap imports and the override dropdown**

Replace (line 3):

```tsx
import PermissionManager, { UserPermission } from "@client/stores/PermissionManager";
```

with:

```tsx
import TestPermissionOverride, { GlobalTier } from "@client/stores/TestPermissionOverride";
```

Replace (line 43):

```tsx
    const [permission, setPermission] = useState(PermissionManager.permission);
```

with:

```tsx
    const [tier, setTier] = useState(TestPermissionOverride.tier);
```

Replace `handlePermissionChange` (lines 82-86):

```tsx
    const handleTierChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newTier = e.target.value as GlobalTier;
        TestPermissionOverride.tier = newTier;
        setTier(newTier);
    };
```

Replace (line 94):

```tsx
        if (UserManager.isTA || UserManager.isDirector || PermissionManager.canViewAdmin()) {
```

with:

```tsx
        if (UserManager.isElevated || UserManager.isDirector) {
```

Replace the dropdown JSX (lines 116-127):

```tsx
                            <select
                                id="permission"
                                value={tier}
                                onChange={handleTierChange}
                                className="permission-dropdown"
                            >
                                {TestPermissionOverride.getAllTiers().map(t => (
                                    <option key={t} value={t}>
                                        {TestPermissionOverride.getLabel(t)}
                                    </option>
                                ))}
                            </select>
```

Replace the two remaining `PermissionManager.canViewAdmin()` calls (lines 184, 213) with `UserManager.isDirector`.

- [ ] **Step 2: `PermissionManagementPage.tsx` — collapse the dropdown to 3 tiers, normalize Elevated writes**

Replace the whole file:

```tsx
import UserManager from '@client/stores/UserManager';
import { PermFlags, type User } from '@api/user/User';
import React from 'react';
import { useNavigate } from 'react-router';

const permissionLabel = (flags: number) => {
    const level = flags & PermFlags.LevelMask;
    if (level === PermFlags.IsDirector) return 'Director';
    if (level === PermFlags.IsLeadership || level === PermFlags.IsAssistant) return 'Elevated';
    return 'Band Member';
};

// IsAssistant is a legacy value: existing users at that raw permFlags value still
// read as Elevated, but this page only ever writes IsLeadership going forward.
const normalizedLevel = (flags: number) => {
    const level = flags & PermFlags.LevelMask;
    return level === PermFlags.IsAssistant ? PermFlags.IsLeadership : level;
};

export default function PermissionManagementPage() {
    const nav = useNavigate();
    const [users, setUsers] = React.useState<User[]>([]);
    const [error, setError] = React.useState('');

    React.useEffect(() => {
        if (!UserManager.isLoggedIn || !UserManager.isDirector) {
            nav('/');
            return;
        }

        loadUsers();
    }, []);

    const loadUsers = async () => {
        try {
            const data = await UserManager.getAllUsers();
            setUsers(data);
        } catch (err) {
            setError('Unable to load users.');
        }
    };

    const updatePermission = async (userId: number, permFlags: number) => {
        try {
            await UserManager.updateUserPermissions(userId, permFlags);
            await loadUsers();
        } catch (err) {
            setError('Unable to update permission.');
        }
    };

    return (
        <>
            <h1>Permission Management</h1>
            {error && <p style={{ color: 'red' }}>{error}</p>}
            <table>
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Username</th>
                        <th>Instrument</th>
                        <th>Permission</th>
                        <th>Change</th>
                    </tr>
                </thead>
                <tbody>
                    {users.map((user) => (
                        <tr key={user.id}>
                            <td>{user.firstName} {user.lastName}</td>
                            <td>{user.username}</td>
                            <td>{user.instrument}</td>
                            <td>{permissionLabel(user.permFlags)}</td>
                            <td>
                                <select
                                    value={normalizedLevel(user.permFlags)}
                                    onChange={(event) => updatePermission(user.id!, parseInt(event.target.value))}
                                >
                                    <option value={PermFlags.IsBandMember}>Band Member</option>
                                    <option value={PermFlags.IsLeadership}>Elevated</option>
                                    <option value={PermFlags.IsDirector}>Director</option>
                                </select>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </>
    );
}
```

- [ ] **Step 3: Commit**

```bash
git add client/src/components/pages/HomePage.tsx client/src/components/pages/PermissionManagementPage.tsx
git commit -m "HomePage/PermissionManagementPage: use TestPermissionOverride and UserManager tier helpers"
```

---

### Task 11: `EvaluateSelectStation.tsx` — role-based eligibility from the server

**Files:**
- Modify: `client/src/components/pages/EvaluateSelectStation.tsx`

**Interfaces:**
- Consumes: `UserManager.getStations()` returning `role` per station (Task 8); `StationRole` type (Task 1).

- [ ] **Step 1: Replace the whole file**

The old file computed eligibility client-side from raw evaluation history via `canEvaluateStation`/`canTeachStation`, duplicating server logic. Now the server's `role` field is the single source of truth, so the `evaluations` fetch and those two helper calls are removed entirely; eligibility to select/submit at a station is `role === 'evaluator'`.

```tsx
import { useNavigate, useSearchParams } from "react-router";
import BottomNav from "../BottomNav";
import UserManager from "@client/stores/UserManager";
import { useState, useEffect, useRef, useCallback } from "react";
import type { StationRole } from "@api/station/StationRole";
import jsQR from "jsqr";

type Station = {
    id: number;
    name: string;
    role: StationRole;
};

export default function EvaluateSelectStation() {
    const nav = useNavigate();
    const [searchParams] = useSearchParams();
    const [selectedStation, setSelectedStation] = useState<number | null>(null);
    const [stations, setStations] = useState<Station[]>([]);
    const [queue, setQueue] = useState<Array<{ id: number; name: string; userId: number; position: number; requestedAt: string }>>([]);
    const [queueError, setQueueError] = useState('');
    const [queueMessage, setQueueMessage] = useState('');
    const [error, setError] = useState('');

    // QR scanner state
    const [scannerOpen, setScannerOpen] = useState(false);
    const [scanError, setScanError] = useState('');
    const [scannedUser, setScannedUser] = useState<{ id: number; name: string } | null>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const scanIntervalRef = useRef<number | null>(null);

    useEffect(() => {
        const load = async () => {
            if (!UserManager.isLoggedIn) return;
            try {
                const stationList = await UserManager.getStations();
                if (stationList === null) {
                    setError('Unable to load stations. Check your connection and try again.');
                    return;
                }
                setStations(stationList);
            } catch {
                setError('Unable to load your station progress.');
            }
        };
        load();
    }, []);

    // Auto-select the station we were just redirected from after submitting an evaluation.
    useEffect(() => {
        if (selectedStation || stations.length === 0) return;
        const redirectStationId = Number(searchParams.get('stationId'));
        if (!redirectStationId) return;
        const target = stations.find((s) => s.id === redirectStationId);
        if (target && target.role === 'evaluator') {
            setSelectedStation(redirectStationId);
        }
    }, [stations, searchParams]);

    useEffect(() => {
        const loadQueue = async () => {
            if (!selectedStation || !UserManager.isLoggedIn) {
                setQueue([]);
                return;
            }
            try {
                const queueItems = await UserManager.getStationQueue(selectedStation);
                setQueue(queueItems);
                setQueueError('');
            } catch {
                setQueue([]);
                setQueueError('Unable to load the station queue.');
            }
        };
        loadQueue();
        const interval = setInterval(loadQueue, 5000);
        return () => clearInterval(interval);
    }, [selectedStation]);

    // Clean up camera on unmount
    useEffect(() => {
        return () => stopScanner();
    }, []);

    const stopScanner = () => {
        if (scanIntervalRef.current !== null) {
            clearInterval(scanIntervalRef.current);
            scanIntervalRef.current = null;
        }
        if (streamRef.current) {
            streamRef.current.getTracks().forEach((t) => t.stop());
            streamRef.current = null;
        }
    };

    const startScanner = useCallback(async () => {
        setScanError('');
        setScannedUser(null);
        setScannerOpen(true);

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                videoRef.current.play();
            }

            scanIntervalRef.current = window.setInterval(() => {
                const video = videoRef.current;
                const canvas = canvasRef.current;
                if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) return;

                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                const ctx = canvas.getContext('2d');
                if (!ctx) return;
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const code = jsQR(imageData.data, imageData.width, imageData.height);

                if (code) {
                    const userId = parseInt(code.data);
                    if (!isNaN(userId) && userId > 0) {
                        stopScanner();
                        setScannerOpen(false);
                        handleScannedUserId(userId);
                    }
                }
            }, 200);
        } catch {
            setScanError('Camera access denied or unavailable.');
            setScannerOpen(false);
        }
    }, []);

    const handleScannedUserId = async (userId: number) => {
        try {
            const users = await UserManager.getAllUsers();
            const found = users.find((u) => u.id === userId);
            if (found) {
                setScannedUser({ id: found.id!, name: `${found.firstName} ${found.lastName}` });
            } else {
                setScanError(`No student found with ID ${userId}.`);
            }
        } catch {
            setScanError('Failed to look up scanned student.');
        }
    };

    const handleSelect = () => {
        if (!selectedStation) return;
        const target = stations.find((s) => s.id === selectedStation);
        if (!target || target.role !== 'evaluator') {
            setError('You are not yet eligible to evaluate this station. Reach mastery and pass the next station first.');
            return;
        }
        nav(`/evaluate/station/${selectedStation}`);
    };

    const handleTakeNext = async () => {
        if (!selectedStation) return;
        try {
            const result = await UserManager.takeNextStationQueue(selectedStation);
            if (result.success && result.removedEntry) {
                nav(`/evaluate/station/${selectedStation}?studentId=${result.removedEntry.userId}`);
                return;
            }
            setQueueError(result.message ?? 'Unable to pull next student from the queue.');
            setQueueMessage('');
        } catch (err) {
            setQueueError(err instanceof Error ? err.message : 'Unable to pull next student from the queue.');
            setQueueMessage('');
        }
    };

    const handleEvaluateScanned = () => {
        if (!scannedUser || !selectedStation) return;
        const target = stations.find((s) => s.id === selectedStation);
        if (!target || target.role !== 'evaluator') {
            setScanError('You are not eligible to evaluate this station. Reach mastery and pass the next station first.');
            return;
        }
        nav(`/evaluate/station/${selectedStation}?studentId=${scannedUser.id}`);
    };

    return (
        <>
            <section id="center">
                <div>
                    <h1>Select Station</h1>
                    <h2>Choose the station you want to evaluate</h2>
                    {error && <div className="error-message">{error}</div>}

                    <div className="stations-select-list">
                        {stations.length === 0 && (
                            <p className="no-stations-message">No stations available yet.</p>
                        )}
                        {stations.map((station) => {
                            const canEvaluate = station.role === 'evaluator';
                            return (
                                <div
                                    key={station.id}
                                    className={`station-select-row ${selectedStation === station.id ? 'selected' : ''} ${canEvaluate ? '' : 'disabled'}`}
                                    onClick={() => { if (canEvaluate) setSelectedStation(station.id); }}
                                >
                                    <input
                                        type="radio"
                                        name="station"
                                        value={station.id}
                                        checked={selectedStation === station.id}
                                        onChange={() => { if (canEvaluate) setSelectedStation(station.id); }}
                                        disabled={!canEvaluate}
                                    />
                                    <label>{station.name}</label>
                                </div>
                            );
                        })}
                    </div>

                    {selectedStation && (
                        <>
                            <div className="queue-panel">
                                <h3>Queue for Station {selectedStation}</h3>
                                {queueError && <div className="error-message">{queueError}</div>}
                                {queueMessage && <div className="success-message">{queueMessage}</div>}
                                <p>{queue.length ? `${queue.length} student(s) waiting.` : 'No one is waiting in the queue yet.'}</p>
                                {queue.length > 0 && (
                                    <ol>
                                        {queue.map((entry) => (
                                            <li key={entry.id}>{entry.name} {entry.position === 1 ? '(next)' : ''}</li>
                                        ))}
                                    </ol>
                                )}
                                <button
                                    className="btn submit-btn"
                                    onClick={handleTakeNext}
                                    disabled={!queue.length}
                                >
                                    Pull Next Student
                                </button>
                            </div>

                            {/* QR Scanner — only shown after a station is selected */}
                            <div className="qr-scan-panel">
                                <h3>Scan Student QR Code</h3>
                                <p>Scan a student's QR code to evaluate them for Station {selectedStation}.</p>
                                {scanError && <div className="error-message">{scanError}</div>}
                                {scannedUser && (
                                    <div className="scanned-student">
                                        <strong>Scanned:</strong> {scannedUser.name}
                                        <button className="button primary" onClick={handleEvaluateScanned} style={{ marginLeft: '1rem' }}>
                                            Evaluate Now
                                        </button>
                                    </div>
                                )}
                                {!scannerOpen ? (
                                    <button className="button secondary" onClick={startScanner}>
                                        📷 Open QR Scanner
                                    </button>
                                ) : (
                                    <div className="scanner-container">
                                        <video ref={videoRef} className="scanner-video" playsInline muted />
                                        <canvas ref={canvasRef} style={{ display: 'none' }} />
                                        <button className="button secondary" onClick={() => { stopScanner(); setScannerOpen(false); }}>
                                            Close Scanner
                                        </button>
                                    </div>
                                )}
                            </div>
                        </>
                    )}

                    <button
                        className="btn submit-btn"
                        onClick={handleSelect}
                        disabled={!selectedStation}
                    >
                        Continue (Manual)
                    </button>
                </div>
            </section>
            <BottomNav />
            <style>{`
                .qr-scan-panel {
                    margin-top: 1.5rem;
                    padding: 1rem;
                    border: 1px solid #ddd;
                    border-radius: 10px;
                    background: #f9f9f9;
                }
                .qr-scan-panel h3 { margin-bottom: 0.5rem; }
                .scanner-container {
                    display: flex;
                    flex-direction: column;
                    align-items: flex-start;
                    gap: 0.75rem;
                    margin-top: 0.75rem;
                }
                .scanner-video {
                    width: 100%;
                    max-width: 360px;
                    border-radius: 10px;
                    border: 2px solid #60a5fa;
                }
                .scanned-student {
                    margin: 0.75rem 0;
                    padding: 0.75rem 1rem;
                    background: #f0fdf4;
                    border: 1px solid #22c55e;
                    border-radius: 8px;
                    display: flex;
                    align-items: center;
                    flex-wrap: wrap;
                    gap: 0.5rem;
                }
            `}</style>
        </>
    );
}
```

- [ ] **Step 2: Commit**

```bash
git add client/src/components/pages/EvaluateSelectStation.tsx
git commit -m "EvaluateSelectStation: use server-computed per-station role instead of client eligibility math"
```

---

### Task 12: `EvaluationForm.tsx`, `StationFeedbackView.tsx` — role-based eligibility; drop dead helpers

**Files:**
- Modify: `client/src/components/pages/EvaluationForm.tsx`
- Modify: `client/src/components/pages/StationFeedbackView.tsx`
- Modify: `client/src/utils/evaluationHelpers.ts`

**Interfaces:**
- Consumes: `UserManager.getStation()`/`getStations()` returning `role` (Task 8).

- [ ] **Step 1: `EvaluationForm.tsx` — swap eligibility to the station's `role`**

Replace the import block (lines 5, 7-9):

```tsx
import type { StationRole } from "@api/station/StationRole";
```

(drop `PermissionManager` import entirely; keep the rest of the `evaluationHelpers` import but remove `canEvaluateStation, canTeachStation,` from it, leaving:)

```tsx
import {
    getLatestStationEvaluation,
    getStatusLabel,
    isMasteryLocked,
    scoreToStatus,
    type EvaluationRecord,
} from "@client/utils/evaluationHelpers";
```

Add a new state variable next to the others (near line 43):

```tsx
    const [stationRole, setStationRole] = useState<StationRole>('participant');
```

Replace `loadStationCriteria` (lines 61-68):

```tsx
    const loadStationCriteria = async () => {
        const station = await UserManager.getStation(Number(stationId));
        if (station) {
            setStationName(station.name);
            setCriteria(station.criteria?.length > 0 ? station.criteria.map((name) => ({ name, level: 'developing' })) : []);
            setFeedbackOptions(station.feedbackItems ?? []);
            setStationRole(station.role);
        }
    };
```

Replace `currentEligibility` (lines 134-139):

```tsx
    const currentStationId = Number(stationId);
    const currentEligibility = stationRole === 'evaluator';
```

- [ ] **Step 2: `StationFeedbackView.tsx` — gate on any per-station role, not the retired global `canEvaluate()`**

Replace the imports (lines 4-5):

```tsx
import UserManager from '@client/stores/UserManager';
```

Replace the `useEffect` (lines 20-27):

```tsx
    useEffect(() => {
        const check = async () => {
            if (!UserManager.isLoggedIn) { nav('/'); return; }
            if (UserManager.isDirector || UserManager.isElevated) {
                loadStations();
                return;
            }
            const stations = await UserManager.getStations();
            const hasRoleSomewhere = (stations ?? []).some((s) => s.role === 'evaluator' || s.role === 'instructor');
            if (!hasRoleSomewhere) { nav('/'); return; }
            loadStations();
        };
        check();
    }, []);

    const loadStations = () => {
        UserManager.getStationsFeedback()
            .then(setStations)
            .catch(() => setError('Failed to load station information.'));
    };
```

- [ ] **Step 3: Remove the now-dead `canEvaluateStation`/`canTeachStation` from `evaluationHelpers.ts`**

Both were only used by `BottomNav.tsx` (removed in Task 9) and `EvaluateSelectStation.tsx`/`EvaluationForm.tsx` (removed in Tasks 11-12). Delete these two exports (lines 44-90 of `client/src/utils/evaluationHelpers.ts`):

```ts
export const canEvaluateStation = (
    evaluations: EvaluationRecord[],
    stationId: number,
    allStationIds?: number[]
): boolean => {
    ...
};

export const canTeachStation = (
    evaluations: EvaluationRecord[],
    stationId: number,
    allStationIds?: number[]
): boolean => {
    ...
};
```

Leave `scoreToStatus`, `getLatestStationEvaluation`, `hasPassedStation`, `isMasteryLocked`, `getStatusLabel`, and the `EvaluationRecord`/`EvaluationStatus` types in place — still used elsewhere (`StationDetail.tsx`, `HomePage.tsx`, `DirectorOverview.tsx`, `EvaluationForm.tsx`).

- [ ] **Step 4: Grep-verify nothing else references the deleted functions**

Run: `grep -rn "canEvaluateStation\|canTeachStation" client/src`
Expected: no matches.

- [ ] **Step 5: Commit**

```bash
git add client/src/components/pages/EvaluationForm.tsx client/src/components/pages/StationFeedbackView.tsx client/src/utils/evaluationHelpers.ts
git commit -m "EvaluationForm/StationFeedbackView: use server-computed role; drop dead client eligibility helpers"
```

---

### Task 13: `StationDetail.tsx` — Instructor Notes section

**Files:**
- Modify: `client/src/components/pages/StationDetail.tsx`

**Interfaces:**
- Consumes: `UserManager.getStation()` returning `role`/`instructorNotes` (Task 8).

- [ ] **Step 1: Extend the local `station` state type and initial value**

Replace (line 14):

```tsx
    const [station, setStation] = useState<{ id: number; name: string; criteria: string[]; role: StationRole; instructorNotes?: string[] }>({ id: Number(id), name: `Station ${id}`, criteria: [], role: 'participant' });
```

Add the import near the top of the file, next to the other imports:

```tsx
import type { StationRole } from "@api/station/StationRole";
```

- [ ] **Step 2: Render the Instructor Notes section**

Add this block in the JSX right after the existing `criteria-summary` block (after line 148, before the `queue-panel` div):

```tsx
                    {station.role !== 'participant' && station.instructorNotes && station.instructorNotes.length > 0 && (
                        <div className="instructor-notes-summary">
                            <h3>Instructor Notes</h3>
                            <ul>
                                {station.instructorNotes.map((note) => (
                                    <li key={note}>{note}</li>
                                ))}
                            </ul>
                        </div>
                    )}
```

- [ ] **Step 3: Manual verification**

Run: `cd client && npm run dev` (leave running), then in the browser:
1. Log in as a director (or use the "Override Permission" dropdown on Home to switch to Director), open a station's detail page. Expected: an "Instructor Notes" section appears if that station has any notes set (none will exist yet until Task 14 lets a director add some — for now just confirm no console/type errors and the section is simply absent).
2. Confirm a fresh band-member account (no evaluation history) does **not** see an "Instructor Notes" heading on any station detail page.

- [ ] **Step 4: Commit**

```bash
git add client/src/components/pages/StationDetail.tsx
git commit -m "StationDetail: render Instructor Notes section for instructor/evaluator roles"
```

---

### Task 14: `StationManagement.tsx` — `instructorNotes` editor

**Files:**
- Modify: `client/src/components/pages/StationManagement.tsx`

**Interfaces:**
- Consumes: `UserManager.createStation`/`updateStation` with the new `instructorNotes` param (Task 8).

- [ ] **Step 1: Extend the local types**

Replace (lines 7-18):

```tsx
type Station = {
    id: number;
    name: string;
    criteria: string[];
    feedbackItems: string[];
    instructorNotes: string[];
};

type EditState = {
    name: string;
    criteria: string;
    feedbackItems: string;
    instructorNotes: string;
};
```

- [ ] **Step 2: Update initial state and swap `PermissionManager` for `UserManager.isDirector`**

Replace (lines 4-5):

```tsx
import UserManager from '@client/stores/UserManager';
```

Replace (lines 23, 25):

```tsx
    const [newStation, setNewStation] = useState<EditState>({ name: '', criteria: '', feedbackItems: '', instructorNotes: '' });
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editState, setEditState] = useState<EditState>({ name: '', criteria: '', feedbackItems: '', instructorNotes: '' });
```

Replace (line 30):

```tsx
        if (!UserManager.isLoggedIn || !UserManager.isDirector) {
```

- [ ] **Step 3: Wire `instructorNotes` through create/edit/save**

Replace `handleCreate` (lines 52-70):

```tsx
    const handleCreate = async () => {
        if (!newStation.name.trim()) { setError('Station name is required.'); return; }
        const criteria = parseLines(newStation.criteria);
        if (criteria.length === 0) { setError('At least one criterion is required.'); return; }
        const feedbackItems = parseLines(newStation.feedbackItems);
        const instructorNotes = parseLines(newStation.instructorNotes);
        try {
            const ok = await UserManager.createStation(newStation.name.trim(), criteria, feedbackItems, instructorNotes);
            if (ok) {
                setSuccess('Station created.');
                setNewStation({ name: '', criteria: '', feedbackItems: '', instructorNotes: '' });
                setError('');
                await loadStations();
            } else {
                setError('Failed to create station.');
            }
        } catch {
            setError('Failed to create station.');
        }
    };
```

Replace `startEdit` (lines 72-81):

```tsx
    const startEdit = (station: Station) => {
        setEditingId(station.id);
        setEditState({
            name: station.name,
            criteria: station.criteria.join('\n'),
            feedbackItems: station.feedbackItems.join('\n'),
            instructorNotes: station.instructorNotes.join('\n'),
        });
        setError('');
        setSuccess('');
    };
```

Replace `handleSaveEdit` (lines 83-101):

```tsx
    const handleSaveEdit = async () => {
        if (!editingId) return;
        const criteria = parseLines(editState.criteria);
        if (criteria.length === 0) { setError('At least one criterion is required.'); return; }
        const feedbackItems = parseLines(editState.feedbackItems);
        const instructorNotes = parseLines(editState.instructorNotes);
        try {
            const ok = await UserManager.updateStation(editingId, editState.name.trim(), criteria, feedbackItems, instructorNotes);
            if (ok) {
                setSuccess('Station updated.');
                setEditingId(null);
                setError('');
                await loadStations();
            } else {
                setError('Failed to update station.');
            }
        } catch {
            setError('Failed to update station.');
        }
    };
```

- [ ] **Step 4: Add the editor UI**

In the edit form (after the "Areas to Work On" `form-group`, before the closing `.button-group`, around line 157):

```tsx
                                        <div className="form-group">
                                            <label>Instructor Notes <span className="label-hint">(one per line)</span></label>
                                            <textarea
                                                className="text-input"
                                                value={editState.instructorNotes}
                                                onChange={(e) => setEditState({ ...editState, instructorNotes: e.target.value })}
                                                rows={5}
                                                placeholder="Detailed teaching notes visible to Instructors and Evaluators only"
                                            />
                                        </div>
```

In the read-only station view (`station-view-sections`, after the "Areas to Work On" column, around line 184):

```tsx
                                            <div className="station-view-col">
                                                <strong>Instructor Notes</strong>
                                                {station.instructorNotes.length > 0
                                                    ? <ul>{station.instructorNotes.map((n, i) => <li key={i}>{n}</li>)}</ul>
                                                    : <p className="empty-hint">None set</p>}
                                            </div>
```

(Change `.station-view-sections`'s CSS from `grid-template-columns: 1fr 1fr` to `1fr 1fr 1fr` since there are now three columns — update the rule near the bottom of the file:)

```css
                .station-view-sections { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 1rem; }
```

In the "Create New Station" form (after the "Areas to Work On" `form-group`, before the "Create Station" button, around line 222):

```tsx
                        <div className="form-group">
                            <label>Instructor Notes <span className="label-hint">(one per line)</span></label>
                            <textarea
                                className="text-input"
                                value={newStation.instructorNotes}
                                onChange={(e) => setNewStation({ ...newStation, instructorNotes: e.target.value })}
                                rows={5}
                                placeholder="Detailed teaching notes visible to Instructors and Evaluators only"
                            />
                        </div>
```

- [ ] **Step 5: Manual verification**

Run: `cd client && npm run dev` and `cd server && npm run dev` together. Log in as director, go to Admin → Manage Stations, create a station with instructor notes, save, confirm the three-column view shows Criteria / Areas to Work On / Instructor Notes correctly. Edit it, change the notes, save, confirm the update persists after a page reload.

- [ ] **Step 6: Commit**

```bash
git add client/src/components/pages/StationManagement.tsx
git commit -m "StationManagement: add instructorNotes list editor"
```

---

### Task 15: `DirectorOverview.tsx` — per-station role override grid

**Files:**
- Modify: `client/src/components/pages/DirectorOverview.tsx`

**Interfaces:**
- Consumes: `UserManager.isDirector` (Task 8), `UserManager.getUserStationRoles(userId)`/`setStationRole(userId, stationId, role)` (Task 8).

- [ ] **Step 1: Swap the `PermissionManager` import for `UserManager.isDirector`**

Delete line 5 entirely: `import PermissionManager from '@client/stores/PermissionManager';`

Replace line 38:

```tsx
        if (!UserManager.isLoggedIn || !UserManager.isDirector) { nav('/'); return; }
```

- [ ] **Step 2: Add state for the selected user's per-station roles**

Add near the other `useState` declarations (after `selectedUserId`):

```tsx
    const [selectedUserRoles, setSelectedUserRoles] = useState<Array<{ stationId: number; stationName: string; role: StationRole }>>([]);
    const [roleUpdateError, setRoleUpdateError] = useState('');
```

Add the import at the top:

```tsx
import type { StationRole } from '@api/station/StationRole';
```

- [ ] **Step 3: Load roles when a user is selected**

Add a new `useEffect`, after the existing `loadAll`/`startSSE` effect:

```tsx
    useEffect(() => {
        if (!selectedUserId) {
            setSelectedUserRoles([]);
            return;
        }
        UserManager.getUserStationRoles(selectedUserId).then(setSelectedUserRoles);
    }, [selectedUserId]);

    const handleRoleChange = async (stationId: number, role: StationRole) => {
        if (!selectedUserId) return;
        setRoleUpdateError('');
        const ok = await UserManager.setStationRole(selectedUserId, stationId, role);
        if (!ok) {
            setRoleUpdateError('Failed to update role. Please try again.');
            return;
        }
        const updated = await UserManager.getUserStationRoles(selectedUserId);
        setSelectedUserRoles(updated);
    };
```

- [ ] **Step 4: Render the radio grid inside the existing `member-detail-card`**

Add this block right after the `member-stations-grid` div closes (after the existing per-station progress chips, still inside `member-detail-card`):

```tsx
                            {roleUpdateError && <div className="message error-message">{roleUpdateError}</div>}
                            <h4 className="role-override-heading">Station Role Overrides</h4>
                            <div className="role-override-list">
                                {selectedUserRoles.map((entry) => (
                                    <div key={entry.stationId} className="role-override-row">
                                        <span className="role-override-station">{entry.stationName}</span>
                                        <div className="role-override-options">
                                            {(['participant', 'instructor', 'evaluator'] as StationRole[]).map((role) => (
                                                <label key={role} className="role-override-option">
                                                    <input
                                                        type="radio"
                                                        name={`role-${entry.stationId}`}
                                                        checked={entry.role === role}
                                                        onChange={() => handleRoleChange(entry.stationId, role)}
                                                    />
                                                    {role.charAt(0).toUpperCase() + role.slice(1)}
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
```

- [ ] **Step 5: Add the CSS**

Add near the other `.member-*` rules in the `<style>` block:

```css
                .role-override-heading { margin: 1.25rem 0 0.6rem; font-size: 0.95rem; }
                .role-override-list { display: flex; flex-direction: column; gap: 0.5rem; }
                .role-override-row { display: flex; justify-content: space-between; align-items: center; padding: 0.5rem 0.75rem; background: white; border: 1px solid #e5e7eb; border-radius: 8px; flex-wrap: wrap; gap: 0.5rem; }
                .role-override-station { font-weight: 600; font-size: 0.85rem; }
                .role-override-options { display: flex; gap: 0.75rem; }
                .role-override-option { display: flex; align-items: center; gap: 0.3rem; font-size: 0.8rem; cursor: pointer; }
```

- [ ] **Step 6: Manual verification**

With `client`/`server` dev servers running, log in as director, go to `/admin/overview`, select a band-member user from "Member Progress". Expected: a "Station Role Overrides" section appears below their progress chips with one row per station, each showing three radio options with the currently-resolved role selected. Click "Instructor" on one station, confirm the request succeeds (no `roleUpdateError`), then have that band member load their `StationDetail` page for that station and confirm they now see the Instructor Notes section (added in Task 13) if that station has notes (added in Task 14). Click "Participant" to clear the override and confirm it reverts.

Also confirm a non-director account gets redirected away from `/admin/overview` (unchanged behavior, now driven by `UserManager.isDirector`).

- [ ] **Step 7: Commit**

```bash
git add client/src/components/pages/DirectorOverview.tsx
git commit -m "DirectorOverview: add per-station role override grid for the selected member"
```

---

### Final verification (after all 15 tasks)

- [ ] Run `cd server && npx tsc --noEmit` — no errors.
- [ ] Run `cd client && npx tsc -b` — no errors (this is the first point at which every call site from the old `PermissionManager`/`UserPermission` should be gone; `grep -rn "PermissionManager\|UserPermission" client/src` should return nothing).
- [ ] Run `npx tsx packages/api/src/station/StationRole.ts` — self-check still passes.
- [ ] Manual smoke test with both dev servers running: register a fresh band-member account, confirm they see `participant` everywhere (no Evaluate/Reference nav items); log in as an existing Director account, confirm the Director nav item, Manage Stations, and Permission Management all still work; use the HomePage test-permission dropdown to switch to "Elevated" and confirm Evaluate/Reference appear without needing real evaluation scores.
