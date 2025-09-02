# Imagen base
FROM node:18

# Crear directorio de la app
WORKDIR /usr/src/app

# Copiar dependencias
COPY package*.json ./

# Instalar dependencias
RUN npm install

# Copiar el resto del proyecto
COPY . .

# Exponer puerto
EXPOSE 3000

# Comando de inicio
CMD ["node", "src/server.js"]
