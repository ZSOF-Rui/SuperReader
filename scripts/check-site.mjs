import { createHash } from 'node:crypto';
import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const siteDir = path.join(root, 'site');
const errors = [];

function fail(message) {
  errors.push(message);
}

function isPositiveInt(value) {
  return Number.isInteger(value) && value > 0;
}

async function sha256File(file) {
  const data = await readFile(file);
  return createHash('sha256').update(data).digest('hex');
}

async function checkApk(channelKey, channel) {
  const latest = channel.latest;
  if (!latest || typeof latest !== 'object') {
    fail(`${channelKey}: missing latest release`);
    return;
  }

  const label = channel.label || channelKey;
  if (typeof latest.versionName !== 'string' || !latest.versionName.trim()) {
    fail(`${channelKey}: latest.versionName is missing`);
  }
  if (!isPositiveInt(latest.versionCode)) {
    fail(`${channelKey}: latest.versionCode must be a positive integer`);
  }
  if (typeof channel.packageName !== 'string' || !channel.packageName.includes('.')) {
    fail(`${channelKey}: packageName is invalid`);
  }
  if (!/^[a-f0-9]{64}$/.test(String(latest.sha256 || ''))) {
    fail(`${channelKey}: latest.sha256 must be 64 lowercase hex characters`);
  }
  if (!isPositiveInt(latest.sizeBytes)) {
    fail(`${channelKey}: latest.sizeBytes must be a positive integer`);
  }
  if (Number.isNaN(Date.parse(String(latest.releasedAt || '')))) {
    fail(`${channelKey}: latest.releasedAt is not a valid date`);
  }
  if (!Array.isArray(latest.notes) || latest.notes.some((note) => typeof note !== 'string')) {
    fail(`${channelKey}: latest.notes must be an array of strings`);
  }

  const file = String(latest.file || '');
  if (!file.startsWith('downloads/') || file.includes('..') || path.isAbsolute(file)) {
    fail(`${channelKey}: latest.file must be a relative path under downloads/`);
    return;
  }

  const apkPath = path.resolve(siteDir, file);
  if (!apkPath.startsWith(siteDir + path.sep)) {
    fail(`${channelKey}: latest.file escapes the site directory`);
    return;
  }

  try {
    const info = await stat(apkPath);
    if (!info.isFile()) {
      fail(`${channelKey}: ${file} is not a file`);
      return;
    }
    if (info.size !== latest.sizeBytes) {
      fail(`${channelKey}: ${file} is ${info.size} bytes, manifest says ${latest.sizeBytes}`);
    }

    const signature = (await readFile(apkPath)).subarray(0, 4).toString('hex');
    if (signature !== '504b0304') {
      fail(`${channelKey}: ${file} does not start with a ZIP/APK signature`);
    }

    const actualHash = await sha256File(apkPath);
    if (actualHash !== latest.sha256) {
      fail(`${channelKey}: ${file} SHA-256 is ${actualHash}, manifest says ${latest.sha256}`);
    }

    console.log(
      `${label.padEnd(4)} ${String(latest.versionName).padEnd(16)} code ${String(latest.versionCode).padEnd(3)} ` +
      `${(info.size / 1048576).toFixed(1)} MB  ${actualHash.slice(0, 12)}…`
    );
  } catch (error) {
    fail(`${channelKey}: cannot read ${file} (${error.code || error.message})`);
  }
}

async function collectHtmlFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectHtmlFiles(full)));
    } else if (entry.isFile() && entry.name.endsWith('.html')) {
      files.push(full);
    }
  }
  return files;
}

function relLabel(file) {
  return path.relative(siteDir, file).split(path.sep).join('/');
}

async function checkHtmlPage(htmlPath) {
  const label = relLabel(htmlPath);
  const pageDir = path.dirname(htmlPath);
  const html = await readFile(htmlPath, 'utf8');
  const refs = [...html.matchAll(/(?:href|src)="([^"]+)"/g)].map((match) => match[1]);

  for (const ref of refs) {
    if (/^(?:#|https?:|mailto:|tel:|data:)/i.test(ref)) continue;
    if (ref.startsWith('/')) {
      fail(`${label}: absolute path "${ref}" breaks GitHub Pages subpath hosting`);
      continue;
    }
    if (ref.startsWith('//')) {
      fail(`${label}: protocol-relative path "${ref}" is not allowed`);
      continue;
    }
    const clean = ref.split(/[?#]/)[0];
    if (!clean || clean === '.' || clean === './') continue;
    const target = path.resolve(pageDir, clean);
    if (!target.startsWith(siteDir + path.sep)) {
      fail(`${label}: link "${ref}" escapes the site directory`);
      continue;
    }
    try {
      await stat(target);
    } catch (error) {
      fail(`${label}: local target "${ref}" is missing`);
    }
  }

  const externalResources = [
    ...html.matchAll(/<(?:script|link)\b[^>]+(?:src|href)="(https?:\/\/[^"]+)"/gi)
  ].map((match) => match[1]);
  if (externalResources.length > 0) {
    fail(`${label}: third-party script/style resources are not allowed: ${externalResources.join(', ')}`);
  }

  const ogImage = html.match(/<meta\s+property="og:image"\s+content="([^"]+)"/i)?.[1];
  if (ogImage) {
    if (/^https?:\/\//i.test(ogImage)) {
      fail(`${label}: og:image must be a local asset for self-contained hosting`);
    } else {
      try {
        await stat(path.resolve(pageDir, ogImage));
      } catch (error) {
        fail(`${label}: og:image target "${ogImage}" is missing`);
      }
    }
  }
}

async function checkHtmlLinks() {
  const pages = await collectHtmlFiles(siteDir);
  if (pages.length === 0) {
    fail('site: no HTML pages found');
    return;
  }
  for (const page of pages) {
    await checkHtmlPage(page);
  }
  console.log(`HTML  ${String(pages.length).padStart(2)} pages  ${pages.map((page) => relLabel(page)).join(', ')}`);
}

async function main() {
  const manifestPath = path.join(siteDir, 'data', 'releases.json');
  let manifest;
  try {
    manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  } catch (error) {
    console.error(`Cannot read ${manifestPath}: ${error.message}`);
    process.exit(1);
    return;
  }

  if (manifest.schemaVersion !== 1) {
    fail('releases.json: schemaVersion must be 1');
  }
  if (!manifest.channels || typeof manifest.channels !== 'object') {
    fail('releases.json: channels object is missing');
  } else {
    const allowedChannels = ['stable', 'preview'];
    for (const key of allowedChannels) {
      if (!manifest.channels[key]) {
        fail(`releases.json: channel "${key}" is missing`);
      }
    }
    for (const key of Object.keys(manifest.channels)) {
      if (!allowedChannels.includes(key)) {
        fail(`releases.json: public site only publishes stable and preview channels; remove "${key}"`);
      }
    }

    const packages = new Set();
    for (const [key, channel] of Object.entries(manifest.channels)) {
      if (!channel || typeof channel !== 'object') {
        fail(`${key}: channel must be an object`);
        continue;
      }
      if (channel.packageName) {
        if (packages.has(channel.packageName)) fail(`${key}: duplicate packageName ${channel.packageName}`);
        packages.add(channel.packageName);
      }
      await checkApk(key, channel);
    }
  }

  await checkHtmlLinks();

  if (errors.length > 0) {
    console.error('\nSite check failed:');
    for (const error of errors) console.error(` - ${error}`);
    process.exit(1);
  }

  console.log('\nSite check passed.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
