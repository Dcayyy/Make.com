# Use Alpine as the base image
FROM alpine:latest

# Set the working directory (optional)
WORKDIR /app

# By default, just run a shell so the container stays alive
CMD ["sh"]
