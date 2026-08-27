# Build from the REPO ROOT, not this directory:
#   docker build -f server/Dockerfile -t serendib-api .
#
# The API imports shared/ by relative path (../../../shared/...), so the
# image needs that folder copied in alongside server/, preserving the same
# sibling layout the source expects on disk. A build context of just
# server/ would not have access to ../shared at all.

FROM node:24-alpine

# node:*-alpine ships with alpine OS packages and a bundled npm CLI that
# both drift out of date relative to the image tag's build date — CI's
# Trivy scan (ci.yml) gates on CRITICAL/HIGH CVEs in both, and this app
# never invokes `npm` at runtime (CMD is `node src/index.ts`), so patching
# both here is pure risk reduction with nothing depending on the old
# versions.
RUN apk upgrade --no-cache && npm install -g npm@latest

WORKDIR /app

# Install with only server/'s manifests first, so this layer caches across
# rebuilds that only touch source, not dependencies.
COPY server/package.json server/package-lock.json ./server/
RUN npm --prefix server ci --omit=dev

COPY shared ./shared
COPY server/src ./server/src
COPY server/tsconfig.json ./server/

WORKDIR /app/server

# Node runs this TypeScript directly (type-stripping, no build step) — see
# server/README.md. There is nothing to compile here.
ENV NODE_ENV=production
EXPOSE 4000

CMD ["node", "src/index.ts"]
