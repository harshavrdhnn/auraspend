FROM nginx:alpine
# Copy static web assets to nginx www root
COPY . /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
