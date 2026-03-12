/**
 * PostCSS Configuration File
 * 
 * PostCSS is a tool for transforming CSS with JavaScript plugins.
 * This configuration sets up Tailwind CSS and Autoprefixer for the project.
 * 
 * @see https://postcss.org/
 * @see https://tailwindcss.com/
 */

/** @type {import('postcss-load-config').Config} */
const config = {
  // PostCSS plugins used for processing styles
  plugins: {
    // Tailwind CSS v4 PostCSS plugin
    // Processes Tailwind directives and generates utility classes
    '@tailwindcss/postcss': {},
    
    // Autoprefixer - adds vendor prefixes to CSS rules
    // Ensures compatibility with older browsers
    autoprefixer: {},
  },
};

export default config;
