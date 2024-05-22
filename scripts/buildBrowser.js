const esbuild = require("esbuild");
const path = require("path");

esbuild
  .build({
    entryPoints: ["src/browser/browser.ts"], // Your entry file
    bundle: true, // Bundle all dependencies into one file
    outfile: "browser.js", // Output file
    platform: "browser", // Specify the platform
    // target: ["es6"], // Target modern JavaScript (edit according to needs)
    sourcemap: false, // Optional source maps
    minify: true, // Minify the output (set to true in production)
    format: "iife",
    target: ["chrome80"],
  })
  .catch(() => process.exit(1));
