
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import previewsRouter from './routes/previews.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(express.static(path.join(__dirname, 'public')));
app.use('/previews', previewsRouter);

const PORT = 5050;

app.listen(PORT, () => {
  console.log(`Preview dashboard: http://localhost:${PORT}/`);
  console.log(`Preview root: http://localhost:${PORT}/previews/{repo}/{pr-number}/`);
  console.log(`Preview storage: ${path.join(__dirname, '../previews')}`);
});
