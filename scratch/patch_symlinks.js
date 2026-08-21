const fs = require('fs');
const path = 'c:\\hostel2\\node_modules\\@vercel\\next\\dist\\index.js';

let content = fs.readFileSync(path, 'utf8');

const target = `async function createSymlink(srcpath, dstpath, type) {
      let stats;
      try {
        stats = await fs5.lstat(dstpath);
      } catch {
      }
      if (stats && stats.isSymbolicLink()) {
        const [srcStat, dstStat] = await Promise.all([
          fs5.stat(srcpath),
          fs5.stat(dstpath)
        ]);
        if (areIdentical(srcStat, dstStat))
          return;
      }
      const relative = await symlinkPaths(srcpath, dstpath);
      srcpath = relative.toDst;
      const toType = await symlinkType(relative.toCwd, type);
      const dir = path6.dirname(dstpath);
      if (!await pathExists2(dir)) {
        await mkdirs(dir);
      }
      return fs5.symlink(srcpath, dstpath, toType);
    }
    function createSymlinkSync(srcpath, dstpath, type) {
      let stats;
      try {
        stats = fs5.lstatSync(dstpath);
      } catch {
      }
      if (stats && stats.isSymbolicLink()) {
        const srcStat = fs5.statSync(srcpath);
        const dstStat = fs5.statSync(dstpath);
        if (areIdentical(srcStat, dstStat))
          return;
      }
      const relative = symlinkPathsSync(srcpath, dstpath);
      srcpath = relative.toDst;
      type = symlinkTypeSync(relative.toCwd, type);
      const dir = path6.dirname(dstpath);
      const exists = fs5.existsSync(dir);
      if (exists)
        return fs5.symlinkSync(srcpath, dstpath, type);
      mkdirsSync(dir);
      return fs5.symlinkSync(srcpath, dstpath, type);
    }`;

const replacement = `async function createSymlink(srcpath, dstpath, type) {
      const fs = require('fs').promises;
      const fsSync = require('fs');
      const path = require('path');
      const dir = path.dirname(dstpath);
      if (!await pathExists2(dir)) {
        await mkdirs(dir);
      }
      try {
        await fs.rm(dstpath, { recursive: true, force: true });
      } catch (e) {}
      const absoluteSrc = path.resolve(dir, srcpath);
      try {
        const stat = await fs.stat(absoluteSrc);
        if (stat.isDirectory()) {
          await fs.cp(absoluteSrc, dstpath, { recursive: true });
        } else {
          await fs.copyFile(absoluteSrc, dstpath);
        }
      } catch (e) {
        try {
          fsSync.symlinkSync(srcpath, dstpath, type);
        } catch (symlinkErr) {
          console.error("Symlink fallback failed:", symlinkErr);
        }
      }
    }
    function createSymlinkSync(srcpath, dstpath, type) {
      const fs = require('fs');
      const path = require('path');
      const dir = path.dirname(dstpath);
      const exists = fs.existsSync(dir);
      if (!exists) {
        mkdirsSync(dir);
      }
      try {
        fs.rmSync(dstpath, { recursive: true, force: true });
      } catch (e) {}
      const absoluteSrc = path.resolve(dir, srcpath);
      try {
        const stat = fs.statSync(absoluteSrc);
        if (stat.isDirectory()) {
          fs.cpSync(absoluteSrc, dstpath, { recursive: true });
        } else {
          fs.copyFileSync(absoluteSrc, dstpath);
        }
      } catch (e) {
        try {
          fs.symlinkSync(srcpath, dstpath, type);
        } catch (symlinkErr) {
          console.error("Symlink fallback failed:", symlinkErr);
        }
      }
    }`;

if (!content.includes(target)) {
  console.error("Target symlink block not found!");
  process.exit(1);
}

content = content.replace(target, replacement);
fs.writeFileSync(path, content, 'utf8');
console.log("Successfully patched symlink functions in @vercel/next");
