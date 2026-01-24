# Etap 1: Budowanie Reacta
FROM node:18-alpine as BUILD_IMAGE
WORKDIR /app

# Kopiujemy package.json z głównego katalogu
COPY package*.json ./
RUN npm install

# Kopiujemy resztę plików (dzięki .dockerignore folder server zostanie pominięty!)
COPY . .

# Budujemy aplikację (Vite utworzy folder 'dist')
RUN npm run build

# Etap 2: Serwowanie przez Nginx
FROM nginx:alpine
COPY --from=BUILD_IMAGE /app/dist /usr/share/nginx/html

COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]