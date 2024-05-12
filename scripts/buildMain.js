const esbuild = require("esbuild");
const path = require("path");

esbuild
  .build({
    entryPoints: ["src/index.ts"], // Your entry file
    bundle: true, // Bundle all dependencies into one file
    outfile: "index.js", // Output file
    platform: "node", // Specify the platform
    // target: ["es6"], // Target modern JavaScript (edit according to needs)
    sourcemap: true, // Optional source maps
    minify: false, // Minify the output (set to true in production)
    format: "iife",
    target: ["chrome80"],
  })
  .catch(() => process.exit(1));