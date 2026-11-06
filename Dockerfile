FROM node:22-alpine AS web-build
WORKDIR /build/web
COPY web/package.json ./
RUN npm install --no-audit --no-fund
COPY web/ ./
RUN npm run build

FROM node:22-alpine
ENV NODE_ENV=production
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev --no-audit --no-fund
COPY server ./server
COPY --from=web-build /build/web/dist ./web/dist
USER node
EXPOSE 3000
CMD ["node", "server/index.js"]
