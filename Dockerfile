FROM diddledan/polymer-base

RUN npm install -g bower

RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

COPY package.json /usr/src/app
RUN npm install

COPY . /usr/src/app
RUN bower install --allow-root

RUN cd /usr/src/app/src/public && polymer build

EXPOSE 3000

CMD [ "npm", "run", "production" ]