import { serve } from '@hono/node-server'
import { Hono, type ExecutionContext } from 'hono'

import { DEFAULT_BASE_API_PORT } from '@api/Constants';
import { cors } from 'hono/cors';
import configureRoutes from './configureRoutes';
import { logger } from 'hono/logger';

// TODO: Add token-based authentication somewhere in this project.

// TODO: Database management somewhere in this project.

// TODO: Configure this more.
let routes = new Hono();

routes.use(cors());

configureRoutes(routes);

const app = new Hono();
app.route('/', routes);
app.route('/v1', routes);

app.use(logger());
app.use(cors());
app.notFound((ctx) => {
    return ctx.json({
        // TODO: Change this based on path..?
        message: "It's go big or go home... and you couldn't go big.",
    }, 404);
});
app.onError((err, ctx) => {
    console.error(err);
    return ctx.text("An internal server error occurred. Please report this immediately.", 500);
});

// Starts the server.
serve({
    fetch: app.fetch,
    port: DEFAULT_BASE_API_PORT
}, (info) => {
    console.log(`Server is running on http://localhost:${info.port}`);
});
