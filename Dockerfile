FROM diddledan/polymer-base as builder
RUN apk update && apk add git
RUN npm install -g bower
RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app
COPY . /usr/src/app
RUN npm install && \
	cd src/public && \
	bower install --allow-root && \
	polymer build

# FINAL image
FROM node:8-alpine
COPY --from=builder /usr/src/app /usr/src/app
WORKDIR /usr/src/app
EXPOSE 3000
CMD [ "npm", "run", "production" ]
