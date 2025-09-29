# Serve static files with Nginx
FROM nginx:alpine

# Optional: custom config (recommended for SPAs or pretty defaults)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy your static site into Nginx web root
COPY . /usr/share/nginx/html

EXPOSE 80