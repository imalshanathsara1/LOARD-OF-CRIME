# Node.js 18 base image
FROM node:18

# App directory
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json./
RUN npm install

# Copy the rest of the app
COPY..

# Expose the port your bot uses (adjust if needed)
EXPOSE 3000

# Start the bot
CMD ["node", "index.js"]
