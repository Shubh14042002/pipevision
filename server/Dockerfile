# Dockerfile for Node Express Backend

FROM node:21.7.3

# Install ffmpeg for video frame extraction
RUN apt-get update && apt-get install -y ffmpeg && rm -rf /var/lib/apt/lists/*

# Create app directory
WORKDIR /usr/src/app

# Install dependencies
COPY package*.json ./
RUN npm install --silent

# Copy app source code
COPY . .

# Create runtime directories used by uploads, detection, frames, and PDF reports
RUN mkdir -p uploads videos frames reports

# Render provides PORT automatically for web services
EXPOSE 10000

CMD ["npm", "start"]