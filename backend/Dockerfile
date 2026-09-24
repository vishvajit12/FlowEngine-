# Single image for both the API (index.js) and the Worker (worker.js) --
# they're the same codebase with different entry points, matching how
# the project actually separates them: two processes, one image,
# selected via docker-compose's `command:` override per service.
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

EXPOSE 5000

# Default command runs the API; docker-compose.yml overrides this to
# `node worker.js` for the worker service.
CMD ["node", "index.js"]
