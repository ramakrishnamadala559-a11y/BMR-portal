const fs = require('fs');
const path = 'c:\\hostel2\\node_modules\\@vercel\\next\\dist\\index.js';

let content = fs.readFileSync(path, 'utf8');

// Target 1
const target1 = `    const lambdaId = pageLambdaMap[outputSrcPathPage];
    lambda = lambdas[lambdaId];`;
const replacement1 = `    const lambdaId = pageLambdaMap[outputSrcPathPage.replace(/\\\\/g, "/")];
    lambda = lambdas[lambdaId];`;

// Target 2
const target2 = `    lambda = lambdas[outputSrcPathPage];`;
const replacement2 = `    lambda = lambdas[outputSrcPathPage.replace(/\\\\/g, "/")];`;

if (!content.includes(target1)) {
  console.error("Target 1 not found!");
  process.exit(1);
}
if (!content.includes(target2)) {
  console.error("Target 2 not found!");
  process.exit(1);
}

content = content.replace(target1, replacement1);
content = content.replace(target2, replacement2);

fs.writeFileSync(path, content, 'utf8');
console.log("Successfully patched local node_modules/@vercel/next/dist/index.js");
