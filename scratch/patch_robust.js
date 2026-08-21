const fs = require('fs');
const path = 'c:\\hostel2\\node_modules\\@vercel\\next\\dist\\index.js';

let content = fs.readFileSync(path, 'utf8');

// We want to restore index.js to clean state or replace our previous patches.
// Let's write a script that does a general replace of the targets.

// We will replace:
// 1) pageLambdaMap[outputSrcPathPage.replace(/\\/g, "/")] OR pageLambdaMap[outputSrcPathPage]
// 2) lambdas[outputSrcPathPage.replace(/\\/g, "/")] OR lambdas[outputSrcPathPage]

const target1Pattern = /const lambdaId = pageLambdaMap\[outputSrcPathPage.*?\];/;
const replacement1 = `const lambdaId = pageLambdaMap[outputSrcPathPage] || pageLambdaMap[outputSrcPathPage.replace(/\\//g, "\\\\")] || pageLambdaMap[outputSrcPathPage.replace(/^\\//, "").replace(/\\//g, "\\\\")] || pageLambdaMap[outputSrcPathPage.replace(/\\\\/g, "/")] || pageLambdaMap[outputSrcPathPage.replace(/^\\//, "").replace(/\\\\/g, "/")];`;

const target2Pattern = /lambda = lambdas\[outputSrcPathPage.*?\];/;
const replacement2 = `lambda = lambdas[outputSrcPathPage] || lambdas[outputSrcPathPage.replace(/\\//g, "\\\\")] || lambdas[outputSrcPathPage.replace(/^\\//, "").replace(/\\//g, "\\\\")] || lambdas[outputSrcPathPage.replace(/\\\\/g, "/")] || lambdas[outputSrcPathPage.replace(/^\\//, "").replace(/\\\\/g, "/")];`;

if (!target1Pattern.test(content)) {
  console.error("Target 1 pattern not found!");
  process.exit(1);
}
if (!target2Pattern.test(content)) {
  console.error("Target 2 pattern not found!");
  process.exit(1);
}

content = content.replace(target1Pattern, replacement1);
content = content.replace(target2Pattern, replacement2);

fs.writeFileSync(path, content, 'utf8');
console.log("Successfully applied robust path resolution patch to @vercel/next");
