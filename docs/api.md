# API

## Health check

`GET /api/health`

Returns the current status of the scheduler API.

Example response:

```json
{
  "status": "UP",
  "service": "distributed-job-scheduler",
  "message": "Backend is running successfully"
}
