FROM node:16
RUN npm install -g nodemon
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install --build-from-source  
COPY . .
CMD ["npm", "start"]
