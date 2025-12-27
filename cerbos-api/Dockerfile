# Use Node.js LTS version
FROM node:20-slim

# Set working directory
WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./

# Install dependencies
RUN npm install --production

# Copy the rest of the application code
COPY . .

# Create the storage directory for JSON files
RUN mkdir -p storage

# Expose the port the app runs on
EXPOSE 3000

# Start the application
CMD ["node", "index.js"]
