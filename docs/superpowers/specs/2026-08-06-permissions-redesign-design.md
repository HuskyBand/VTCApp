# Permissions Redesign — Design

## Problem

The current permission model conflates two independent concepts into one flat client-side enum (`UserPermission`: `BandMember`, `Elevated`, `Evaluator`, `Instructor`, `DrJahlas`):

- A **global, admin-assigned tier** stored on the user (`PermFlags`: `IsBandMember`/`IsLeadership`/`IsAssistant`/`IsDirector`).
- A **per-station capability** that should depend on how a band member has scored at each station, not on their global tier.

Because `UserPermission` treats these as one ladder, `Instructor` has no real path to being set — it's only reachable through a client-only QA override (`X-Test-Permission`), never through actual permission assignment. Meanwhile `canSubmitEvaluation` (`server/src/configureRoutes.ts:102-119`) already computes something close to the per-station distinction (`canTeach` / `canEvaluate`) but only as a submit-time boolean gate, never surfaced as a role.

## Goals

- Two independent, correctly-scoped permission axes: a global tier and a per-station role.
- Directors and Elevated users (Leadership + TAs, merged) get full per-station capability everywhere, without going through score computation.
- Regular band members get a per-station role — Participant, Instructor, or Evaluator — computed from their evaluation history, with Evaluator being a superset of Instructor's view.
- Directors can manually override a specific user's role at a specific station, regardless of their computed eligibility.
- Retire the unused/confusing parts of the current model (`UserPermission`, `PermissionManager`, the Evaluator/Instructor QA override faking) rather than patching them.

## Non-goals

- Changing the score thresholds or the "next station passed" eligibility rule — kept as-is; may change later once real requirements land.
- Any UI/DB work unrelated to permissions (station queue, notifications, etc.).

## Design

### 1. Global tier (stored)

`PermFlags` (`packages/api/src/user/User.ts`) keeps its current storage values — no DB migration for `users.permFlags`:

```
IsBandMember = 0
IsLeadership = 1   \_ both read as "Elevated"
IsAssistant  = 2   /
IsDirector   = 3
```

`UserManager.isTA` / `isLeadership` (client/src/stores/UserManager.ts:101-116) collapse into a single `isElevated` getter: `(permFlags & LevelMask) === IsLeadership || (permFlags & LevelMask) === IsAssistant`. The two existing call sites (`HomePage.tsx:94`, admin dropdown) update to use it — neither needs the TA/Leadership distinction.

Director's admin permission dropdown (`PermissionManagementPage.tsx`) collapses from 4 options to 3: Band Member / Elevated / Director. Selecting "Elevated" always writes a single normalized raw value (`IsLeadership` = 1); `IsAssistant` (2) becomes a legacy value nothing writes going forward (existing users at 2 still read correctly as Elevated via `isElevated`).

### 2. Per-station role (computed, with override)

New type, not stored directly on the user:

```ts
type StationRole = 'participant' | 'instructor' | 'evaluator';
```

Resolved per (user, station) in this order:

1. **Global short-circuit** — if `isDirector` or `isElevated`, role is `'evaluator'` everywhere. No further lookup.
2. **Director override** — if a `station_role_overrides` row exists for (user, station), use its `role`. Skips score computation entirely.
3. **Computed from scores** — fall through to today's logic in `canSubmitEvaluation` (`server/src/configureRoutes.ts:102-119`), reused/renamed as the shared role calculator:
   - `evaluator` if `currentMastery && nextPassed` (score ≥ 80 at this station, next station passed)
   - `instructor` if `(currentPassed || currentMastery) && nextPassed` (score ≥ 50 at this station, next station passed)
   - `participant` otherwise

`canSubmitEvaluation` itself becomes `resolveStationRole(userId, stationId) === 'evaluator'` — only Evaluator may submit an evaluation; Instructor may view notes but not submit.

### 3. New table: `station_role_overrides`

```sql
CREATE TABLE station_role_overrides (
    userId INTEGER NOT NULL,
    stationId INTEGER NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('instructor', 'evaluator')),
    PRIMARY KEY (userId, stationId),
    FOREIGN KEY (userId) REFERENCES users(id)
);
```

No `'participant'` value is stored — absence of a row for (user, station) means "fall through to computed role." Setting a user back to Participant means deleting their override row, not writing one.

