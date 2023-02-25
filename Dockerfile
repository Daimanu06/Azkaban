FROM node:latest

RUN mkdir -p /usr/src/bot

WORKDIR /usr/src/bot

ADD src/ /usr/src/bot/src
COPY package.json /usr/src/bot

RUN npm install

CMD ["node", "src/index.js"]
