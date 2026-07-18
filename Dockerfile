FROM node:20-alpine
WORKDIR /app
COPY package.json package.json
RUN npm install --omit=dev
COPY server.js server.js
COPY govo_unified_v3.js ./
COPY govo_ui_foundation.js ./
COPY govo_theme_v1.js ./
COPY govo_brand_v12c.js ./
COPY govo_components_v12c.js ./
COPY govo_pages_v12c.js ./
COPY govo_visual_v12f.js ./
COPY govo_data_v12c.js ./
COPY govo_flow_api_v15.js ./
EXPOSE 3000
CMD ["npm", "start"]
