import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';
export default defineConfig({
  build: { rollupOptions: { input: {
    studio: fileURLToPath(new URL('./index.html',import.meta.url)),
    modelLab: fileURLToPath(new URL('./model-lab.html',import.meta.url)),
  } } },
});
