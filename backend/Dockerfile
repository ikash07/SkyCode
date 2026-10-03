FROM node:22-bookworm-slim

WORKDIR /app
ENV NODE_ENV=production

# Install docker client for isolated runner container execution
RUN apt-get update && apt-get install -y --no-install-recommends docker.io && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json* ./
RUN npm install --omit=dev

COPY src ./src

EXPOSE 4000
CMD ["node", "src/index.js"]
