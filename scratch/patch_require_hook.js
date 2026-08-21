const fs = require('fs');
const path = 'c:\\hostel2\\node_modules\\@vercel\\next\\dist\\index.js';

let content = fs.readFileSync(path, 'utf8');

// The require hook monkey patch to solve path casing and symlink permissions on Windows.
const patchCode = `
// MONKEY PATCH FOR WINDOWS COMPATIBILITY (PATH CASING & SYMLINK PERMISSIONS)
(function() {
  const Module = require('module');
  const originalRequire = Module.prototype.require;

  function patchFs(fsModule) {
    if (fsModule.__symlinkPatched) return;
    fsModule.__symlinkPatched = true;

    const originalSymlinkSync = fsModule.symlinkSync;
    const originalSymlink = fsModule.symlink;

    fsModule.symlinkSync = function(target, destPath, type) {
      try {
        return originalSymlinkSync.apply(this, arguments);
      } catch (err) {
        if (process.platform === 'win32') {
          const pathModule = require('path');
          const absoluteTarget = pathModule.resolve(pathModule.dirname(destPath), target);
          try { fsModule.rmSync(destPath, { recursive: true, force: true }); } catch (e) {}
          try {
            const stat = fsModule.statSync(absoluteTarget);
            if (stat.isDirectory()) {
              fsModule.cpSync(absoluteTarget, destPath, { recursive: true });
            } else {
              fsModule.copyFileSync(absoluteTarget, destPath);
            }
            return;
          } catch (copyErr) {
            console.error("Monkey-patched symlinkSync fallback copy failed:", copyErr);
          }
        }
        throw err;
      }
    };

    fsModule.symlink = function(target, destPath, type, callback) {
      if (typeof type === 'function') {
        callback = type;
        type = undefined;
      }
      const done = callback || (() => {});
      originalSymlink.call(fsModule, target, destPath, type, (err) => {
        if (err && process.platform === 'win32') {
          const pathModule = require('path');
          const absoluteTarget = pathModule.resolve(pathModule.dirname(destPath), target);
          fsModule.rm(destPath, { recursive: true, force: true }, (rmErr) => {
            fsModule.stat(absoluteTarget, (statErr, stat) => {
              if (statErr) return done(err);
              if (stat.isDirectory()) {
                fsModule.cp(absoluteTarget, destPath, { recursive: true }, (cpErr) => done(cpErr ? err : null));
              } else {
                fsModule.copyFile(absoluteTarget, destPath, (cpErr) => done(cpErr ? err : null));
              }
            });
          });
          return;
        }
        done(err);
      });
    };

    if (fsModule.promises) {
      patchFsPromises(fsModule.promises);
    }
  }

  function patchFsPromises(promises) {
    if (promises.__symlinkPatched) return;
    promises.__symlinkPatched = true;

    const originalPromisesSymlink = promises.symlink;
    promises.symlink = async function(target, destPath, type) {
      try {
        return await originalPromisesSymlink.apply(this, arguments);
      } catch (err) {
        if (process.platform === 'win32') {
          const pathModule = require('path');
          const absoluteTarget = pathModule.resolve(pathModule.dirname(destPath), target);
          const fsModule = require('fs');
          try { await promises.rm(destPath, { recursive: true, force: true }); } catch (e) {}
          try {
            const stat = await promises.stat(absoluteTarget);
            if (stat.isDirectory()) {
              await promises.cp(absoluteTarget, destPath, { recursive: true });
            } else {
              await promises.copyFile(absoluteTarget, destPath);
            }
            return;
          } catch (copyErr) {
            console.error("Monkey-patched promises.symlink fallback copy failed:", copyErr);
          }
        }
        throw err;
      }
    };
  }

  // Pre-patch already loaded modules
  try { patchFs(require('fs')); } catch (e) {}
  try { patchFsPromises(require('fs/promises')); } catch (e) {}

  Module.prototype.require = function(id) {
    const exports = originalRequire.apply(this, arguments);
    if (id === 'fs' || id === 'node:fs') {
      patchFs(exports);
    } else if (id === 'fs/promises' || id === 'node:fs/promises') {
      patchFsPromises(exports);
    }
    return exports;
  };
})();
`;

// Also patch the two path casing resolution bugs we found earlier!
// We will replace:
// 1) pageLambdaMap[outputSrcPathPage]
// 2) lambdas[outputSrcPathPage]
// with robust versions that fall back to backslashes if needed.

const target1Pattern = /const lambdaId = pageLambdaMap\[outputSrcPathPage\];/;
const replacement1 = `const lambdaId = pageLambdaMap[outputSrcPathPage] || pageLambdaMap[outputSrcPathPage.replace(/\\//g, "\\\\")] || pageLambdaMap[outputSrcPathPage.replace(/^\\//, "").replace(/\\//g, "\\\\")] || pageLambdaMap[outputSrcPathPage.replace(/\\\\/g, "/")] || pageLambdaMap[outputSrcPathPage.replace(/^\\//, "").replace(/\\\\/g, "/")];`;

const target2Pattern = /lambda = lambdas\[outputSrcPathPage\];/;
const replacement2 = `lambda = lambdas[outputSrcPathPage] || lambdas[outputSrcPathPage.replace(/\\//g, "\\\\")] || lambdas[outputSrcPathPage.replace(/^\\//, "").replace(/\\//g, "\\\\")] || lambdas[outputSrcPathPage.replace(/\\\\/g, "/")] || lambdas[outputSrcPathPage.replace(/^\\//, "").replace(/\\\\/g, "/")];`;

if (!content.includes('const lambdaId = pageLambdaMap[outputSrcPathPage];')) {
  console.error("Path Resolution Target 1 not found!");
  process.exit(1);
}
if (!content.includes('lambda = lambdas[outputSrcPathPage];')) {
  console.error("Path Resolution Target 2 not found!");
  process.exit(1);
}

content = content.replace(target1Pattern, replacement1);
content = content.replace(target2Pattern, replacement2);

// Prepend the monkey-patch code
content = patchCode + "\n" + content;

fs.writeFileSync(path, content, 'utf8');
console.log("Successfully applied all monkey patches to @vercel/next/dist/index.js");
