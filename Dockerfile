FROM node:argon

RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

RUN npm install -g bower
RUN npm install -g polymer-cli

COPY package.json /usr/src/app
RUN npm install

COPY . /usr/src/app
RUN bower install

RUN cd /usr/src/app/src/public && polymer build

EXPOSE 3000

CMD [ "npm", "run", "production" ]