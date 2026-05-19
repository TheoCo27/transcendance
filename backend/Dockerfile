FROM node:22-alpine

WORKDIR /app

COPY package*.json ./

# Install production + dev deps so `ts-node` and other dev tools are available
# This allows running `npm run seed` inside the running container after `docker compose up`.
RUN npm ci --include=dev

COPY . .

EXPOSE 4000

CMD ["npm", "run", "start:docker"]
