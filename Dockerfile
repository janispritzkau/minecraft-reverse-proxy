FROM node:10-alpine

COPY . .

RUN npm run build && npm prune --production

ENTRYPOINT [ "node", "." ]
