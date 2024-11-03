FROM node:22 AS base
WORKDIR /app

FROM base AS development

COPY package.json ./
COPY yarn.lock ./
RUN ls -la
RUN yarn install --production=true
RUN cp -R node_modules /tmp/node_modules
RUN yarn install
COPY . .

FROM development AS builder
RUN yarn run build

FROM node:22-alpine AS production
COPY --from=builder /tmp/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./
RUN ls -la

ARG MONGO_DB_URL
ARG PORT


# set environmental variables
ENV MONGO_DB_URL=$MONGO_DB_URL
ENV PORT=$PORT

EXPOSE 3000

CMD ["npm", "run", "start:prod"]


