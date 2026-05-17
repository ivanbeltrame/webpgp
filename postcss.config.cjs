// postcss.config.cjs
const purgecss = require('@fullhuman/postcss-purgecss');

module.exports = {
  plugins: [
    process.env.NODE_ENV === 'production'
        ? purgecss({
            content: [
                './src/**/*.astro',
                './src/**/*.html',
                './src/**/*.js',
                './src/**/*.ts'
            ],
            safelist: {
                standard: [
                    /^modal/,    // Keeps modal-backdrop, modal-open, etc.
                    /^fade/,     // Keeps fade animation classes
                    /^show/,     // Keeps utility show classes
                    /^collaps/,  // Keeps collapse animations
                    /^nav/       // Keeps dynamic navbar states
                ],
                greedy: [/^data-bs-/] // Safelists Bootstrap data attributes
            },
            defaultExtractor: (content) => content.match(/[\w-/:]+(?<!:)/g) || [],
        })
    : false,
  ],
};