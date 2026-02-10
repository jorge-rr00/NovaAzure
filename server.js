import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
// Azure App Service para Linux usa el puerto 8080 por defecto
const PORT = process.env.PORT || 8080; 

// Forzamos la ruta absoluta a la carpeta 'dist' que genera Vite
const distPath = path.resolve(__dirname, 'dist');

app.use(express.static(distPath));

app.use((req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});


app.listen(PORT, () => {
  console.log(`Servidor NOVA activo en puerto ${PORT}`);
});