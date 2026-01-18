# Uses the official Node.js 22 LTS slim image
FROM node:22-slim

LABEL org.opencontainers.image.authors="Édouard Mercier, KoppaSoft"
LABEL description="An image of the Picteus API server and its UI."
LABEL version="0.1.0"

# Installs OpenSSL
RUN apt-get update -y && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/* -rf /tmp/*
# This is required for the Pyton runtime, which is not able to find the CA certificates otherwise
ENV SSL_CERT_FILE=/etc/ssl/certs/ca-certificates.crt

# Copies the prepared files
WORKDIR /app
COPY gulpfile.mjs ./
COPY shared ./shared
WORKDIR /app/server
COPY server/package.json server/package-lock.json server/gulpfile.mjs server/tsconfig.json server/package-pruning.json ./
COPY server/prisma ./prisma
COPY server/src ./src

# Installs the "server" dependencies
RUN npm install --no-save --install-link \
    # Generates and compiles the "server" files \
    && npm run prisma:generate && npm run prisma:fix && npm run compile && cp src/generated/prisma-client/libquery_engine-linux-arm64-openssl-3.0.x.so.node ../build/server/src/generated/prisma-client/ && npm run obfuscate \
    # Installs the server runtime "node_modules" \
    && ./node_modules/.bin/gulp --gulpfile gulpfile.mjs installNodeModulesForDockerfile \
    && cp ../gulpfile.mjs gulpfile.mjs && ./node_modules/.bin/gulp --gulpfile gulpfile.mjs fixCaporalModule --directoryPath ../build/server/node_modules/@caporal/core \
    # Cleans up the unneeded files" \
    && cd .. && rm -rf gulpfile.mjs shared server /root/.npm /root/.cache /tmp/*

# Copies the prepared files
WORKDIR /app/build
COPY electron/build/sdk ./sdk
COPY electron/build/extensions ./extensions
COPY electron/build/web ./web
COPY electron/build/server ./server

ENV apiServerPort=3001
ENV webServerPort=2999
ENV vectorDatabasePort=3002
ENV useSsl=true
ENV requiresApiKeys=false
# The "filesMountPath" environment variable must be set and point to the host's directory path which contains the accessible files

# Exposes the port numbers
EXPOSE $apiServerPort
EXPOSE $webServerPort
EXPOSE $vectorDatabasePort

# Sets the environment variables
ENV NODE_ENV=production
ENV INTERNAL_DIRECTORY_PATH=/app/internal
ENV EXTERNAL_DIRECTORY_PATH=/app/external
ENV FILES_DIRECTORY_PATH=/app/files

# Starts the server
WORKDIR /app
CMD ["sh", "-c", "if [ -z \"$filesMountPath\" ]; then echo \"Error: The 'filesMountPath' environment variable must be set.\" 1>&2; exit 1; fi ; NODE_OPTIONS=\"--max-http-header-size=131072\" REPOSITORY_MAPPING_PATHS=\"$FILES_DIRECTORY_PATH=$filesMountPath\" REFERENCE_DATABASE_FILE_PATH=\"/app/build/server/database.db\" REGULAR_DATABASE_FILE_PATH=\"$EXTERNAL_DIRECTORY_PATH/database.db\" VECTOR_DATABASE_DIRECTORY_PATH=\"$EXTERNAL_DIRECTORY_PATH/chroma\" REPOSITORIES_DIRECTORY_PATH=\"$EXTERNAL_DIRECTORY_PATH/repositories\" SDK_DIRECTORY_PATH=\"./build/sdk\" INSTALLED_EXTENSIONS_DIRECTORY_PATH=\"$INTERNAL_DIRECTORY_PATH/extensions\" MODELS_CACHE_DIRECTORY_PATH=\"$INTERNAL_DIRECTORY_PATH/models\" RUNTIMES_DIRECTORY_PATH=\"$INTERNAL_DIRECTORY_PATH/runtimes\" node ./build/server/src/main.js run --useSsl $useSsl --apiServerPort $apiServerPort --requiresApiKeys $requiresApiKeys --webServerPort $webServerPort --webDirectoryPath /app/build/web --vectorDatabasePort $vectorDatabasePort"]
