# Foundry Atlas API image.
# Build context is the REPO ROOT (the seed reads ../frontend/src/data/graph.json):
#   docker build -f server/Dockerfile -t foundry-atlas-api .
FROM node:22-alpine

ENV NODE_ENV=production
WORKDIR /app/server

# Install production deps first for better layer caching.
COPY server/package.json server/package-lock.json ./
RUN npm ci --omit=dev

# App code.
COPY server/ ./

# The seed snapshot lives in the frontend tree; seed.mjs reads it via
# ../frontend/src/data/graph.json relative to /app/server.
COPY frontend/src/data/graph.json /app/frontend/src/data/graph.json

EXPOSE 4000
CMD ["node", "index.mjs"]
