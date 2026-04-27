import sqlite3 from 'sqlite3';
import bcrypt from 'bcryptjs';
import type { User } from '@api/user/User';

const sqlite = sqlite3.verbose();

export type Evaluation = {
    id?: number;
    userId: number;
    evaluatorId: number;
    stationId: number;
    score?: number;
    comments?: string;
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
                createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (userId) REFERENCES users(id),
                FOREIGN KEY (evaluatorId) REFERENCES users(id)
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
    }): Promise<{ id: number }> {
        return new Promise((resolve, reject) => {
            const sql = `
                INSERT INTO evaluations (userId, evaluatorId, stationId, score, comments)
                VALUES (?, ?, ?, ?, ?)
            `;

            this.db.run(
                sql,
                [
                    evaluation.userId,
                    evaluation.evaluatorId,
                    evaluation.stationId,
                    evaluation.score,
                    evaluation.comments
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
                'SELECT id, userId, evaluatorId, stationId, score, comments, createdAt FROM evaluations WHERE userId = ? ORDER BY createdAt DESC',
                [userId],
                (err, rows) => {
                    if (err) {
                        reject(err);
                        return;
                    }

                    resolve((rows as Evaluation[]) || []);
                }
            );
        });
    }
}
