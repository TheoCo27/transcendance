FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

RUN npm ci \
	&& mkdir -p node_modules \
	&& sha256sum package-lock.json | awk '{print $1}' > node_modules/.package-lock.sha256

COPY . .

EXPOSE 3000

CMD ["npm", "run", "start:docker"]
