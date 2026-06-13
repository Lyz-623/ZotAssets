#!/usr/bin/env node
/**
 * Cross-platform ZotAssets build script (optional; requires Node.js).
 *
 * Copies addon/ into build/ and produces dist/ZotAssets-<version>.xpi.
 *
 * Zipping strategy:
 *   1. If the optional "archiver" dev dependency is installed, use it.
 *   2. Otherwise fall back to the system zip tool:
 *        - Windows: PowerShell Compress-Archive
 *        - macOS/Linux: the `zip` command
 *
 * Usage: node scripts/build.js
 */
"use strict";

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const root = path.resolve(__dirname, "..");
const addonDir = path.join(root, "addon");
const buildDir = path.join(root, "build");
const distDir = path.join(root, "dist");

function rimraf(p) {
  if (fs.existsSync(p)) {
    fs.rmSync(p, { recursive: true, force: true });
  }
}

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(s, d);
    } else {
      fs.copyFileSync(s, d);
    }
  }
}

function readVersion() {
  const manifest = JSON.parse(fs.readFileSync(path.join(addonDir, "manifest.json"), "utf8"));
  if (!manifest.version) throw new Error("manifest.json has no version");
  return manifest.version;
}

async function zipWithArchiver(srcDir, outFile) {
  let archiver;
  try {
    archiver = require("archiver");
  } catch (e) {
    return false;
  }
  await new Promise((resolve, reject) => {
    const output = fs.createWriteStream(outFile);
    const archive = archiver("zip", { zlib: { level: 9 } });
    output.on("close", resolve);
    archive.on("error", reject);
    archive.pipe(output);
    archive.directory(srcDir + "/", false);
    archive.finalize();
  });
  return true;
}

function zipWithSystem(srcDir, outFile) {
  if (process.platform === "win32") {
    // Do NOT use Compress-Archive: PowerShell 5.1 stores backslash entry paths,
    // which can break Gecko's zip reader. Build the archive with forward-slash
    // entry names via System.IO.Compression instead.
    rimraf(outFile);
    const ps = [
      "Add-Type -AssemblyName System.IO.Compression;",
      "Add-Type -AssemblyName System.IO.Compression.FileSystem;",
      `$src = (Resolve-Path '${srcDir}').Path.TrimEnd('\\','/');`,
      `$zs = [System.IO.File]::Open('${outFile}', [System.IO.FileMode]::Create);`,
      "$ar = New-Object System.IO.Compression.ZipArchive($zs, [System.IO.Compression.ZipArchiveMode]::Create);",
      "try { Get-ChildItem -Path $src -Recurse -File | ForEach-Object {",
      "  $rel = $_.FullName.Substring($src.Length + 1).Replace('\\','/');",
      "  $e = $ar.CreateEntry($rel, [System.IO.Compression.CompressionLevel]::Optimal);",
      "  $os = $e.Open(); $b = [System.IO.File]::ReadAllBytes($_.FullName);",
      "  $os.Write($b, 0, $b.Length); $os.Dispose(); } }",
      "finally { $ar.Dispose(); $zs.Dispose(); }",
    ].join(" ");
    execFileSync("powershell", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", ps], {
      stdio: "inherit",
    });
  } else {
    // zip -r ../out.xpi . (run inside srcDir so paths are relative)
    rimraf(outFile);
    execFileSync("zip", ["-r", "-X", outFile, "."], { cwd: srcDir, stdio: "inherit" });
  }
}

async function main() {
  const version = readVersion();
  console.log("ZotAssets version:", version);

  rimraf(buildDir);
  fs.mkdirSync(buildDir, { recursive: true });
  fs.mkdirSync(distDir, { recursive: true });

  copyDir(addonDir, buildDir);

  const xpiPath = path.join(distDir, `ZotAssets-${version}.xpi`);
  rimraf(xpiPath);

  const usedArchiver = await zipWithArchiver(buildDir, xpiPath);
  if (!usedArchiver) {
    zipWithSystem(buildDir, xpiPath);
  }

  console.log("Built:", xpiPath);
}

main().catch((e) => {
  console.error("Build failed:", e);
  process.exit(1);
});
