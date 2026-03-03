FROM atendai/evolution-api:v2.2.3

USER root

# Install proxychains-ng untuk proxy semua koneksi (termasuk WebSocket)
RUN apk add --no-cache proxychains-ng

# Copy entrypoint yang generate proxychains config dari env vars
COPY entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

# Ensure instances directory is writable by node user
RUN mkdir -p /evolution/instances && chown -R node:node /evolution/instances

USER node
WORKDIR /evolution

ENTRYPOINT ["/app/entrypoint.sh"]
