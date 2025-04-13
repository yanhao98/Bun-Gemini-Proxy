FROM oven/bun AS build

WORKDIR /app

# Cache packages installation
COPY package.json package.json
COPY bun.lock bun.lock

RUN bun install

COPY ./src ./src
COPY tsconfig.json .

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

CMD ["./server"]

EXPOSE 7860/tcp