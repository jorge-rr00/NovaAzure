## NOVA Assistant — Frontend (React + Vite)

La interfaz frontend es un cliente ligero en React (Vite) para el proyecto NOVA Assistant. Proporciona una experiencia de chat profesional optimizada para flujos de trabajo centrados en documentos (texto, voz y cargas de archivos). La interfaz prioriza la claridad y la eficiencia para consultas financieras y legales.

Objetivos principales
- Persona profesional: tema compacto y de alto contraste, mensajes de sistema concisos para presentar resultados con claridad.
- Conversación como eje: las sesiones son persistentes (gestionadas por el backend) y el frontend mantiene un `session_id` para que el asistente recuerde intercambios previos.
- Enfoque en documentos: carga sencilla de archivos (PDF, Word, imágenes), vista de nombres de archivos subidos y renderizado claro de resultados tabulares.
- Entrada por voz: utiliza la Web Speech API en el cliente para transcribir voz a texto.

Componentes y comportamiento principal
- `App.jsx`: componente principal que implementa el chat, la gestión de sesiones, la subida de archivos y los controles de micrófono.
- Renderizado de mensajes: las respuestas del asistente con contenido multilineal o tabular se muestran en un bloque preformateado para facilitar la lectura.
- Gestión de sesiones: al cargar, el frontend solicita una sesión al backend (`POST /api/sessions`) y guarda el `session_id`; cada petición a `/api/query` incluye ese `session_id`. El botón "New Session" crea una sesión nueva y reinicia la interfaz.
- Manejo de archivos: los archivos se envían mediante `FormData` a `/api/query`. El frontend restablece el valor del input de tipo archivo tras enviar para permitir volver a subir el mismo fichero.

Herramientas y librerías
- Framework: React (Vite)
- Estilos: estilos en línea para reducir dependencias
- Voz: Web Speech API (`SpeechRecognition` / fallback `webkitSpeechRecognition`)

Entorno y ejecución local
- El frontend espera la URL base de la API del backend en la variable de entorno `VITE_API_URL` (por ejemplo `http://localhost:5100`). Crear `.env.local` con:

```bash
VITE_API_URL=http://localhost:5100
```

- Desarrollo:

```bash
cd frontend
npm install
VITE_API_URL="http://localhost:5100" npm run dev
```

- Construcción para producción:

```bash
npm run build
npm run preview
```

Notas sobre la integración con el backend
- El frontend es deliberadamente ligero: el procesamiento intensivo (OCR, validación, persistencia) lo realiza el backend. Responsabilidades del frontend:
	- crear y gestionar `session_id`
	- enviar texto y archivos a `/api/query`
	- renderizar las respuestas (preformateadas cuando son largas o tabulares)

Accesibilidad y experiencia de usuario
- La interfaz evita fuentes pequeñas para el contenido, garantiza contraste para legibilidad y presenta resultados estructurados en bloques monoespaciados para mantener el alineado.

Extensiones recomendadas
- Renderizar Markdown/HTML de forma segura para tablas más ricas (usando un renderer de markdown sanitizado). Actualmente la interfaz muestra texto preformateado.
- Añadir una lista de sesiones en la barra lateral (llamando a `GET /api/sessions`) para permitir cambiar entre sesiones.
- Añadir vistas previas y enlaces de descarga de archivos (los archivos se almacenan por sesión en el backend).

Notas finales
- Esta interfaz forma parte del proyecto NOVA Assistant y está pensada para desarrollo interno. Ajustar dependencias y pasos de build para despliegue en producción (CORS, gestión segura de variables de entorno, HTTPS).
