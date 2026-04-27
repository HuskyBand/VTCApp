import { serve } from '@hono/node-server'
import { Hono } from 'hono'

import { DEFAULT_BASE_API_PORT } from '@api/Constants';
import { cors } from 'hono/cors';
import configureRoutes from './configureRoutes';
import { logger } from 'hono/logger';
import { Database } from './database';

const db = new Database();

let routes = new Hono();

routes.use(cors());

configureRoutes(routes, db);

const app = new Hono();
app.route('/', routes);
app.route('/v1', routes);

app.use(logger());
app.use(cors());
app.notFound((ctx) => {
    return ctx.json({
        message: "It's go big or go home... and you couldn't go big.",
    }, 404);
});
app.onError((err, ctx) => {
    console.error(err);
    return ctx.text("An internal server error occurred. Please report this immediately.", 500);
});

serve({
    fetch: app.fetch,
    port: DEFAULT_BASE_API_PORT
}, (info) => {
    console.log(`Server is running on http://localhost:${info.port}`);
});
