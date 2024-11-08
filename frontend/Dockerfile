# Step 1: Use Nginx as the base image
FROM nginx:alpine

# Step 2: Copy the build output to Nginx's web root
COPY ./dist /usr/share/nginx/html

# Step 3: Expose port 80
EXPOSE 80

# Step 4: Start Nginx when the container starts
CMD ["nginx", "-g", "daemon off;"]
