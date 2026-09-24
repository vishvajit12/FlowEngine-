# Stage 1: build the static Vite bundle
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# Vite env vars are baked in at BUILD time, not read at container
# startup -- and since this bundle runs in the user's browser, not
# inside Docker's network, this must be a URL the browser can actually
# reach (e.g. http://localhost:5000/api for local docker-compose use),
# never an internal Docker service name like http://api:5000.
ARG VITE_API_URL=http://localhost:5000/api
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build


# Stage 2: serve the built assets with nginx -- the final image doesn't
# carry node_modules or the Vite toolchain at all, just static files.
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
