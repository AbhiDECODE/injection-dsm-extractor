# Use Node.js official slim image
FROM node:18-slim

# Install system dependencies (Python3, pip, and clean cache)
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    && rm -rf /var/lib/apt/lists/*

# Install python dependencies for parsing
RUN pip3 install --no-cache-dir pdfplumber --break-system-packages

# Set application workspace
WORKDIR /usr/src/app

# Copy root package configurations
COPY package*.json ./

# Install server-side Node.js dependencies
RUN npm ci

# Copy client-side package configurations
COPY client/package*.json ./client/

# Install client-side dependencies
RUN cd client && npm ci

# Copy all source code (respects .gitignore)
COPY . .

# Build React production bundle
RUN npm run build

# Environment flag for production
ENV NODE_ENV=production

# The port Express runs on
EXPOSE 4000

# Start unified server
CMD ["npm", "start"]
