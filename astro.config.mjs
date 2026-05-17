// @ts-check
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
    site: 'https://webpgp.ivanbeltrame.com',
    output: 'static',
    trailingSlash: 'never',
    build: {
        format: 'file',
        assets: 'assets' 
    },
    outDir: 'docs',
});
