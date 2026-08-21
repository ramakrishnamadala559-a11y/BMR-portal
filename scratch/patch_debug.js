const fs = require('fs');
const path = 'c:\\hostel2\\node_modules\\@vercel\\next\\dist\\index.js';

let content = fs.readFileSync(path, 'utf8');

const target = `    if (lambda == null) {
      console.log("DEBUG: routeFileNoExt =", routeFileNoExt);
      console.log("DEBUG: outputSrcPathPage =", outputSrcPathPage);
      console.log("DEBUG: lambdas keys =", JSON.stringify(Object.keys(lambdas)));
      throw new import_build_utils.NowBuildError({
        code: "NEXT_MISSING_LAMBDA",
        message: \`Unable to find lambda for route: \${routeFileNoExt}\`
      });
    }`;

const replacement = `    if (lambda == null) {
      console.log("DEBUG: routeFileNoExt =", routeFileNoExt);
      console.log("DEBUG: routeKey =", routeKey);
      console.log("DEBUG: srcRoute =", srcRoute);
      console.log("DEBUG: lambdas keys =", JSON.stringify(Object.keys(lambdas)));
      throw new import_build_utils.NowBuildError({
        code: "NEXT_MISSING_LAMBDA",
        message: \`Unable to find lambda for route: \${routeFileNoExt}\`
      });
    }`;

if (!content.includes(target)) {
  console.error("Target debug section not found!");
  process.exit(1);
}

content = content.replace(target, replacement);
fs.writeFileSync(path, content, 'utf8');
console.log("Successfully updated debug statements");
