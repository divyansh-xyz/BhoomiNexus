FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/

RUN npm install

COPY . .

RUN npm run build
RUN npx prisma generate

FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8000

COPY package*.json ./
COPY --from=builder /app/prisma ./prisma
RUN npm ci --only=production
RUN npx prisma generate

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/src/prompts ./src/prompts

EXPOSE 8000

CMD ["npm", "start"]
