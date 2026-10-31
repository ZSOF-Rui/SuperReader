import { createHash } from 'node:crypto';
import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const siteDir = path.join(root, 'site');
const qsiteDir = path.join(root, 'dist', 'qsite');
const errors = [];

function fail(message) {
  errors.push(message);
}

async function sha256File(file) {
  const data = await readFile(file);
  return createHash('sha256').update(data).digest('hex');
}

async function readJson(file, label) {
  try {
    return JSON.parse(await readFile(file, 'utf8'));
  } catch (error) {
    fail(`${label}: cannot read ${file} (${error.code || error.message})`);
    return null;
  }
}

function latestOf(manifest, channel) {
  return manifest?.channels?.[channel]?.latest;
}

async function checkLatest(channel, siteLatest, mirrorLatest) {
  if (!siteLatest || !mirrorLatest) {
    fail(`${channel}: site or mirror manifest is missing latest`);
    return;
  }
  for (const key of ['versionName', 'versionCode', 'file', 'sizeBytes', 'sha256']) {
    if (siteLatest[key] !== mirrorLatest[key]) {
      fail(`${channel}.${key}: site=${siteLatest[key]} mirror=${mirrorLatest[key]}`);
    }
  }

  const file = String(mirrorLatest.file || '');
  if (!file.startsWith('downloads/') || file.includes('..') || path.isAbsolute(file)) {
    fail(`${channel}: unexpected file path ${file}`);
    return;
  }
  const apkPath = path.resolve(qsiteDir, file);
  if (!apkPath.startsWith(qsiteDir + path.sep)) {
    fail(`${channel}: ${file} escapes the mirror directory`);
    return;
  }
  try {
    const info = await stat(apkPath);
    if (info.size !== mirrorLatest.sizeBytes) {
      fail(`${channel}: ${file} is ${info.size} bytes, manifest says ${mirrorLatest.sizeBytes}`);
    }
    const signature = (await readFile(apkPath)).subarray(0, 4).toString('hex');
    if (signature !== '504b0304') {
      fail(`${channel}: ${file} does not start with a ZIP/APK signature`);
    }
    const actualHash = await sha256File(apkPath);
    if (actualHash !== mirrorLatest.sha256) {
      fail(`${channel}: ${file} SHA-256 is ${actualHash}, manifest says ${mirrorLatest.sha256}`);
    }
    console.log(
      `${channel.padEnd(8)} ${String(mirrorLatest.versionName).padEnd(16)} ` +
      `code ${String(mirrorLatest.versionCode).padEnd(3)} ${(info.size / 1048576).toFixed(1)} MB  ` +
      `${actualHash.slice(0, 12)}…`
    );
  } catch (error) {
    fail(`${channel}: cannot read ${file} (${error.code || error.message})`);
  }
}

async function checkNoStaleDownloads(referenced) {
  let entries;
  try {
    entries = await readdir(path.join(qsiteDir, 'downloads'), { withFileTypes: true });
  } catch (error) {
    fail(`downloads: ${error.code || error.message}`);
    return;
  }
  for (const entry of entries) {
    if (!entry.isFile()) continue;
    if (!referenced.has(`downloads/${entry.name}`)) {
      fail(`downloads/${entry.name} is not referenced by the mirror manifest`);
    }
  }
}

async function checkHtml() {
  const htmlPath = path.join(qsiteDir, 'index.html');
  let html;
  try {
    html = await readFile(htmlPath, 'utf8');
  } catch (error) {
    fail(`index.html: ${error.code || error.message}`);
    return;
  }
  const refs = [...html.matchAll(/(?:href|src)="([^"]+)"/g)].map((match) => match[1]);
  for (const ref of refs) {
    if (/^(?:#|https?:|mailto:|tel:|data:)/i.test(ref)) continue;
    if (ref.startsWith('/')) {
      fail(`index.html: absolute path "${ref}" is not portable`);
      continue;
    }
    const clean = ref.split(/[?#]/)[0];
    if (!clean || clean === '.' || clean === './') continue;
    try {
      await stat(path.resolve(qsiteDir, clean));
    } catch (error) {
      fail(`index.html: local target "${ref}" is missing`);
    }
  }
  const externalScripts = [
    ...html.matchAll(/<(?:script|link)\b[^>]+(?:src|href)="(https?:\/\/[^"]+)"/gi)
  ].map((match) => match[1]);
  if (externalScripts.length > 0) {
    fail(`index.html: third-party script/style resources are not allowed: ${externalScripts.join(', ')}`);
  }
  if (!html.includes('data/releases.json')) {
    fail('index.html: does not reference data/releases.json');
  }
}

async function main() {
  const siteManifest = await readJson(path.join(siteDir, 'data', 'releases.json'), 'site manifest');
  const mirrorManifest = await readJson(path.join(qsiteDir, 'data', 'releases.json'), 'mirror manifest');
  if (!siteManifest || !mirrorManifest) {
    report();
    return;
  }
  if (mirrorManifest.schemaVersion !== 1) {
    fail('mirror manifest: schemaVersion must be 1');
  }

  const referenced = new Set();
  for (const channel of ['stable', 'preview']) {
    const siteLatest = latestOf(siteManifest, channel);
    const mirrorLatest = latestOf(mirrorManifest, channel);
    await checkLatest(channel, siteLatest, mirrorLatest);
    if (mirrorLatest?.file) referenced.add(String(mirrorLatest.file));
  }
  await checkNoStaleDownloads(referenced);
  await checkHtml();

  let total = 0;
  for (const entry of await readdir(qsiteDir, { withFileTypes: true })) {
    if (!entry.isFile()) continue;
    total += (await stat(path.join(qsiteDir, entry.name))).size;
  }
  for (const entry of await readdir(path.join(qsiteDir, 'downloads'), { withFileTypes: true })) {
    if (entry.isFile()) total += (await stat(path.join(qsiteDir, 'downloads', entry.name))).size;
  }
  const limit = 50 * 1024 * 1024;
  if (total > limit) {
    fail(`mirror size ${(total / 1048576).toFixed(1)} MiB exceeds the 50 MiB artifact limit`);
  }
  console.log(`HTML     index.html; mirror total ${(total / 1048576).toFixed(1)} MiB`);
  report();
}

function report() {
  if (errors.length > 0) {
    console.error('\nQsite check failed:');
    for (const error of errors) console.error(` - ${error}`);
    process.exit(1);
  }
  console.log('\nQsite check passed.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
