import type { Hono } from 'hono';
import jwt from 'jsonwebtoken';
import { Database } from './database';
import type { User } from '@api/user/User';
import { PermFlags } from '@api/user/User';
import type { LoginPayload, RegisterPayload, LoginResponse } from '@api/auth/Login';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export default function configureRoutes(routes: Hono, db: Database) {
    routes.post('/_health', (c) => {
        return c.json({ message: 'Look this is running !!' });
    });

    routes.post('/auth/register', async (c) => {
        try {
            const body = await c.req.json() as RegisterPayload;
            const user = await db.createUser({
                username: body.username,
                password: body.password,
                email: body.email,
                firstName: body.firstName,
                lastName: body.lastName,
                instrument: body.instrument,
                permFlags: PermFlags.IsBandMember
            });
            const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '24h' });
            return c.json({ token, user } as LoginResponse);
        } catch (error) {
            return c.json({ error: 'Registration failed' }, 400);
        }
    });

    routes.post('/auth/login', async (c) => {
        try {
            const body = await c.req.json() as LoginPayload;
            const user = await db.getUserByUsername(body.username);
            if (!user) {
                return c.json({ error: 'Invalid credentials' }, 401);
            }
            const valid = await db.verifyPassword(body.username, body.password);
            if (!valid) {
                return c.json({ error: 'Invalid credentials' }, 401);
            }
            const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '24h' });
            return c.json({
                token,
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    instrument: user.instrument,
                    permFlags: user.permFlags
                }
            } as LoginResponse);
        } catch (error) {
            return c.json({ error: 'Login failed' }, 500);
        }
    });

    const authMiddleware = async (c: any, next: any) => {
        const authHeader = c.req.header('Authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return c.json({ error: 'Unauthorized' }, 401);
        }

        const token = authHeader.substring(7);
        try {
            const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
            (c as any).userId = decoded.userId;
            await next();
        } catch (error) {
            return c.json({ error: 'Invalid token' }, 401);
        }
    };

    routes.get('/auth/me', authMiddleware, async (c) => {
        const userId = (c as any).userId as number;
        const user = await db.getUserById(userId);
        if (!user) {
            return c.json({ error: 'User not found' }, 404);
        }
        return c.json(user);
    });

    routes.put('/auth/profile', authMiddleware, async (c) => {
        const userId = (c as any).userId as number;
        const updates = await c.req.json() as Partial<User>;
        delete updates.permFlags;
        delete updates.id;
        await db.updateUser(userId, updates);
        const updatedUser = await db.getUserById(userId);
        return c.json(updatedUser);
    });

    routes.get('/users', authMiddleware, async (c) => {
        const userId = (c as any).userId as number;
        const currentUser = await db.getUserById(userId);
        if (!currentUser) {
            return c.json({ error: 'Unauthorized' }, 401);
        }
        const users = await db.getAllUsers();
        return c.json(users);
    });

    routes.put('/users/:id/permissions', authMiddleware, async (c) => {
        const userId = (c as any).userId as number;
        const targetUserId = parseInt(c.req.param('id'));
        const currentUser = await db.getUserById(userId);
        if (!currentUser || currentUser.permFlags !== PermFlags.IsDirector) {
            return c.json({ error: 'Forbidden' }, 403);
        }
        const { permFlags } = await c.req.json() as { permFlags: number };
        await db.updateUser(targetUserId, { permFlags });
        return c.json({ success: true });
    });

    routes.post('/evaluations', authMiddleware, async (c) => {
        const evaluatorId = (c as any).userId as number;
        const body = await c.req.json() as {
            userId: number;
            stationId: number;
            score?: number;
            comments?: string;
        };
        const evaluation = await db.createEvaluation({
            userId: body.userId,
            evaluatorId,
            stationId: body.stationId,
            score: body.score,
            comments: body.comments
        });
        return c.json(evaluation);
    });

    routes.get('/evaluations/:userId', authMiddleware, async (c) => {
        const currentUserId = (c as any).userId as number;
        const targetUserId = parseInt(c.req.param('userId'));
        const currentUser = await db.getUserById(currentUserId);
        if (currentUserId !== targetUserId && currentUser?.permFlags !== PermFlags.IsDirector) {
            return c.json({ error: 'Forbidden' }, 403);
        }
        const evaluations = await db.getEvaluationsForUser(targetUserId);
        return c.json(evaluations);
    });

    routes.post('/auth/logout', (c) => {
        return c.text('Logged out successfully.', 200);
    });
}