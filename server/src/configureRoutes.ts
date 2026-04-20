import type { Hono } from "hono";

export default function configureRoutes(routes: Hono) {
    // Test if the server is alive.
    routes.post('/_health', (c) => {
        return c.json({
            message: "Look this is running !!"
        });
    });
    
    // Test logout endpoint.
    routes.post('/auth/logout', (c) => {
        return c.text("Logged out successfully.", 200);
    });
}