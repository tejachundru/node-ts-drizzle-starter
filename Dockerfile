FROM node:20-alpine AS base
LABEL name="starter"
LABEL maintainer="Teja Chundru"
LABEL version="1.0.0"

# Install dependencies only when needed
FROM base AS deps

RUN apk add --no-cache libc6-compat && \
    apk add --update --no-cache curl py-pip && \
    apk add --no-cache make python3 g++ gcc libgcc libstdc++ && \
    npm install --quiet node-gyp -g

# Installing libvips-dev for sharp Compatibility
RUN apk update && apk add --no-cache build-base gcc autoconf automake zlib-dev libpng-dev nasm bash vips-dev

# Set the Temp Working Directory inside the container
WORKDIR /temp-deps

# copy package json
COPY ["package.json", "yarn.lock", "./"]

RUN yarn install --frozen-lockfile

FROM base AS builder

# Set the Temp Working Directory inside the container
WORKDIR /temp-build

# Set Node memory limit properly
ENV NODE_OPTIONS="--max_old_space_size=4096"

# copy base code
COPY . .

# copy environment
RUN cp .env.docker-production .env

COPY --from=deps /temp-deps/node_modules ./node_modules

# prune devDependencies
RUN yarn build && yarn install --production --ignore-scripts --prefer-offline

# image runner app
FROM base AS runner

# Set the Current Working Directory inside the container
WORKDIR /app

ENV NODE_ENV=production

# Setup Timezone
RUN apk add --no-cache tzdata && \
    apk add --no-cache nano

ENV TZ=Asia/Kolkata

COPY --from=builder /temp-build/node_modules ./node_modules
COPY --from=builder /temp-build/package.json ./package.json
COPY --from=builder /temp-build/dist ./dist
# COPY --from=builder /temp-build/logs ./logs
COPY --from=builder /temp-build/.env ./.env

# This container exposes port 8000 to the outside world
EXPOSE 8000

# Run for production
CMD ["yarn", "serve:production-docker"]
