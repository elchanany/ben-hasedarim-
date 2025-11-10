import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'

// Fix for __dirname which is not available in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
    // The `loadEnv` call was removed as its result was unused and it caused a TypeScript type error
    // regarding `process.cwd()`. Vite automatically handles loading of `.env` files for client-side
    // code available via `import.meta.env`.
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './'),
      },
    },
})
