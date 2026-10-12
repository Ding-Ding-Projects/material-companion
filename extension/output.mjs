import { mkdir, mkdtemp, readdir, lstat, realpath, rename } from 'node:fs/promises';
import { resolve, join, relative, isAbsolute } from 'node:path';
import { randomUUID } from 'node:crypto';

export const expectedOutput = Object.freeze([
  'background.js', 'build.json', 'manifest.json', 'workspace.html', 'workspace.js',
]);

async function directory(path) {
  const info = await lstat(path);
  if (!info.isDirectory() || info.isSymbolicLink()) throw new Error('Output directory must be a real directory.');
}

export async function createOutputStage(root) {
  root = await realpath(resolve(root));
  const staging = join(root, '.build');
  await mkdir(staging, { recursive: true });
  await directory(staging);
  if (await realpath(staging) !== staging) throw new Error('Staging directory must not redirect outside the producer.');
  return mkdtemp(join(staging, 'extension-'));
}

export async function validateOutput(path) {
  await directory(path);
  const entries = await readdir(path, { withFileTypes: true });
  const names = entries.map(entry => entry.name).sort();
  if (names.length !== expectedOutput.length || names.some((name, index) => name !== expectedOutput[index])) {
    throw new Error('Extension output inventory differs from the declared files.');
  }
  if (entries.some(entry => !entry.isFile() || entry.isSymbolicLink())) throw new Error('Extension output contains an indirect or non-file entry.');
  return names;
}

export async function publishOutput(root, stage) {
  root = await realpath(resolve(root));
  stage = await realpath(resolve(stage));
  const stagingRoot = join(root, '.build');
  const within = relative(stagingRoot, stage);
  if (!within || within.startsWith('..') || isAbsolute(within) || within.includes('/') || within.includes('\\')) {
    throw new Error('Output stage must be an owned immediate staging child.');
  }
  await validateOutput(stage);
  const output = join(root, 'dist');
  const backup = join(stagingRoot, 'previous-' + randomUUID());
  let preserved = false;
  try { await directory(output); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  try { await rename(output, backup); preserved = true; }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  try { await rename(stage, output); }
  catch (error) {
    if (preserved) await rename(backup, output);
    throw error;
  }
  return { output, preservedOutput: preserved ? backup : null };
}
