import {fileURLToPath} from 'node:url';
import path, {dirname} from 'node:path';
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { DEFAULT_BASE_API_URL } from '../packages/api/src/Constants.ts';


const __dirname = dirname(fileURLToPath(import.meta.url));

// https://vite.dev/config/
export default defineConfig({
  	plugins: [react()],
	resolve: {
		alias: [
			{find: '@client', replacement: path.resolve(__dirname, 'src')},
			{find: '@api', replacement: path.resolve(__dirname, '../packages/api/src')},
			{find: '~', replacement: path.resolve(__dirname, 'src')},
		],
		extensions: ['.web.tsx', '.web.ts', '.web.jsx', '.web.js', '.tsx', '.ts', '.jsx', '.js', '.json'],
	},
	server: {
		cors: {
			origin: DEFAULT_BASE_API_URL,
			methods: ['GET', 'PUT', 'POST', 'DELETE'],
			allowedHeaders: ['Content-Type', 'Authorization']
		}
	}
})
