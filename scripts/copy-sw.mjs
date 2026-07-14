import fs from "fs";
import path from "path";

const BUILD_OUTPUT =
  process.env.BUILD_OUTPUT || ".vercel/output/static";

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function copyFile(src, dst) {
  ensureDir(path.dirname(dst));
  try {
    fs.copyFileSync(src, dst);
    console.log(`  ✓ ${src} → ${dst}`);
  } catch (err) {
    console.error(`  ✗ Failed to copy ${src}: ${err.message}`);
  }
}

function copyDir(src, dst) {
  ensureDir(dst);
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const dstPath = path.join(dst, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, dstPath);
    } else {
      copyFile(srcPath, dstPath);
    }
  }
}

console.log(`\n📦 Copying PWA assets to ${BUILD_OUTPUT}/...\n`);

const files = [
  "public/sw.js",
  "public/offline.html",
  "public/manifest.webmanifest",
  "public/_headers",
];

for (const file of files) {
  if (fs.existsSync(file)) {
    const basename = path.basename(file);
    const destPath = path.join(BUILD_OUTPUT, basename);
    copyFile(file, destPath);
  }
}

if (fs.existsSync("public/icons")) {
  copyDir("public/icons", path.join(BUILD_OUTPUT, "icons"));
}

if (fs.existsSync("public/.well-known")) {
  copyDir("public/.well-known", path.join(BUILD_OUTPUT, ".well-known"));
}

if (fs.existsSync("public/apple-app-site-association")) {
  copyFile(
    "public/apple-app-site-association",
    path.join(BUILD_OUTPUT, "apple-app-site-association"),
  );
}

console.log("\n✅ PWA assets copied successfully.\n");
