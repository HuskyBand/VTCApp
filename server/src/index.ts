import { serve } from '@hono/node-server'
import { Hono } from 'hono'

import { DEFAULT_BASE_API_PORT, DEFAULT_BASE_API_URL } from '@api/Constants';
import { cors } from 'hono/cors';
import configureRoutes, { DB_PATH } from './configureRoutes';
import { logger } from 'hono/logger';
import { Database } from './database';
import { env } from 'process';

let hostname = env.HOSTNAME ?? DEFAULT_BASE_API_URL;
let port = Number.parseInt(env.PORT ?? DEFAULT_BASE_API_PORT);

const db = new Database(DB_PATH);

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
    port: port
}, (info) => {
    console.log(`Server is running on ${hostname}:${info.port}`);
});