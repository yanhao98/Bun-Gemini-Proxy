FROM oven/bun:1.2.12 AS build

WORKDIR /app

# Cache packages installation
COPY package.json package.json
COPY bun.lock bun.lock

RUN bun install

COPY ./src ./src
COPY tsconfig.json .
COPY bunfig.toml bunfig.toml

ENV NODE_ENV=production

RUN bun build \
	--compile \
	--minify-whitespace \
	--minify-syntax \
	--target bun \
	--outfile build/server \
	./src/server.ts

FROM gcr.io/distroless/base

WORKDIR /app

COPY --from=build /app/build/server server

ENV NODE_ENV=production
ENV TZ=Asia/Shanghai

CMD ["./server"]

EXPOSE 7860/tcp