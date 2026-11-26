import { cp, mkdir, rm } from 'node:fs/promises';

const files = ['index.html', 'style.css', 'game.js'];
await rm('www', { recursive: true, force: true });
await mkdir('www', { recursive: true });
for (const file of files) await cp(file, `www/${file}`);
console.log('ASTRIXAL web assets copied into www/. Supabase project and player data remain unchanged.');
