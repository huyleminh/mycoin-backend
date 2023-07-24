FROM node:18-alpine as build-stage

WORKDIR /app

COPY . .

# Install
RUN npm ci

# Build
RUN npm run build

# Prune
RUN npm prune --production

# Build app stage
FROM node:18-alpine

ENV NODE_ENV=production

WORKDIR /app

RUN mkdir -p ./keys

COPY --from=build-stage /app/package*.json /app/
COPY --from=build-stage /app/dist /app/dist
COPY --from=build-stage /app/node_modules /app/node_modules

CMD ["npm", "start"]
