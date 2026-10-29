
# Distributed Job Scheduler

A full-stack distributed job orchestration platform built with
Go, React, TypeScript, PostgreSQL and Redis.

## Current Features

- Go HTTP API
- Health check endpoint
- React and TypeScript frontend
- Frontend-to-backend connectivity
- Basic service availability handling

## Prerequisites

- Go
- Node.js LTS and npm
- Git

## Run the Backend

From the repository root:

```bash
go run ./backend
```

Health endpoint: http://localhost:8080/api/health

## Run the Frontend

In another terminal:

```bash
cd frontend
npm install
npm run dev
```

## Roadmap

- Job CRUD and PostgreSQL persistence
- Scheduling engine
- Redis-based task dispatch
- Distributed workers
- Retry and recovery mechanisms
- Execution monitoring and workflow visualization
