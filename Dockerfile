FROM node:20-alpine
WORKDIR /app
COPY package.json package.json
RUN npm install --omit=dev
COPY server.js server.js
COPY govo_unified_v3.js ./
COPY govo_ui_foundation.js ./
COPY govo_theme_v1.js ./
EXPOSE 3000
CMD ["npm", "start"]
