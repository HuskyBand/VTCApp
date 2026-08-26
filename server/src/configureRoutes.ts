import type { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';
import jwt from 'jsonwebtoken';
import { Database } from './database';
import type { User } from '@api/user/User';
import { PermFlags } from '@api/user/User';
import type { LoginPayload, RegisterPayload, LoginResponse } from '@api/auth/Login';
import { resolveStationRole } from './stationRole';
import { join } from 'path';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// NOTE: Default path should be in the root directory so it can be accessed by the CLI in testing.
const DEFAULT_DB_PATH = "../";
export const DB_PATH = join(process.env.DB_PATH ?? DEFAULT_DB_PATH, 'vtc.db');

// SSE broadcast: maps userId -> send function (null userId = broadcast to all)
const sseClients = new Map<number, Set<(data: string) => void>>();

function pushSSE(userId: number | null, data: object) {
    const payload = JSON.stringify(data);
    if (userId === null) {
        // Broadcast to everyone
        sseClients.forEach((clients) => clients.forEach((send) => send(payload)));
    } else {
        sseClients.get(userId)?.forEach((send) => send(payload));
    }
}

export default function configureRoutes(routes: Hono, db: Database) {
    routes.get('/_health', (c) => {
        return c.text("Everything... seems to be in order", 200);
    });

    routes.post('/auth/register', async (c) => {
        try {
            const body = await c.req.json() as RegisterPayload;
            const perms = await db.getPermissionForRegistrationCode(body.registerCode);
            var permFlags: PermFlags;

            switch (perms) {
                case 'member':
                    permFlags = PermFlags.IsBandMember;
                    break;
                case 'leadership':
                    permFlags = PermFlags.IsLeadership;
                    break;
                case 'assistant':
                    permFlags = PermFlags.IsAssistant;
                    break;
                case 'director':
                    permFlags = PermFlags.IsDirector;
                    break;
                default: // Should catch any cases where `perms` does not match the spec for some reason.
                    return c.json({ error: 'Unable to register; invalid registration code.' }, 400);
            }

            const user = await db.createUser({
                username: body.username,
                password: body.password,
                email: body.email,
                firstName: body.firstName,
                lastName: body.lastName,
                instrument: body.instrument,
                permFlags: permFlags
            });

            // NOTE: Should not be exactly 24h since users could get logged out mid-session the next day.
            const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '72h' });
            return c.json({ token, user } as LoginResponse);
        } catch (error) {
            if (error instanceof Error) {
                console.error(error);

                if (error.message.includes('UNIQUE constraint failed')) {
                    return c.json({ error: 'Unable to register; email or username is already in use.' }, 400);
                }
            }
            
            return c.json({ error: 'Registration failed.' }, 400);
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

    const canSubmitEvaluation = async (currentUserId: number, stationId: number): Promise<boolean> => {
        const currentUser = await db.getUserById(currentUserId);
        if (!currentUser) {
            return false;
        }

        const role = await resolveStationRole(db, currentUser, stationId);
        return role === 'evaluator';
    };

    const notifyFirstInQueue = async (stationId: number, senderId: number, senderName: string) => {
        const queue = await db.getQueueForStation(stationId);
        if (!queue.length) {
            return;
        }

        const station = await db.getStationById(stationId);
        if (!station) {
            return;
        }

        const first = queue[0];
        await db.createNotification({
            title: `You're first in line for ${station.name}`,
            message: `You are now first in the queue for ${station.name}. Please be ready for evaluation.`,
            senderId,
            senderName,
            recipientId: first.userId,
            category: 'queue'
        });
    };

    const buildOverview = async () => {
        const users = await db.getAllUsers();
        const evaluations = await db.getAllEvaluations();
        const allStations = await db.getAllStations();

        let memberCount = 0;
        users.forEach((u) => {
            // TODO: Should be masked with LevelMask if we add more flags.
            if (u.permFlags === PermFlags.IsBandMember) ++memberCount;
        })

        const latestByUserStation = new Map<string, { score?: number }>();
        evaluations.forEach((evaluation) => {
            const key = `${evaluation.userId}:${evaluation.stationId}`;
            if (!latestByUserStation.has(key)) {
                latestByUserStation.set(key, { score: evaluation.score });
            }
        });

        const stations = await Promise.all(allStations.map(async (station) => {
            const stationId = station.id!;
            let mastery = 0;
            let proficient = 0;
            let developing = 0;
            let novice = 0;
            let notStarted = 0;
            let evaluatorCount = 0;

            await Promise.all(users.map(async (user) => {
                const key = `${user.id}:${stationId}`;
                const latest = latestByUserStation.get(key);
                
                // TODO: Should be masked with LevelMask if we add more flags.
                if (user.permFlags === PermFlags.IsBandMember) {
                    if (!latest || latest.score === null || latest.score === undefined) {
                        notStarted += 1;
                    } else if (latest.score >= 90) {
                        mastery += 1;
                    } else if (latest.score >= 60) {
                        proficient += 1;
                    } else if (latest.score >= 30) {
                        developing += 1;
                    } else {
                        novice += 1;
                    }
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
                novice,
                notStarted,
                evaluatorCount,
                totalUsers: memberCount
            };
        }));

        const notifications = await db.getNotificationsForUser(0, true);

        const usersById = new Map(users.map((u) => [u.id, u]));
        const stationsById = new Map(allStations.map((s) => [s.id, s]));
        const activity = evaluations.slice(0, 25).map((evaluation) => {
            const evaluator = usersById.get(evaluation.evaluatorId);
            const evaluated = usersById.get(evaluation.userId);
            const station = stationsById.get(evaluation.stationId);
            return {
                id: evaluation.id,
                evaluatorName: evaluator ? `${evaluator.firstName} ${evaluator.lastName}` : 'Unknown',
                evaluatedName: evaluated ? `${evaluated.firstName} ${evaluated.lastName}` : 'Unknown',
                stationName: station?.name ?? `Station ${evaluation.stationId}`,
                score: evaluation.score,
                createdAt: evaluation.createdAt
            };
        });

        return {
            stations,
            activity,
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

    routes.get('/users/:id/name', authMiddleware, async (c) => {
        const userId = (c as any).userId as number;
        const targetUserId = parseInt(c.req.param('id'));
        const currentUser = await db.getUserById(userId);

        if (!currentUser) {
            return c.json({ error: 'Forbidden' }, 403);
        }

        const user = await db.getUserById(targetUserId);

        if (!user) {
            return c.json({ name: "Unknown User" });
        }

        return c.json({ name: `${user.firstName} ${user.lastName}` });
    });


    routes.put('/users/:id/permissions', authMiddleware, async (c) => {
        const userId = (c as any).userId as number;
        const targetUserId = parseInt(c.req.param('id'));
        const currentUser = await db.getUserById(userId);

        // TODO: Should be masked with LevelMask if we add more flags.
        if (!currentUser || currentUser.permFlags !== PermFlags.IsDirector) {
            return c.json({ error: 'Forbidden' }, 403);
        }

        const { permFlags } = await c.req.json() as { permFlags: number };
        await db.updateUser(targetUserId, { permFlags });

        return c.json({ success: true });
    });

    routes.put('/users/:userId/stations/:stationId/role', authMiddleware, async (c) => {
        const currentUserId = (c as any).userId as number;
        const targetUserId = parseInt(c.req.param('userId'));
        const stationId = parseInt(c.req.param('stationId'));
        const currentUser = await db.getUserById(currentUserId);

        // TODO: Should be masked with LevelMask if we add more flags.
        if (!currentUser || currentUser.permFlags !== PermFlags.IsDirector) {
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
        const currentUser = await db.getUserById(currentUserId);
        
        // TODO: Should be masked with LevelMask if we add more flags.
        if (!currentUser || currentUser.permFlags !== PermFlags.IsDirector) {
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

    routes.post('/evaluations', authMiddleware, async (c) => {
        const evaluatorId = (c as any).userId as number;
        const body = await c.req.json() as {
            userId: number;
            stationId: number;
            score?: number;
            comments?: string;
            criteria?: {
                name: string,
                status: string
            }[];
            feedbackItems?: string[];
            overallStatus?: string;
        };

        const currentUser = await db.getUserById(evaluatorId);
        if (!currentUser) {
            return c.json({ error: 'Unauthorized' }, 401);
        }

        const targetLatest = await db.getLatestEvaluationForUserStation(body.userId, body.stationId);
        if (targetLatest && targetLatest.score !== undefined && targetLatest.score !== null && targetLatest.score >= 80) {
            return c.json({ error: 'Target has already reached mastery for this station.' }, 400);
        }

        const eligible = await canSubmitEvaluation(evaluatorId, body.stationId);
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
        const currentUser = await db.getUserById(currentUserId);

        if (!currentUser) {
            return c.json({ error: 'Unauthorized' }, 401);
        }
        
        // TODO: Should be masked with LevelMask if we add more flags.
        const notifications = await db.getNotificationsForUser(currentUserId, currentUser.permFlags === PermFlags.IsDirector);
        return c.json(notifications);
    });

    routes.post('/notifications', authMiddleware, async (c) => {
        const currentUserId = (c as any).userId as number;
        const currentUser = await db.getUserById(currentUserId);
        
        // TODO: Should be masked with LevelMask if we add more flags.
        if (!currentUser || currentUser.permFlags !== PermFlags.IsDirector) {
            return c.json({ error: 'Forbidden' }, 403);
        }

        const body = await c.req.json() as { title: string; message: string };
        const notification = await db.createNotification({
            title: body.title,
            message: body.message,
            senderId: currentUserId,
            senderName: `${currentUser.firstName} ${currentUser.lastName}`,
            category: 'broadcast'
        });

        // Push broadcast to all connected SSE clients
        pushSSE(null, { type: 'notification', title: body.title, message: body.message, senderName: `${currentUser.firstName} ${currentUser.lastName}` });

        return c.json(notification);
    });

    // SSE stream for real-time notifications
    routes.get('/notifications/stream', authMiddleware, (c) => {
        const userId = (c as any).userId as number;
        return streamSSE(c, async (stream) => {
            const send = (data: string) => stream.writeSSE({ data }).catch(() => {});
            if (!sseClients.has(userId)) sseClients.set(userId, new Set());
            sseClients.get(userId)!.add(send);
            stream.onAbort(() => {
                sseClients.get(userId)?.delete(send);
                if (sseClients.get(userId)?.size === 0) sseClients.delete(userId);
            });
            // Keep alive pings
            while (true) {
                await stream.writeSSE({ data: '', event: 'ping' });
                await stream.sleep(25000);
            }
        });
    });

    routes.get('/admin/overview', authMiddleware, async (c) => {
        const currentUserId = (c as any).userId as number;
        const currentUser = await db.getUserById(currentUserId);
        
        // TODO: Should be masked with LevelMask if we add more flags.
        if (!currentUser || currentUser.permFlags !== PermFlags.IsDirector) {
            return c.json({ error: 'Forbidden' }, 403);
        }

        const overview = await buildOverview();
        return c.json(overview);
    });

    routes.get('/evaluations/:userId', authMiddleware, async (c) => {
        const currentUserId = (c as any).userId as number;
        const targetUserId = parseInt(c.req.param('userId'));
        const currentUser = await db.getUserById(currentUserId);
        
        // TODO: Should be masked with LevelMask if we add more flags.
        const canViewAny = currentUser?.permFlags === PermFlags.IsDirector ||
            currentUser?.permFlags === PermFlags.IsAssistant ||
            currentUser?.permFlags === PermFlags.IsLeadership;
        if (currentUserId !== targetUserId && !canViewAny) {
            return c.json({ error: 'Forbidden' }, 403);
        }
        const evaluations = await db.getEvaluationsForUser(targetUserId);
        return c.json(evaluations);
    });

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

        const latestEvaluation = await db.getLatestEvaluationForUserStation(currentUserId, stationId);
        if (latestEvaluation && latestEvaluation.score !== undefined && latestEvaluation.score >= 80) {
            return c.json({ error: 'You have already reached mastery for this station and cannot join its queue.' }, 400);
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
                const station = await db.getStationById(stationId);
                if (!station) {
                    return c.json({ error: 'Could not find station.' }, 404);
                }

                await db.createNotification({
                    title: `You're first in line for ${station.name}`,
                    message: `You are now first in the queue for ${station.name}. Please be ready for evaluation.`,
                    senderId: currentUserId,
                    senderName: `${currentUser.firstName} ${currentUser.lastName}`,
                    recipientId: currentUserId,
                    category: 'queue'
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

        const eligible = await canSubmitEvaluation(currentUserId, stationId);
        if (!eligible) {
            return c.json({ error: 'Forbidden' }, 403);
        }

        const removedEntry = await db.popQueueEntry(stationId);
        if (!removedEntry) {
            return c.json({ error: 'Queue is empty.' }, 404);
        }

        try {
            const notif = {
                title: `It's your turn! — Station ${stationId}`,
                message: `${currentUser.firstName} ${currentUser.lastName} is ready to evaluate you for Station ${stationId}. Head over now!`,
                senderId: currentUserId,
                senderName: `${currentUser.firstName} ${currentUser.lastName}`,
                recipientId: removedEntry.userId,
                category: 'queue' as const
            };
            await db.createNotification(notif);
            // Push real-time to the specific student
            pushSSE(removedEntry.userId, { type: 'notification', title: notif.title, message: notif.message, senderName: notif.senderName });
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
        const currentUser = await db.getUserById(currentUserId);
        
        // TODO: Should be masked with LevelMask if we add more flags.
        if (!currentUser || currentUser.permFlags !== PermFlags.IsDirector) {
            return c.json({ error: 'Forbidden' }, 403);
        }

        const body = await c.req.json() as { name: string; criteria: string[]; feedbackItems?: string[]; instructorNotes?: string[] };
        const station = await db.createStation(body);
        return c.json(station);
    });

    routes.put('/stations/:id', authMiddleware, async (c) => {
        const currentUserId = (c as any).userId as number;
        const currentUser = await db.getUserById(currentUserId);
        
        // TODO: Should be masked with LevelMask if we add more flags.
        if (!currentUser || currentUser.permFlags !== PermFlags.IsDirector) {
            return c.json({ error: 'Forbidden' }, 403);
        }

        const stationId = parseInt(c.req.param('id'));
        const updates = await c.req.json() as { name?: string; criteria?: string[]; feedbackItems?: string[]; instructorNotes?: string[] };
        await db.updateStation(stationId, updates);
        return c.json({ success: true });
    });

    routes.delete('/stations/:id', authMiddleware, async (c) => {
        const currentUserId = (c as any).userId as number;
        const currentUser = await db.getUserById(currentUserId);

        // TODO: Should be masked with LevelMask if we add more flags.
        if (!currentUser || currentUser.permFlags !== PermFlags.IsDirector) {
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