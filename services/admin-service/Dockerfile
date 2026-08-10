FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY shared/ ./shared/
COPY services/admin-service/ ./services/admin-service/
EXPOSE 3002
CMD ["node", "services/admin-service/server.js"]
