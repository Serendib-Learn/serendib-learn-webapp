# Not what deploys the production site — that's Vercel, which builds the
# Next.js app natively and never touches this file. This exists for running
# the whole stack locally with `docker compose up` (no Node install needed)
# and as a self-hosting fallback if you ever move off Vercel.
#
# Build from the REPO ROOT: docker build -t serendib-web .
# (src/lib/types.ts re-exports ../../shared/, so shared/ has to be in the
# build context alongside this app, the same reason server/Dockerfile does.)

FROM node:24-alpine AS base

FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# NEXT_PUBLIC_* variables are inlined into the client bundle at build time,
# not read at container start — they have to arrive as build args, not as
# `environment:` on the eventual container. See docker-compose.yml.
ARG NEXT_PUBLIC_API_URL=http://localhost:4000
ARG NEXT_PUBLIC_GOOGLE_CLIENT_ID=
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_GOOGLE_CLIENT_ID=$NEXT_PUBLIC_GOOGLE_CLIENT_ID
ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

# `output: "standalone"` (next.config.ts) traces only the files actually
# needed at runtime, instead of shipping the whole node_modules tree.
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

CMD ["node", "server.js"]
