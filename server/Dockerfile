# Build from the REPO ROOT, not this directory:
#   docker build -f server/Dockerfile -t serendib-api .
#
# The API imports shared/ by relative path (../../../shared/...), so the
# image needs that folder copied in alongside server/, preserving the same
# sibling layout the source expects on disk. A build context of just
# server/ would not have access to ../shared at all.

FROM node:24-alpine

# node:*-alpine's OS packages drift out of date relative to the image
# tag's build date — CI's Trivy scan (ci.yml) gates on CRITICAL/HIGH CVEs.
RUN apk upgrade --no-cache

WORKDIR /app

# Install with only server/'s manifests first, so this layer caches across
# rebuilds that only touch source, not dependencies.
COPY server/package.json server/package-lock.json ./server/
RUN npm --prefix server ci --omit=dev

# npm ships bundled inside every node:*-alpine image regardless of whether
# the app uses it — this one only needed it for the `npm ci` above, and
# never invokes it at runtime (CMD is `node src/index.ts`). npm's own
# internal dependencies (tar, ip-address, brace-expansion) lag behind CVE
# fixes independent of `npm install -g npm@latest`, which still ships the
# same vendored versions — deleting it outright is what actually clears
# CI's Trivy gate, not just patching in place.
RUN rm -rf /usr/local/lib/node_modules/npm /usr/local/lib/node_modules/corepack \
  /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack

COPY shared ./shared
COPY server/src ./server/src
COPY server/tsconfig.json ./server/

WORKDIR /app/server

# Node runs this TypeScript directly (type-stripping, no build step) — see
# server/README.md. There is nothing to compile here.
ENV NODE_ENV=production
EXPOSE 4000

CMD ["node", "src/index.ts"]
