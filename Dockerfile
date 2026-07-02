# Stage 1: Build the React frontend
FROM node:20-alpine AS build
WORKDIR /app/client
COPY client/package.json ./
RUN npm install
COPY client/tsconfig.json client/tsconfig.app.json client/tsconfig.node.json client/vite.config.ts client/index.html ./
COPY client/src/ ./src/
RUN npm run build

# Stage 2: Express runner
FROM node:20-alpine
WORKDIR /app
COPY --from=build /app/client/dist ./dist
COPY server/package.json ./server/
WORKDIR /app/server
RUN npm install --only=production
COPY server/index.js ./
EXPOSE 3001
CMD ["node", "index.js"]
