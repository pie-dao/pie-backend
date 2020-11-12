FROM node:13-alpine

RUN mkdir -p /usr/src/app

WORKDIR /usr/src/app

COPY . .
RUN npm install
RUN npm build

EXPOSE 3000
CMD node ./dist/index.js
