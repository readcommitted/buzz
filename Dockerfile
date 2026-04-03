FROM nginx:alpine

# Copy static assets
COPY --chown=nginx:nginx . /usr/share/nginx/html

# Replace default nginx config to run on unprivileged port
# and write temp files to /tmp (which we'll mount as tmpfs)
COPY --chown=nginx:nginx nginx.conf /etc/nginx/nginx.conf

# Switch to non-root
USER nginx

EXPOSE 8080