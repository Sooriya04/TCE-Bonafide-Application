FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY shared ./shared
COPY services/dev-service ./services/dev-service
EXPOSE 3003
CMD ["node", "services/dev-service/server.js"]
