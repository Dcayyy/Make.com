FROM node:16-alpine
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install --production
COPY . .
ENV NODE_PATH=/usr/src/app/node_modules
EXPOSE 3000
CMD ["node", "app/server.js"]
