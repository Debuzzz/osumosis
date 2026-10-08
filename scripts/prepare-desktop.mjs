import { cp, copyFile, mkdir, rm, chmod, writeFile, readFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const hosts = { win32: { x64: 'x86_64-pc-windows-msvc', arm64: 'aarch64-pc-windows-msvc' }, darwin: { x64: 'x86_64-apple-darwin', arm64: 'aarch64-apple-darwin' }, linux: { x64: 'x86_64-unknown-linux-gnu', arm64: 'aarch64-unknown-linux-gnu' } };
const target = hosts[process.platform]?.[process.arch];
if (!target) throw new Error(`Unsupported desktop host: ${process.platform}/${process.arch}`);
if (process.env.TAURI_ENV_TARGET_TRIPLE && process.env.TAURI_ENV_TARGET_TRIPLE !== target) throw new Error('Build on the target OS and CPU: native Node modules cannot be cross-compiled by this script.');
const backend = path.join(root, '.desktop/backend');
await mkdir(path.join(root, 'src-tauri/binaries'), { recursive: true });
const node = path.join(root, `src-tauri/binaries/osumosis-node-${target}${process.platform === 'win32' ? '.exe' : ''}`);
await copyFile(process.execPath, node); if (process.platform !== 'win32') await chmod(node, 0o755);
let license;
for (const candidate of [path.resolve(path.dirname(process.execPath), '../LICENSE'), path.join(path.dirname(process.execPath), 'LICENSE')]) {
  try { const contents = await readFile(candidate, 'utf8'); if (contents.includes('Node.js')) { license = contents; break; } } catch { /* Check the next distribution layout. */ }
}
if (!license) {
  const response = await fetch(`https://raw.githubusercontent.com/nodejs/node/${process.version}/LICENSE`, { signal: AbortSignal.timeout(20000) });
  if (!response.ok) throw new Error('Unable to retrieve the license for the bundled Node runtime.');
  license = await response.text();
}

await mkdir(backend, { recursive: true });
await writeFile(path.join(backend, 'NODE-LICENSE.txt'), license);
await copyFile(path.join(root, 'package.json'), path.join(backend, 'package.json'));
await copyFile(path.join(root, 'package-lock.json'), path.join(backend, 'package-lock.json'));
const run = (args, cwd) => new Promise((resolve, reject) => {
  // Invoke npm through Node so this works in cmd.exe without shell quoting.
  const child = spawn(process.execPath, [process.env.npm_execpath, ...args], { cwd, stdio: 'inherit' });
  child.on('error', reject); child.on('exit', code => code === 0 ? resolve() : reject(new Error(`npm ${args[0]} failed (${code})`)));
});
await run(['ci', '--omit=dev', '--no-audit', '--no-fund', '--cache', process.env.npm_config_cache || path.join(root, '.cache/npm')], backend);
// Realm's npm package also ships ~650 MiB of mobile libraries, unused by its Node binding.
// Prune only the staged copy; keep the installed Node binding and licenses.
for (const folder of ['prebuilds/android', 'prebuilds/apple', 'binding/android', 'binding/apple', 'binding/jsi']) {
  await rm(path.join(backend, 'node_modules/realm', folder), { recursive: true, force: true });
}
await rm(path.join(backend, 'dist'), { recursive: true, force: true });
await cp(path.join(root, 'dist'), path.join(backend, 'dist'), { recursive: true });
await mkdir(path.join(backend, 'bin'), { recursive: true });
await copyFile(path.join(root, 'bin/check-runtime.mjs'), path.join(backend, 'bin/check-runtime.mjs'));
await new Promise((resolve, reject) => {
  const child = spawn(node, [path.join(backend, 'bin/check-runtime.mjs')], { cwd: backend, stdio: 'inherit' });
  child.on('error', reject); child.on('exit', code => code === 0 ? resolve() : reject(new Error('Staged native modules could not be loaded.')));
});
const nodeVersion = process.version;
await writeFile(path.join(backend, 'desktop-build.json'), JSON.stringify({ target, nodeVersion }, null, 2));
console.log(`Desktop backend prepared: ${target}, Node ${nodeVersion}.`);
