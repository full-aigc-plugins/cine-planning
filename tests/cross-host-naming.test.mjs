import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, extname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const ROLE_ROOTS = ['director', 'script', 'storyboard'];
const BANNED = ['codex' + '-director', 'codex' + '-script', 'codex' + '-storyboard', 'codex' + '-image-factory'];
const TEXT_EXTENSIONS = new Set(['.md', '.json', '.mjs', '.js', '.yaml', '.yml']);

function visit(directory, violations) {
  for (const name of readdirSync(directory)) {
    const path = join(directory, name);
    const rel = relative(ROOT, path).replaceAll('\\', '/');
    for (const obsolete of BANNED) {
      if (rel.includes(obsolete)) violations.push(`path:${rel}:${obsolete}`);
    }
    if (statSync(path).isDirectory()) { visit(path, violations); continue; }
    if (!TEXT_EXTENSIONS.has(extname(path))) continue;
    const content = readFileSync(path, 'utf8');
    for (const obsolete of BANNED) {
      if (content.includes(obsolete)) violations.push(`content:${rel}:${obsolete}`);
    }
  }
}

test('future role plugins use host-neutral public names', () => {
  const violations = [];
  for (const role of ROLE_ROOTS) visit(join(ROOT, role), violations);
  assert.deepEqual(violations, []);
});
