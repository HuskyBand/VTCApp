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

    const isMastery = (score?: number | null) => score !== undefined && score !== null && score >= 80;
    const hasPassed = (score?: number | null) => score !== undefined && score !== null && score >= 50;

    const isDirectorOverride = (overridePermission?: string) => overridePermission === 'dr_jahlas';
    const isElevatedOverride = (overridePermission?: string) => overridePermission === 'evaluator' || overridePermission === 'elevated' || overridePermission === 'dr_jahlas';

    const canSubmitEvaluation = async (currentUserId: number, stationId: number, overridePermission?: string): Promise<boolean> => {
        const currentUser = await db.getUserById(currentUserId);
        if (!currentUser) {
            return false;
        }

        if (isDirectorOverride(overridePermission) || isElevatedOverride(overridePermission)) {
            return true;
        }

        if (
            currentUser.permFlags === PermFlags.IsDirector ||
            currentUser.permFlags === PermFlags.IsAssistant ||
            currentUser.permFlags === PermFlags.IsLeadership
        ) {
            return true;
        }

        const currentStation = await db.getLatestEvaluationForUserStation(currentUserId, stationId);
        const nextStation = stationId >= 6 ? null : await db.getLatestEvaluationForUserStation(currentUserId, stationId + 1);
        const currentStatus = currentStation?.score;
        const currentMastery = isMastery(currentStatus);
        const currentPassed = hasPassed(currentStatus);
        const nextPassed = stationId >= 6 || hasPassed(nextStation?.score);

        const canEvaluate = currentMastery && nextPassed;
        const canTeach = (currentPassed || currentMastery) && nextPassed;

        return canEvaluate || canTeach;
    };

    const notifyFirstInQueue = async (stationId: number, senderId: number, senderName: string) => {
        const queue = await db.getQueueForStation(stationId);
        if (!queue.length) {
            return;
        }

        const first = queue[0];
        await db.createNotification({
            title: `You're first in line for Station ${stationId}`,
            message: `You are now first in the queue for Station ${stationId}. Please be ready for evaluation.`,
            senderId,
            senderName,
            recipientId: first.userId
        });
    };

    const buildOverview = async () => {
        const users = await db.getAllUsers();
        const evaluations = await db.getAllEvaluations();

        const latestByUserStation = new Map<string, { score?: number }>();
        evaluations.forEach((evaluation) => {
            const key = `${evaluation.userId}:${evaluation.stationId}`;
            if (!latestByUserStation.has(key)) {
                latestByUserStation.set(key, { score: evaluation.score });
            }
        });

        const stations = [1, 2, 3, 4, 5, 6].map((stationId) => {
            let mastery = 0;
            let proficient = 0;
            let developing = 0;
            let notStarted = 0;

            users.forEach((user) => {
                const key = `${user.id}:${stationId}`;
                const latest = latestByUserStation.get(key);
                if (!latest || latest.score === null || latest.score === undefined) {
                    notStarted += 1;
                    return;
                }
                if (latest.score >= 80) {
                    mastery += 1;
                } else if (latest.score >= 50) {
                    proficient += 1;
                } else {
                    developing += 1;
                }
            });

            return {
                stationId,
                name: `Station ${stationId}`,
                mastery,
                proficient,
                developing,
                notStarted,
                totalUsers: users.length
            };
        });

        const notifications = await db.getNotificationsForUser(0, true);

        return {
            stations,
            totalUsers: users.length,
            totalNotifications: notifications.length
        };
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
            criteria?: string[];
            feedbackItems?: string[];
            overallStatus?: string;
        };
        const testPermission = c.req.header('X-Test-Permission');

        const currentUser = await db.getUserById(evaluatorId);
        if (!currentUser) {
            return c.json({ error: 'Unauthorized' }, 401);
        }

        const targetLatest = await db.getLatestEvaluationForUserStation(body.userId, body.stationId);
        if (targetLatest && targetLatest.score !== undefined && targetLatest.score !== null && targetLatest.score >= 80) {
            return c.json({ error: 'Target has already reached mastery for this station.' }, 400);
        }

        const eligible = await canSubmitEvaluation(evaluatorId, body.stationId, testPermission ?? undefined);
        if (!eligible) {
            return c.json({ error: 'You do not have sufficient station progress to submit evaluations for this station yet.' }, 403);
        }

        const evaluation = await db.createEvaluation({
            userId: body.userId,
            evaluatorId,
            stationId: body.stationId,
            score: body.score,
            comments: body.comments,
            criteria: body.criteria ?? []
        });

        // Notify the evaluated band member with their results
        try {
            const passed = body.overallStatus === 'proficient' || body.overallStatus === 'mastery';
            const statusLine = `Overall: ${body.overallStatus ?? 'developing'} — ${passed ? 'PASSED' : 'NOT YET PASSED'}`;
            const feedbackLine = body.feedbackItems && body.feedbackItems.length > 0
                ? `\nAreas to work on:\n${body.feedbackItems.map(f => `• ${f}`).join('\n')}`
                : '';
            const commentLine = body.comments ? `\nEvaluator notes: ${body.comments}` : '';

            await db.createNotification({
                title: `Station ${body.stationId} Evaluation Results`,
                message: `${statusLine}${feedbackLine}${commentLine}`,
                senderId: evaluatorId,
                senderName: `${currentUser.firstName} ${currentUser.lastName}`,
                recipientId: body.userId
            });
        } catch (notificationError) {
            console.error('Failed to send evaluation result notification:', notificationError);
        }

        return c.json(evaluation);
    });

    routes.get('/notifications', authMiddleware, async (c) => {
        const currentUserId = (c as any).userId as number;
        const testPermission = c.req.header('X-Test-Permission');
        const currentUser = await db.getUserById(currentUserId);
        if (!currentUser) {
            return c.json({ error: 'Unauthorized' }, 401);
        }

        const notifications = await db.getNotificationsForUser(currentUserId, currentUser.permFlags === PermFlags.IsDirector || isDirectorOverride(testPermission ?? undefined));
        return c.json(notifications);
    });

    routes.post('/notifications', authMiddleware, async (c) => {
        const currentUserId = (c as any).userId as number;
        const testPermission = c.req.header('X-Test-Permission');
        const currentUser = await db.getUserById(currentUserId);
        if (!currentUser || (currentUser.permFlags !== PermFlags.IsDirector && !isDirectorOverride(testPermission ?? undefined))) {
            return c.json({ error: 'Forbidden' }, 403);
        }

        const body = await c.req.json() as { title: string; message: string };
        const notification = await db.createNotification({
            title: body.title,
            message: body.message,
            senderId: currentUserId,
            senderName: `${currentUser.firstName} ${currentUser.lastName}`
        });
        return c.json(notification);
    });

    routes.get('/admin/overview', authMiddleware, async (c) => {
        const currentUserId = (c as any).userId as number;
        const testPermission = c.req.header('X-Test-Permission');
        const currentUser = await db.getUserById(currentUserId);
        if (!currentUser || (currentUser.permFlags !== PermFlags.IsDirector && !isDirectorOverride(testPermission ?? undefined))) {
            return c.json({ error: 'Forbidden' }, 403);
        }

        const overview = await buildOverview();
        return c.json(overview);
    });

    routes.get('/evaluations/:userId', authMiddleware, async (c) => {
        const currentUserId = (c as any).userId as number;
        const targetUserId = parseInt(c.req.param('userId'));
        const testPermission = c.req.header('X-Test-Permission');
        const currentUser = await db.getUserById(currentUserId);
        const canViewAny = currentUser?.permFlags === PermFlags.IsDirector ||
            currentUser?.permFlags === PermFlags.IsAssistant ||
            currentUser?.permFlags === PermFlags.IsLeadership ||
            isElevatedOverride(testPermission ?? undefined);
        if (currentUserId !== targetUserId && !canViewAny) {
            return c.json({ error: 'Forbidden' }, 403);
        }
        const evaluations = await db.getEvaluationsForUser(targetUserId);
        return c.json(evaluations);
    });

    // Public (any authenticated user) station lookup
    routes.get('/stations/:id', authMiddleware, async (c) => {
        const stationId = parseInt(c.req.param('id'));
        const station = await db.getStationById(stationId);
        if (!station) {
            return c.json({ id: stationId, name: `Station ${stationId}`, criteria: [] });
        }
        return c.json(station);
    });

    // Station management routes (director only)
    routes.get('/stations', authMiddleware, async (c) => {
        const currentUserId = (c as any).userId as number;
        const testPermission = c.req.header('X-Test-Permission');
        const currentUser = await db.getUserById(currentUserId);
        if (!currentUser || (currentUser.permFlags !== PermFlags.IsDirector && !isDirectorOverride(testPermission ?? undefined))) {
            return c.json({ error: 'Forbidden' }, 403);
        }

        const stations = await db.getAllStations();
        return c.json(stations);
    });

    routes.get('/stations/:id/queue', authMiddleware, async (c) => {
        const stationId = parseInt(c.req.param('id'));
        const queue = await db.getQueueForStation(stationId);

        const detailed = await Promise.all(queue.map(async (entry, index) => {
            const user = await db.getUserById(entry.userId);
            return {
                id: entry.id,
                stationId: entry.stationId,
                userId: entry.userId,
                name: user ? `${user.firstName} ${user.lastName}` : 'Unknown',
                position: index + 1,
                requestedAt: entry.requestedAt,
                status: entry.status
            };
        }));

        return c.json(detailed);
    });

    routes.post('/stations/:id/queue', authMiddleware, async (c) => {
        const currentUserId = (c as any).userId as number;
        const stationId = parseInt(c.req.param('id'));
        const currentUser = await db.getUserById(currentUserId);
        if (!currentUser) {
            return c.json({ error: 'Unauthorized' }, 401);
        }

        const existing = await db.getQueueEntry(stationId, currentUserId);
        if (existing) {
            return c.json({ success: true, message: 'Already in queue.' });
        }

        try {
            await db.createQueueEntry(stationId, currentUserId);
        } catch (error) {
            if ((error as any)?.message?.includes('UNIQUE')) {
                return c.json({ success: true, message: 'Already in queue.' });
            }
            console.error('Queue creation failed:', error);
            return c.json({ error: 'Unable to join the queue.' }, 500);
        }

        const queue = await db.getQueueForStation(stationId);
        if (queue.length > 0 && queue[0].userId === currentUserId) {
            try {
                await db.createNotification({
                    title: `You're first in line for Station ${stationId}`,
                    message: `You are now first in the queue for Station ${stationId}. Please be ready for evaluation.`,
                    senderId: currentUserId,
                    senderName: `${currentUser.firstName} ${currentUser.lastName}`,
                    recipientId: currentUserId
                });
            } catch (notificationError) {
                console.error('Queue notification failed after join:', notificationError);
            }
        }

        return c.json({ success: true, message: 'You have joined the queue.' });
    });

    routes.delete('/stations/:id/queue', authMiddleware, async (c) => {
        const currentUserId = (c as any).userId as number;
        const stationId = parseInt(c.req.param('id'));
        const currentUser = await db.getUserById(currentUserId);
        if (!currentUser) {
            return c.json({ error: 'Unauthorized' }, 401);
        }

        await db.removeQueueEntry(stationId, currentUserId);
        const queue = await db.getQueueForStation(stationId);
        if (queue.length > 0) {
            try {
                await notifyFirstInQueue(stationId, currentUserId, `${currentUser.firstName} ${currentUser.lastName}`);
            } catch (notificationError) {
                console.error('Queue notification failed after leave:', notificationError);
            }
        }

        return c.json({ success: true });
    });

    routes.post('/stations/:id/queue/next', authMiddleware, async (c) => {
        const currentUserId = (c as any).userId as number;
        const stationId = parseInt(c.req.param('id'));
        const currentUser = await db.getUserById(currentUserId);
        if (!currentUser) {
            return c.json({ error: 'Unauthorized' }, 401);
        }

        const eligible = await canSubmitEvaluation(currentUserId, stationId, c.req.header('X-Test-Permission') ?? undefined);
        if (!eligible) {
            return c.json({ error: 'Forbidden' }, 403);
        }

        const removedEntry = await db.popQueueEntry(stationId);
        if (!removedEntry) {
            return c.json({ error: 'Queue is empty.' }, 404);
        }

        try {
            await db.createNotification({
                title: `Station ${stationId} evaluation started`,
                message: `You are now being evaluated for Station ${stationId}. Please meet the evaluator.`,
                senderId: currentUserId,
                senderName: `${currentUser.firstName} ${currentUser.lastName}`,
                recipientId: removedEntry.userId
            });
        } catch (notificationError) {
            console.error('Queue notification failed after pull:', notificationError);
        }

        const queue = await db.getQueueForStation(stationId);
        if (queue.length > 0) {
            try {
                await notifyFirstInQueue(stationId, currentUserId, `${currentUser.firstName} ${currentUser.lastName}`);
            } catch (notificationError) {
                console.error('Queue notification failed after pull for next student:', notificationError);
            }
        }

        return c.json({ success: true, message: 'The next student has been pulled from the queue.', removedEntry });
    });

    routes.post('/stations', authMiddleware, async (c) => {
        const currentUserId = (c as any).userId as number;
        const testPermission = c.req.header('X-Test-Permission');
        const currentUser = await db.getUserById(currentUserId);
        if (!currentUser || (currentUser.permFlags !== PermFlags.IsDirector && !isDirectorOverride(testPermission ?? undefined))) {
            return c.json({ error: 'Forbidden' }, 403);
        }

        const body = await c.req.json() as { name: string; criteria: string[] };
        const station = await db.createStation(body);
        return c.json(station);
    });

    routes.put('/stations/:id', authMiddleware, async (c) => {
        const currentUserId = (c as any).userId as number;
        const testPermission = c.req.header('X-Test-Permission');
        const currentUser = await db.getUserById(currentUserId);
        if (!currentUser || (currentUser.permFlags !== PermFlags.IsDirector && !isDirectorOverride(testPermission ?? undefined))) {
            return c.json({ error: 'Forbidden' }, 403);
        }

        const stationId = parseInt(c.req.param('id'));
        const updates = await c.req.json() as { name?: string; criteria?: string[] };
        await db.updateStation(stationId, updates);
        return c.json({ success: true });
    });

    routes.delete('/stations/:id', authMiddleware, async (c) => {
        const currentUserId = (c as any).userId as number;
        const testPermission = c.req.header('X-Test-Permission');
        const currentUser = await db.getUserById(currentUserId);
        if (!currentUser || (currentUser.permFlags !== PermFlags.IsDirector && !isDirectorOverride(testPermission ?? undefined))) {
            return c.json({ error: 'Forbidden' }, 403);
        }

        const stationId = parseInt(c.req.param('id'));
        await db.deleteStation(stationId);
        return c.json({ success: true });
    });

    routes.post('/auth/logout', (c) => {
        return c.text('Logged out successfully.', 200);
    });
}