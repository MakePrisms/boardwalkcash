# syntax=docker/dockerfile:1

FROM node:18.17.0-bullseye

WORKDIR /app

EXPOSE 3000

COPY . .

RUN npm install

ENTRYPOINT ["/bin/bash", "/app/docker_entrypoint.sh"]