import { readdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";

const outputDir = ".vercel/output";
const sourceMapPattern = /\/\/# sourceMappingURL=.*\.map\s*$/gm;

async function walk(dir, files = []) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return files;
  }

  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      await walk(path, files);
    } else {
      files.push(path);
    }
  }

  return files;
}

async function sizeOf(files) {
  let total = 0;
  for (const file of files) {
    total += (await stat(file)).size;
  }
  return total;
}

const files = await walk(outputDir);
const before = await sizeOf(files);
let removedMaps = 0;
let strippedComments = 0;

for (const file of files) {
  if (file.endsWith(".map")) {
    await rm(file, { force: true });
    removedMaps += 1;
    continue;
  }

  if (file.endsWith(".js")) {
    const source = await readFile(file, "utf8");
    const next = source.replace(sourceMapPattern, "");
    if (next !== source) {
      await writeFile(file, next);
      strippedComments += 1;
    }
  }
}

const afterFiles = await walk(outputDir);
const after = await sizeOf(afterFiles);

console.log(
  `Pruned Pages output: removed ${removedMaps} sourcemaps, stripped ${strippedComments} references, saved ${(
    (before - after) /
    1024
  ).toFixed(1)} KiB.`
);
