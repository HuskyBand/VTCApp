import { serve } from '@hono/node-server'
import { Hono } from 'hono'

import { DEFAULT_BASE_API_PORT } from '@api/Constants';

// TODO: Add token-based authentication somewhere in this project.

// TODO: Database management somewhere in this project.

// TODO: Configure this more.
const app = new Hono();

// Defines a GET handler for `/`.
app.get('/', (c) => {
    return c.json({
        message: "Look this is running !!"
    });
});

// Starts the server.
serve({
    fetch: app.fetch,
    port: DEFAULT_BASE_API_PORT
}, (info) => {
    console.log(`Server is running on http://localhost:${info.port}`);
});
