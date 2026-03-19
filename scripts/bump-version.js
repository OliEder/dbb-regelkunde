#!/usr/bin/env node
// scripts/bump-version.js
// Liest die Version aus package.json und schreibt sie in app/sw.js,
// app/js/app.js und app/index.html.
// Aufruf: node scripts/bump-version.js [version]
//   Ohne Argument: übernimmt die Version aus package.json
//   Mit Argument:  setzt erst package.json, dann alle App-Dateien
//   Beispiele:
//     node scripts/bump-version.js          → sync aus package.json
//     node scripts/bump-version.js 1.4.0    → bump auf 1.4.0
//     node scripts/bump-version.js 1.4.0-RC1 → bump auf RC

import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

// --- Version bestimmen ---
const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));

const newVersion = process.argv[2] ?? pkg.version;
const vTag = newVersion.startsWith('v') ? newVersion : `v${newVersion}`;

// --- package.json aktualisieren ---
pkg.version = newVersion.replace(/^v/, '');
writeFileSync(resolve(root, 'package.json'), JSON.stringify(pkg, null, 2) + '\n');

// --- sw.js ---
const swPath = resolve(root, 'app/sw.js');
let sw = readFileSync(swPath, 'utf8');
sw = sw.replace(/const VERSION = '[^']+';/, `const VERSION = '${vTag}';`);
sw = sw.replace(/const CACHE = '[^']+';/, `const CACHE = 'regelkunde-${vTag}';`);
writeFileSync(swPath, sw);

// --- app.js ---
const appJsPath = resolve(root, 'app/js/app.js');
let appJs = readFileSync(appJsPath, 'utf8');
appJs = appJs.replace(/const APP_VERSION = '[^']+';/, `const APP_VERSION = '${vTag}';`);
writeFileSync(appJsPath, appJs);

// --- index.html (meta name="version") ---
const htmlPath = resolve(root, 'app/index.html');
let html = readFileSync(htmlPath, 'utf8');
html = html.replace(
  /<meta name="version" content="[^"]+"/,
  `<meta name="version" content="${vTag}"`
);
writeFileSync(htmlPath, html);

console.log(`✓ Version auf ${vTag} gesetzt in:`);
console.log('  package.json');
console.log('  app/sw.js');
console.log('  app/js/app.js');
console.log('  app/index.html');
