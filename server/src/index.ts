import { serve } from '@hono/node-server'
import { Hono, type ExecutionContext } from 'hono'

import { DEFAULT_BASE_API_PORT } from '@api/Constants';
import { cors } from 'hono/cors';
import type { BlankEnv, BlankSchema } from 'hono/types';

// TODO: Add token-based authentication somewhere in this project.

// TODO: Database management somewhere in this project.

// TODO: Configure this more.
let v1 = new Hono<BlankEnv, BlankSchema, "/v1/">();

v1.use(cors());

// Defines a GET handler for `/`.
v1.get('/', (c) => {
    return c.json({
        message: "Look this is running !!"
    });
});

v1.get('/auth/logout', (c) => {
    return c.text("Logged out successfully.");
});

const app = new Hono(v1);

app.use(cors());

function loggedFetch(request: Request, Env?: {}, executionCtx?: ExecutionContext): Response | Promise<Response> {
    console.info(request);
    return app.fetch(request, Env, executionCtx);
}

// Starts the server.
serve({
    fetch: loggedFetch,
    port: DEFAULT_BASE_API_PORT
}, (info) => {
    console.log(`Server is running on http://localhost:${info.port}`);
});
