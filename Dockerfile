# Render and other hosts build from the repository root.
# API source lives in ./server

FROM node:22-bookworm-slim

ENV NODE_ENV=production

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends dumb-init \
    && rm -rf /var/lib/apt/lists/*

COPY server/package.json server/package-lock.json ./

RUN npm ci --omit=dev && npm cache clean --force

COPY server/ .

RUN mkdir -p uploads/avatars uploads/covers uploads/chat \
    && chown -R node:node /app

USER node

# Render injects PORT at runtime; index.js reads process.env.PORT
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
    CMD node -e "const p=process.env.PORT||3000;fetch('http://127.0.0.1:'+p+'/api/hello').then((r)=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "index.js"]
