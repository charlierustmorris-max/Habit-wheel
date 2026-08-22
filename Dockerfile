# Habit Wheel is static: no build step, nothing to compile.
# Caddy just needs to hand the files over with the right headers.
FROM caddy:2-alpine

COPY Caddyfile /etc/caddy/Caddyfile
COPY . /srv

# Fail the build rather than the deploy if the config is malformed.
RUN caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile

EXPOSE 8080
CMD ["caddy", "run", "--config", "/etc/caddy/Caddyfile", "--adapter", "caddyfile"]
