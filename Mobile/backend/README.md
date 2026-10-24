# Mobile backend compatibility launcher

The canonical API and MongoDB configuration are in the repository's `backend/` directory. This folder is retained for older mobile deployment paths; its server entry point forwards to that shared backend and does not open a separate database connection.

For local development, configure `backend/.env` and run the backend from the repository's `backend/` directory. If starting from this folder, `npm start` delegates to the same server and loads the same `backend/.env`. For deployments, use `backend/` as the project root and configure its required environment variables there.
