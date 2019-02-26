FROM node:10-alpine

COPY . .

RUN npm install && npm run build && npm prune --production

ENTRYPOINT [ "node", "." ]
