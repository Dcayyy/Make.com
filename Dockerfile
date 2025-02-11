# Use an official Node runtime as a parent image
FROM node:16-alpine

# Set the working directory inside the container
WORKDIR /home/node/app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install --production

# Copy the rest of the application code
COPY . .

# Expose the port your app listens on (adjust if needed)
EXPOSE 3000

# Command to run your application.
# Make sure "app.js" exists at the root of your repository.
# If your main file is named differently (e.g., index.js), update accordingly.
CMD ["node", "app.js"]
