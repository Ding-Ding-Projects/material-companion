import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, basename } from 'node:path';
import { expectedOutput, createOutputStage, publishOutput } from '../../extension/output.mjs';

async function fixture(run) {
  const root = await mkdtemp(join(tmpdir(), 'companion-output-test-'));
  try { await run(root); }
  finally {
    assert.ok(basename(root).startsWith('companion-output-test-'));
    await rm(root, { recursive: true, force: true });
  }
}
async function produce(stage) {
  for (const name of expectedOutput) await writeFile(join(stage, name), 'current-' + name);
}

test('publishing fresh output excludes and preserves obsolete files', () => fixture(async root => {
  await mkdir(join(root, 'dist'));
  await writeFile(join(root, 'dist', 'obsolete.txt'), 'previous output');
  const stage = await createOutputStage(root);
  await produce(stage);
  const result = await publishOutput(root, stage);
  assert.deepEqual((await readdir(result.output)).sort(), [...expectedOutput]);
  assert.equal(await readFile(join(result.preservedOutput, 'obsolete.txt'), 'utf8'), 'previous output');
  assert.equal(await readFile(join(result.output, 'workspace.js'), 'utf8'), 'current-workspace.js');
}));

test('unexpected staging output is rejected before replacing current output', () => fixture(async root => {
  await mkdir(join(root, 'dist'));
  await writeFile(join(root, 'dist', 'previous.txt'), 'retained');
  const stage = await createOutputStage(root);
  await produce(stage);
  await writeFile(join(stage, 'unexpected.txt'), 'not declared');
  await assert.rejects(publishOutput(root, stage), /inventory/);
  assert.equal(await readFile(join(root, 'dist', 'previous.txt'), 'utf8'), 'retained');
}));

test('missing expected output cannot replace a valid prior directory', () => fixture(async root => {
  await mkdir(join(root, 'dist'));
  await writeFile(join(root, 'dist', 'previous.txt'), 'retained');
  const stage = await createOutputStage(root);
  await writeFile(join(stage, 'workspace.js'), 'incomplete');
  await assert.rejects(publishOutput(root, stage), /inventory/);
  assert.equal(await readFile(join(root, 'dist', 'previous.txt'), 'utf8'), 'retained');
}));

test('an unowned staging path cannot be published', () => fixture(async root => {
  const other = join(root, 'elsewhere');
  await mkdir(other);
  await produce(other);
  await assert.rejects(publishOutput(root, other), /owned/);
}));
