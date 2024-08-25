FROM node:20.16.0-slim

ENV HOST 0.0.0.0

ENV PROJECT_ROOTDIR /var/www/app

WORKDIR $PROJECT_ROOTDIR

RUN apt-get update \
    && apt-get install -y git \
    && npm install -g npm@latest
