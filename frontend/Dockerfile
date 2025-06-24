# frontend/Dockerfile
FROM node:20-alpine as builder

WORKDIR /app

# # Install yarn globally if not present
# RUN npm install -g yarn

# Copy package files
COPY package.json yarn.lock ./

# Install dependencies
RUN yarn install --frozen-lockfile --network-timeout 600000 && \
    yarn cache clean

# Copy source code
COPY . .

# Set build-time environment variables
ARG REACT_APP_API_URL
ARG REACT_APP_SOCKET_URL
ENV REACT_APP_API_URL=$REACT_APP_API_URL
ENV REACT_APP_SOCKET_URL=$REACT_APP_SOCKET_URL

# Build application
RUN yarn build

# Production stage with optimized nginx
FROM nginx:alpine

# Install security updates
RUN apk update && apk upgrade && apk add --no-cache ca-certificates

# Copy built files
COPY --from=builder /app/build /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# # Create nginx user
# RUN addgroup -g 1001 -S nginx && \
#     adduser -S nginx -u 1001 -G nginx

# # Set proper permissions
# RUN chown -R nginx:nginx /usr/share/nginx/html && \
#     chown -R nginx:nginx /var/cache/nginx && \
#     chown -R nginx:nginx /var/log/nginx && \
#     chown -R nginx:nginx /etc/nginx/conf.d

# # Switch to non-root user
# USER nginx

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost/ || exit 1

# Expose port
EXPOSE 8080

# Start nginx
CMD ["nginx", "-g", "daemon off;"]