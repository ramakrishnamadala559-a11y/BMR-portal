const fs = require('fs');
const path = 'c:\\hostel2\\node_modules\\@vercel\\next\\dist\\index.js';

let content = fs.readFileSync(path, 'utf8');

const patchCode = `
// MONKEY PATCH FS SYMLINKS FOR WINDOWS COMPATIBILITY
(function() {
  const originalFs = require('fs');
  const originalSymlinkSync = originalFs.symlinkSync;
  const originalSymlink = originalFs.symlink;

  if (originalFs.__symlinkPatched) return;
  originalFs.__symlinkPatched = true;

  originalFs.symlinkSync = function(target, path, type) {
    try {
      return originalSymlinkSync.apply(this, arguments);
    } catch (err) {
      if (process.platform === 'win32') {
        const pathModule = require('path');
        const absoluteTarget = pathModule.resolve(pathModule.dirname(path), target);
        try {
          originalFs.rmSync(path, { recursive: true, force: true });
        } catch (e) {}
        try {
          const stat = originalFs.statSync(absoluteTarget);
          if (stat.isDirectory()) {
            originalFs.cpSync(absoluteTarget, path, { recursive: true });
          } else {
            originalFs.copyFileSync(absoluteTarget, path);
          }
          return;
        } catch (copyErr) {
          console.error("Monkey-patched symlinkSync fallback copy failed:", copyErr);
        }
      }
      throw err;
    }
  };

  originalFs.symlink = function(target, path, type, callback) {
    if (typeof type === 'function') {
      callback = type;
      type = undefined;
    }
    
    const done = callback || (() => {});
    
    originalSymlink.call(originalFs, target, path, type, (err) => {
      if (err && process.platform === 'win32') {
        const pathModule = require('path');
        const absoluteTarget = pathModule.resolve(pathModule.dirname(path), target);
        
        originalFs.rm(path, { recursive: true, force: true }, (rmErr) => {
          originalFs.stat(absoluteTarget, (statErr, stat) => {
            if (statErr) return done(err);
            
            if (stat.isDirectory()) {
              originalFs.cp(absoluteTarget, path, { recursive: true }, (cpErr) => {
                if (cpErr) return done(err);
                done(null);
              });
            } else {
              originalFs.copyFile(absoluteTarget, path, (cpErr) => {
                if (cpErr) return done(err);
                done(null);
              });
            }
          });
        });
        return;
      }
      done(err);
    });
  };

  if (originalFs.promises) {
    const originalPromisesSymlink = originalFs.promises.symlink;
    originalFs.promises.symlink = async function(target, path, type) {
      try {
        return await originalPromisesSymlink.apply(this, arguments);
      } catch (err) {
        if (process.platform === 'win32') {
          const pathModule = require('path');
          const absoluteTarget = pathModule.resolve(pathModule.dirname(path), target);
          try {
            await originalFs.promises.rm(path, { recursive: true, force: true });
          } catch (e) {}
          try {
            const stat = await originalFs.promises.stat(absoluteTarget);
            if (stat.isDirectory()) {
              await originalFs.promises.cp(absoluteTarget, path, { recursive: true });
            } else {
              await originalFs.promises.copyFile(absoluteTarget, path);
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
})();
`;

// Prepend the patch code to the content
content = patchCode + "\n" + content;

fs.writeFileSync(path, content, 'utf8');
console.log("Successfully prepended global fs monkey patch to @vercel/next/dist/index.js");
