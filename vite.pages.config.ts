import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({
 root:'pages',base:'/lawsuit-staff-admin/',publicDir:'../public',
 plugins:[react()],
 define:{'import.meta.env.VITE_OFFICE_API_BASE':JSON.stringify('https://lawsuit-staff-admin.stormyowl128.chatgpt.site')},
 build:{outDir:'../docs',emptyOutDir:true},
});
