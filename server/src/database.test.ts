import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { Database } from './database';
import { mkdtempSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

let tempDir = '';
let db: Database;

beforeEach(async () => {
    tempDir = mkdtempSync(join(tmpdir(), 'vtcapp-server-test-'));
    let dbPath = join(tempDir, 'test.db');
    db = new Database(dbPath);
    await db.ready();
});

afterEach(async () => {
    await db.ready();
    await db.close();
    rmSync(tempDir, { recursive: true, force: true });
});

describe("database", () => {
    it("generates registration codes in correct order", async () => {
        let codes = await db.getAllRegistrationCodes();
        expect(codes.length, "Initial state should have no codes").toBe(0);

        await db.generateRegistrationCodes();
        codes = await db.getAllRegistrationCodes();
        expect(codes.length, "There should be 4 unique codes").toBe(4);

        expect(codes[0].perm, "First code should be member code").toBe('member');
        expect(codes[1].perm, "Second code should be leadership code").toBe('leadership');
        expect(codes[2].perm, "Third code should be TA code").toBe('assistant');
        expect(codes[3].perm, "Fourth code should be director code").toBe('director');
    });

    it("gets permission for registration code", async () => {
        await db.generateRegistrationCodes();

        let codes = await db.getAllRegistrationCodes();

        for (let i = 0; i < codes.length; ++i) {
            let perm = await db.getPermissionForRegistrationCode(codes[i].code);

            expect(perm, `${codes[i].perm} code "${codes[i].code}" should match`).toBe(perm);
        }
    });
});