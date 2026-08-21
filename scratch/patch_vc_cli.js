const fs = require('fs');
const path = 'c:\\hostel2\\node_modules\\vercel\\dist\\vc.js';

let content = fs.readFileSync(path, 'utf8');

const patchCode = `
// MONKEY PATCH FOR WINDOWS SYMLINK BYPASS
import fsModule from 'node:fs';
import fsPromises from 'node:fs/promises';
import pathModule from 'node:path';

if (!fsModule.__symlinkPatched) {
  fsModule.__symlinkPatched = true;
  
  const originalSymlinkSync = fsModule.symlinkSync;
  const originalSymlink = fsModule.symlink;

  fsModule.symlinkSync = function(target, destPath, type) {
    try {
      return originalSymlinkSync.apply(this, arguments);
    } catch (err) {
      if (process.platform === 'win32') {
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
        const absoluteTarget = pathModule.resolve(pathModule.dirname(destPath), target);
        fsModule.rm(destPath, { recursive: true, force: true }, (rmErr) => {
          if (rmErr) return done(err);
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

  const originalPromisesSymlink = fsPromises.symlink;
  fsPromises.symlink = async function(target, destPath, type) {
    try {
      return await originalPromisesSymlink.apply(this, arguments);
    } catch (err) {
      if (process.platform === 'win32') {
        const absoluteTarget = pathModule.resolve(pathModule.dirname(destPath), target);
        try { await fsPromises.rm(destPath, { recursive: true, force: true }); } catch (e) {}
        try {
          const stat = await fsPromises.stat(absoluteTarget);
          if (stat.isDirectory()) {
            await fsPromises.cp(absoluteTarget, destPath, { recursive: true });
          } else {
            await fsPromises.copyFile(absoluteTarget, destPath);
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
`;

// Insert after #!/usr/bin/env node line
const lines = content.split('\n');
if (lines[0].startsWith('#!')) {
  lines.splice(1, 0, patchCode);
} else {
  lines.unshift(patchCode);
}

content = lines.join('\n');
fs.writeFileSync(path, content, 'utf8');
console.log("Successfully patched vercel CLI entry point (vc.js)");
