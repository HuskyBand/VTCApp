# VTCApp

A VTC progress tracker for the University of Washington Husky Marching Band.

### How to test:

Run `npm run dev:server` and `npm run dev:client` from the root directory to run both the server and client locally.

## Client (`client`)

The React frontend. Sends HTTP requests to the server.

### How to run:

1. Run `npm run build:client` from the root directory to build the project.
2. Host the resulting site somewhere.

## Server (`server`)

The TypeScript backend. Handles HTTP requests from the client with Hono and manages the database.

### How to run:

1. Run `npm run build:server` from the root directory to build the project.
    - Ensure that Node and Typescript are installed correctly.
2. Run the resulting Node application on the server machine.

## API (`packages/api` )

The TypeScript library used by both the server and client for constructing API requests.