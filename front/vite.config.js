import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
// https://vite.dev/config/
export default defineConfig({
    plugins: [react()],
    build: {
        rollupOptions: {
            output: {
                manualChunks(id) {
                    if (!id.includes('node_modules'))
                        return undefined;
                    if (id.includes('react-router-dom'))
                        return 'router';
                    if (id.includes('@tanstack/react-query'))
                        return 'query';
                    if (id.includes('@mui') || id.includes('@emotion'))
                        return 'mui';
                    if (id.includes('recharts'))
                        return 'charts';
                    if (id.includes('lucide-react'))
                        return 'icons';
                    if (id.includes('axios'))
                        return 'api';
                    return 'vendor';
                },
            },
        },
    },
});
