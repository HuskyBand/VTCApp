import sqlite3 from 'sqlite3';
import bcrypt from 'bcryptjs';
import type { User } from '@api/user/User';

const sqlite = sqlite3.verbose();

export type Station = {
    id?: number;
    name: string;
    criteria: string[];
    feedbackItems: string[];
    instructorNotes: string[];
    createdAt?: string;
};

export type Notification = {
    id?: number;
    title: string;
    message: string;
    senderId: number;
    senderName: string;
    recipientId?: number | null;
    createdAt?: string;
};

export type QueueEntry = {
    id?: number;
    stationId: number;
    userId: number;
    requestedAt?: string;
    status?: string;
};

export type Evaluation = {
    id?: number;
    userId: number;
    evaluatorId: number;
    stationId: number;
    score?: number;
    comments?: string;
    criteria?: string[];
    createdAt?: string;
};

export class Database {
    private db: sqlite3.Database;

    constructor(dbPath: string = './vtc.db') {
        this.db = new sqlite.Database(dbPath);
        this.initTables();
    }

    private initTables(): void {
        this.db.run(`
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                email TEXT UNIQUE NOT NULL,
                firstName TEXT NOT NULL,
                lastName TEXT NOT NULL,
                instrument TEXT NOT NULL,
                permFlags INTEGER NOT NULL DEFAULT 0,
                passwordHash TEXT NOT NULL
            )
        `);

        this.db.run(`
            CREATE TABLE IF NOT EXISTS evaluations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                userId INTEGER NOT NULL,
                evaluatorId INTEGER NOT NULL,
                stationId INTEGER NOT NULL,
                score INTEGER,
                comments TEXT,
                criteria TEXT,
                createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (userId) REFERENCES users(id),
                FOREIGN KEY (evaluatorId) REFERENCES users(id)
            )
        `);

        this.db.all('PRAGMA table_info(evaluations)', [], (err, rows: any[]) => {
            if (!err && Array.isArray(rows) && !rows.some((row) => row.name === 'criteria')) {
                this.db.run('ALTER TABLE evaluations ADD COLUMN criteria TEXT');
            }
        });

        this.db.all('PRAGMA table_info(notifications)', [], (err, rows: any[]) => {
            if (!err && Array.isArray(rows) && !rows.some((row) => row.name === 'recipientId')) {
                this.db.run('ALTER TABLE notifications ADD COLUMN recipientId INTEGER');
            }
            if (!err && Array.isArray(rows) && !rows.some((row) => row.name === 'category')) {
                this.db.run("ALTER TABLE notifications ADD COLUMN category TEXT NOT NULL DEFAULT 'general'");
            }
        });

        this.db.all('PRAGMA table_info(stations)', [], (err, rows: any[]) => {
            if (!err && Array.isArray(rows) && !rows.some((row) => row.name === 'feedbackItems')) {
                this.db.run("ALTER TABLE stations ADD COLUMN feedbackItems TEXT NOT NULL DEFAULT '[]'");
            }
            if (!err && Array.isArray(rows) && !rows.some((row) => row.name === 'instructorNotes')) {
                this.db.run("ALTER TABLE stations ADD COLUMN instructorNotes TEXT NOT NULL DEFAULT '[]'");
            }
        });

        this.db.run(`
            CREATE TABLE IF NOT EXISTS stations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                criteria TEXT NOT NULL, -- JSON array of criteria
                feedbackItems TEXT NOT NULL DEFAULT '[]',
                instructorNotes TEXT NOT NULL DEFAULT '[]',
                createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        this.db.run(`
            CREATE TABLE IF NOT EXISTS notifications (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                message TEXT NOT NULL,
                senderId INTEGER NOT NULL,
                senderName TEXT NOT NULL,
                recipientId INTEGER,
                category TEXT NOT NULL DEFAULT 'general',
                createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (senderId) REFERENCES users(id),
                FOREIGN KEY (recipientId) REFERENCES users(id)
            )
        `);

        this.db.run(`
            CREATE TABLE IF NOT EXISTS station_queue (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                stationId INTEGER NOT NULL,
                userId INTEGER NOT NULL,
                requestedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                status TEXT NOT NULL DEFAULT 'waiting',
                FOREIGN KEY (stationId) REFERENCES stations(id),
                FOREIGN KEY (userId) REFERENCES users(id),
                UNIQUE (stationId, userId)
            )
        `);

        this.db.run(`
            CREATE TABLE IF NOT EXISTS station_role_overrides (
                userId INTEGER NOT NULL,
                stationId INTEGER NOT NULL,
                role TEXT NOT NULL CHECK(role IN ('instructor', 'evaluator')),
                PRIMARY KEY (userId, stationId),
                FOREIGN KEY (userId) REFERENCES users(id)
            )
        `);
    }

    async createUser(user: Omit<User, 'id'> & { password: string }): Promise<User & { id: number }> {
        const passwordHash = await bcrypt.hash(user.password, 10);

        return new Promise((resolve, reject) => {
            const sql = `
                INSERT INTO users (username, email, firstName, lastName, instrument, permFlags, passwordHash)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `;

            this.db.run(sql, [
                user.username,
                user.email,
                user.firstName,
                user.lastName,
                user.instrument,
                user.permFlags,
                passwordHash
            ], function(err) {
                if (err) {
                    reject(err);
                    return;
                }

                const createdUser: User & { id: number } = {
                    id: this.lastID,
                    username: user.username,
                    email: user.email,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    instrument: user.instrument,
                    permFlags: user.permFlags
                };

                resolve(createdUser);
            });
        });
    }

    getUserByUsername(username: string): Promise<(User & { id: number; passwordHash: string }) | null> {
        return new Promise((resolve, reject) => {
            this.db.get('SELECT * FROM users WHERE username = ?', [username], (err, row) => {
                if (err) {
                    reject(err);
                    return;
                }

                resolve((row as User & { id: number; passwordHash: string }) || null);
            });
        });
    }

    async verifyPassword(username: string, password: string): Promise<boolean> {
        const user = await this.getUserByUsername(username);
        if (!user) return false;
        return bcrypt.compare(password, user.passwordHash);
    }

    getUserById(id: number): Promise<User & { id: number } | null> {
        return new Promise((resolve, reject) => {
            this.db.get(
                'SELECT id, username, email, firstName, lastName, instrument, permFlags FROM users WHERE id = ?',
                [id],
                (err, row) => {
                    if (err) {
                        reject(err);
                        return;
                    }

                    resolve((row as User & { id: number }) || null);
                }
            );
        });
    }

    updateUser(id: number, updates: Partial<User>): Promise<void> {
        return new Promise((resolve, reject) => {
            const fields = Object.keys(updates);
            const values = Object.values(updates);

            if (fields.length === 0) {
                resolve();
                return;
            }

            const setClause = fields.map((field) => `${field} = ?`).join(', ');
            const sql = `UPDATE users SET ${setClause} WHERE id = ?`;

            this.db.run(sql, [...values, id], function(err) {
                if (err) {
                    reject(err);
                    return;
                }

                resolve();
            });
        });
    }

    getAllUsers(): Promise<(User & { id: number })[]> {
        return new Promise((resolve, reject) => {
            this.db.all(
                'SELECT id, username, email, firstName, lastName, instrument, permFlags FROM users',
                [],
                (err, rows) => {
                    if (err) {
                        reject(err);
                        return;
                    }

                    resolve((rows as (User & { id: number })[]) || []);
                }
            );
        });
    }

    createEvaluation(evaluation: {
        userId: number;
        evaluatorId: number;
        stationId: number;
        score?: number;
        comments?: string;
        criteria?: string[];
    }): Promise<{ id: number }> {
        return new Promise((resolve, reject) => {
            const sql = `
                INSERT INTO evaluations (userId, evaluatorId, stationId, score, comments, criteria)
                VALUES (?, ?, ?, ?, ?, ?)
            `;

            this.db.run(
                sql,
                [
                    evaluation.userId,
                    evaluation.evaluatorId,
                    evaluation.stationId,
                    evaluation.score,
                    evaluation.comments,
                    evaluation.criteria ? JSON.stringify(evaluation.criteria) : null
                ],
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

    getEvaluationsForUser(userId: number): Promise<Evaluation[]> {
        return new Promise((resolve, reject) => {
            this.db.all(
                'SELECT id, userId, evaluatorId, stationId, score, comments, criteria, createdAt FROM evaluations WHERE userId = ? ORDER BY createdAt DESC',
                [userId],
                (err, rows) => {
                    if (err) {
                        reject(err);
                        return;
                    }

                    resolve(((rows as any[]) || []).map((row) => ({
                        ...row,
                        criteria: row.criteria ? JSON.parse((row as any).criteria) : []
                    })) as Evaluation[]);
                }
            );
        });
    }

    getLatestEvaluationForUserStation(userId: number, stationId: number): Promise<Evaluation | null> {
        return new Promise((resolve, reject) => {
            this.db.get(
                'SELECT id, userId, evaluatorId, stationId, score, comments, criteria, createdAt FROM evaluations WHERE userId = ? AND stationId = ? ORDER BY createdAt DESC LIMIT 1',
                [userId, stationId],
                (err, row) => {
                    if (err) {
                        reject(err);
                        return;
                    }

                    if (!row) {
                        resolve(null);
                        return;
                    }

                    resolve({
                        ...(row as Evaluation),
                        criteria: (row as any).criteria ? JSON.parse((row as any).criteria) : []
                    });
                }
            );
        });
    }

    getAllEvaluations(): Promise<Evaluation[]> {
        return new Promise((resolve, reject) => {
            this.db.all(
                'SELECT id, userId, evaluatorId, stationId, score, comments, criteria, createdAt FROM evaluations ORDER BY createdAt DESC',
                [],
                (err, rows) => {
                    if (err) {
                        reject(err);
                        return;
                    }

                    resolve(((rows as any[]) || []).map((row) => ({
                        ...row,
                        criteria: row.criteria ? JSON.parse((row as any).criteria) : []
                    })) as Evaluation[]);
                }
            );
        });
    }

    createNotification(notification: { title: string; message: string; senderId: number; senderName: string; recipientId?: number | null; category?: 'general' | 'queue' | 'broadcast' }): Promise<{ id: number }> {
        return new Promise((resolve, reject) => {
            const sql = `
                INSERT INTO notifications (title, message, senderId, senderName, recipientId, category)
                VALUES (?, ?, ?, ?, ?, ?)
            `;

            this.db.run(
                sql,
                [
                    notification.title,
                    notification.message,
                    notification.senderId,
                    notification.senderName,
                    notification.recipientId ?? null,
                    notification.category ?? 'general'
                ],
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

    getNotificationsForUser(userId: number, isDirector: boolean): Promise<Array<{ id: number; title: string; message: string; senderName: string; category: string; createdAt: string }>> {
        return new Promise((resolve, reject) => {
            const sql = isDirector
                ? "SELECT id, title, message, senderName, category, createdAt FROM notifications WHERE category = 'broadcast' ORDER BY id DESC"
                : 'SELECT id, title, message, senderName, category, createdAt FROM notifications WHERE recipientId IS NULL OR recipientId = ? ORDER BY id DESC';
            const params = isDirector ? [] : [userId];

            this.db.all(sql, params, (err, rows) => {
                if (err) {
                    reject(err);
                    return;
                }

                resolve((rows as Array<{ id: number; title: string; message: string; senderName: string; category: string; createdAt: string }>) || []);
            });
        });
    }

    createQueueEntry(stationId: number, userId: number): Promise<QueueEntry> {
        return new Promise((resolve, reject) => {
            const sql = `
                INSERT INTO station_queue (stationId, userId)
                VALUES (?, ?)
            `;

            this.db.run(sql, [stationId, userId], function(err) {
                if (err) {
                    reject(err);
                    return;
                }

                resolve({ id: this.lastID, stationId, userId, status: 'waiting' });
            });
        });
    }

    getQueueForStation(stationId: number): Promise<QueueEntry[]> {
        return new Promise((resolve, reject) => {
            this.db.all(
                'SELECT id, stationId, userId, requestedAt, status FROM station_queue WHERE stationId = ? ORDER BY requestedAt ASC',
                [stationId],
                (err, rows) => {
                    if (err) {
                        reject(err);
                        return;
                    }

                    resolve((rows as QueueEntry[]) || []);
                }
            );
        });
    }

    getQueueEntry(stationId: number, userId: number): Promise<QueueEntry | null> {
        return new Promise((resolve, reject) => {
            this.db.get(
                'SELECT id, stationId, userId, requestedAt, status FROM station_queue WHERE stationId = ? AND userId = ?',
                [stationId, userId],
                (err, row) => {
                    if (err) {
                        reject(err);
                        return;
                    }

                    resolve((row as QueueEntry) || null);
                }
            );
        });
    }

    removeQueueEntry(stationId: number, userId: number): Promise<void> {
        return new Promise((resolve, reject) => {
            this.db.run(
                'DELETE FROM station_queue WHERE stationId = ? AND userId = ?',
                [stationId, userId],
                function(err) {
                    if (err) {
                        reject(err);
                        return;
                    }

                    resolve();
                }
            );
        });
    }

    popQueueEntry(stationId: number): Promise<QueueEntry | null> {
        return new Promise((resolve, reject) => {
            this.db.get(
                'SELECT id, stationId, userId, requestedAt, status FROM station_queue WHERE stationId = ? ORDER BY requestedAt ASC LIMIT 1',
                [stationId],
                (err, row) => {
                    if (err) {
                        reject(err);
                        return;
                    }

                    if (!row) {
                        resolve(null);
                        return;
                    }

                    const entry = row as QueueEntry;
                    this.db.run(
                        'DELETE FROM station_queue WHERE id = ?',
                        [entry.id],
                        function(deleteErr) {
                            if (deleteErr) {
                                reject(deleteErr);
                                return;
                            }

                            resolve(entry);
                        }
                    );
                }
            );
        });
    }

    // Station methods
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

    deleteStation(id: number): Promise<void> {
        return new Promise((resolve, reject) => {
            this.db.run(
                'DELETE FROM stations WHERE id = ?',
                [id],
                function(err) {
                    if (err) {
                        reject(err);
                        return;
                    }

                    resolve();
                }
            );
        });
    }
}