Director-only endpoints:
- `PUT /users/:userId/stations/:stationId/role` — upsert an override (`{ role: 'instructor' | 'evaluator' }`) or delete it (`{ role: 'participant' }` → deletes the row).
- Enforced server-side with the same `currentUser.permFlags !== PermFlags.IsDirector` check used by the other director-only routes (`configureRoutes.ts:270`, `:354`, `:396`, `:587`, `:600`, `:614`) — not just hidden client-side.

### 4. Retiring `UserPermission` / `PermissionManager`

`client/src/stores/PermissionManager.ts` and the `UserPermission` enum are deleted. Their responsibilities move to:

- `canViewAdmin()` → `UserManager.isDirector`
- `canEditRubric()` → `UserManager.isDirector`
- `canEvaluate()` → per-station `role === 'evaluator'` check (no longer a single global boolean; call sites need a `stationId` in context)
- `getPermissionLabel()` / `getAllPermissions()` → small local label maps where still needed (global-tier dropdown, override radio group)

### 5. `X-Test-Permission` QA override

`isElevatedOverride` (`configureRoutes.ts:100`) drops `'evaluator'` and `'instructor'` from its accepted values — those are no longer meaningful as global fakes. The override still supports faking global tier (`band_member` / `elevated` / `dr_jahlas`) for QA. Testing Instructor/Evaluator views requires a seeded test user with real evaluation scores (or a director override), not a header fake.

`HomePage.tsx`'s test-permission dropdown (`client/src/components/pages/HomePage.tsx:83-124`) shrinks to the 3 global-tier options.

### 6. `instructorNotes` on stations

New column on `stations`, same shape/handling as `criteria` and `feedbackItems` (TEXT column storing a JSON string array):

```sql
ALTER TABLE stations ADD COLUMN instructorNotes TEXT NOT NULL DEFAULT '[]';
```

`Station` type gains `instructorNotes: string[]`. Station management create/update endpoints (director-only, already existing) accept and persist it alongside the other two lists.

**Visibility**: the student-facing station detail endpoint (`GET /stations/:id`) includes `instructorNotes` in its response only when the caller's resolved `role !== 'participant'` for that station — withheld server-side, not just hidden in the UI, so participants can't read it by inspecting network responses.

### 7. UI changes

- **Station detail screen** (student-facing): fetches the station along with the caller's `role`. Shows an "Instructor Notes" section when `role` is `'instructor'` or `'evaluator'`. Shows the evaluation-submission UI only when `role === 'evaluator'`.
- **Station management screen** (director-only): gains a third list editor for `instructorNotes`, matching the existing `criteria`/`feedbackItems` add/remove pattern.
- **Director overview screen** (`PermissionManagementPage.tsx`): global-tier dropdown shrinks to 3 options. Selecting a user expands a panel with one row per station, each row a radio group (Participant / Instructor / Evaluator) reflecting/writing that user's resolved role — bypassing the override endpoint above. This expand panel and the underlying endpoint are both director-only.

## Data flow

```
Director sets override
  → PUT /users/:id/stations/:sid/role (director-only, checked server-side)
  → station_role_overrides upserted/deleted

Band member opens a station
  → GET /stations/:id
  → server resolves role (global short-circuit → override → computed from scores)
  → response includes instructorNotes only if role != participant
  → client renders Instructor Notes / Evaluate UI based on role in response
```

## Error handling

- Override endpoint: 403 if caller isn't Director; 400 if `role` isn't one of the three valid values; deleting a non-existent override is a no-op success (idempotent).
- Station detail endpoint: unauthenticated/unknown user resolves to `'participant'` (existing "fail closed" pattern used elsewhere in `configureRoutes.ts`).

## Testing

- Server: unit-level coverage of role resolution order (global short-circuit > override > computed), and that `instructorNotes` is withheld for participants and present for instructor/evaluator.
- Server: director-only enforcement on the override endpoint (403 for non-directors, including the QA override no longer being able to fake into it since evaluator/instructor faking is removed).
- Client: station detail renders Instructor Notes for instructor/evaluator roles and not participant; evaluation UI gated to evaluator only.
- Manual: director overview panel — set/clear an override for a real user, confirm the target user's station detail view reflects it immediately.
