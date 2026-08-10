FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY shared ./shared
COPY services/student-service ./services/student-service
EXPOSE 3001
CMD ["node", "services/student-service/server.js"]
