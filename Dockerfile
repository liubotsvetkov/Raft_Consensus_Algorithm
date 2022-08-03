FROM node:14-alpine

WORKDIR /usr/src/app

COPY . .

RUN npm install

ENTRYPOINT ["node", "./src/index.js"]