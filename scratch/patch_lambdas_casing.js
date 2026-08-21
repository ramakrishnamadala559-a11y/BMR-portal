const fs = require('fs');
const path = 'c:\\hostel2\\node_modules\\@vercel\\next\\dist\\index.js';

let content = fs.readFileSync(path, 'utf8');

const target = `      ...lambdas,`;
const replacement = `      ...Object.fromEntries(Object.entries(lambdas).map(([k,v]) => [k.replace(/\\\\/g, "/"), v])),`;

let count = 0;
let idx = -1;
while ((idx = content.indexOf(target, idx + 1)) !== -1) {
  count++;
}

if (count !== 2) {
  console.error(`Expected 2 occurrences of target, found ${count}`);
  process.exit(1);
}

content = content.replaceAll(target, replacement);
fs.writeFileSync(path, content, 'utf8');
console.log("Successfully normalized lambdas keys casing in @vercel/next/dist/index.js");
