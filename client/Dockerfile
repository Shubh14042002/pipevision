# Stage 1: Build React app
FROM node:21.7.3 AS builder

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install --silent

COPY . .
RUN npm run build

# Stage 2: Serve with Nginx
FROM nginx:stable-alpine
EXPOSE 80

# Remove default nginx index
RUN rm -rf /usr/share/nginx/html/*

# Copy built React app to Nginx's public folder
COPY --from=builder /usr/src/app/build /usr/share/nginx/html

# Optional: Add custom Nginx config if needed
# COPY nginx.conf /etc/nginx/conf.d/default.conf