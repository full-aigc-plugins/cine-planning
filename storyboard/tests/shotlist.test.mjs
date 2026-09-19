import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { validateShotList, diffShotLists, upstreamChanges, estimateSpeechUnits } from '../src/check.mjs';
import { compileAnimatic } from '../src/animatic.mjs';
import { main } from '../bin/storyboard';

const load = (name) => JSON.parse(readFileSync(`tests/contract_cases/${name}.json`, 'utf8'));
const positive = () => load('positive-shotlist');
const codes = (result) => result.issues.map((item) => item.code);

test('positive contract case passes every gate', () => {
  const result = validateShotList(positive());
  assert.equal(result.accepted, true);
  assert.deepEqual(codes(result).filter((code) => code === 'error'), []);
  assert.equal(result.summary.shots, 4);
  assert.equal(result.summary.plannedTicks, 390);
  assert.equal(result.summary.anchored, 4);
});

test('dangling character, prop and asset references are rejected', () => {
  const doc = positive();
  doc.shots[0].characterRefs.push('char:ghost');
  doc.shots[0].propRefs.push('prop:macguffin');
  doc.shots[0].panels[0].assetId = 'A99';
  doc.shots[0].dialogue[0].characterRef = 'char:ghost';
  const result = validateShotList(doc);
  assert.deepEqual(codes(result), ['DANGLING_CHARACTER', 'DANGLING_PROP', 'DANGLING_CHARACTER', 'DANGLING_ASSET']);
});

test('unknown fields and duplicate ids are rejected as shape errors', () => {
  const doc = positive();
  doc.autoCamera = true;
  doc.shots[1].mood = 'quirky';
  doc.props.push({ id: 'prop:phone-2', name: '手机' });
  const result = validateShotList(doc);
  assert.ok(codes(result).filter((code) => code === 'SHAPE').length >= 2);
  assert.ok(codes(result).includes('DUPLICATE_ENTITY'));
});

test('screen direction flip is reported and a neutral shot breaks the chain', () => {
  const doc = positive();
  doc.shots[2].characterRefs = ['char:leo'];
  const flipped = validateShotList(doc);
  assert.ok(codes(flipped).includes('DIRECTION_JUMP'));
  const neutral = positive();
  neutral.shots[2].direction = 'center';
  assert.ok(!codes(validateShotList(neutral)).includes('DIRECTION_JUMP'));
});

test('duration drift is measured against the target and survives reorder', () => {
  const drifted = positive();
  drifted.targetDurationTicks = 300;
  const result = validateShotList(drifted);
  assert.ok(codes(result).includes('DURATION_DRIFT'));
  assert.equal(result.summary.plannedTicks, 390);
  const reordered = positive();
  [reordered.shots[0], reordered.shots[3]] = [reordered.shots[3], reordered.shots[0]];
  assert.equal(validateShotList(reordered).summary.plannedTicks, 390);
});

test('missing images must not impersonate generated ones and unauthorized assets are refused', () => {
  const doc = positive();
  delete doc.assets[0].sha256;
  const impersonated = validateShotList(doc);
  assert.ok(codes(impersonated).includes('IMAGE_IMPERSONATED'));
  const unauthorized = positive();
  unauthorized.assets[1].authorized = false;
  assert.ok(codes(validateShotList(unauthorized)).includes('UNAUTHORIZED_GENERATION'));
  const declared = positive();
  declared.assets.push({ id: 'A05', kind: 'board', authorized: true, source: 'image-factory@2' });
  declared.shots[3].panels[0].assetId = 'A05';
  const missing = validateShotList(declared);
  assert.ok(codes(missing).includes('IMAGE_MISSING'));
});

test('speech ordering, word references and anchor references are checked', () => {
  const doc = positive();
  [doc.speech.words[0], doc.speech.words[1]] = [doc.speech.words[1], doc.speech.words[0]];
  assert.ok(codes(validateShotList(doc)).includes('SPEECH_ORDER'));
  const unknownWord = positive();
  unknownWord.moments[0].wordId = 'W99';
  assert.ok(codes(validateShotList(unknownWord)).includes('WORD_REFERENCE'));
  const unknownAnchor = positive();
  unknownAnchor.shots[1].anchor = { at: 'moment:missing' };
  assert.ok(codes(validateShotList(unknownAnchor)).includes('ANCHOR_REFERENCE'));
});

test('dialogue length is estimated against shot capacity', () => {
  assert.equal(estimateSpeechUnits('我们已经上线了', 'zh'), 7);
  assert.equal(estimateSpeechUnits('a demonstration', 'en'), 5);
  const doc = positive();
  doc.shots[1].dialogue.push({ characterRef: 'char:leo', text: '这一段塞进了一句远超镜头容量需要的长台词' });
  const result = validateShotList(doc);
  assert.ok(codes(result).includes('DIALOGUE_TOO_LONG'));
});

test('revision diff keeps identities stable across reorder and reports upstream changes', () => {
  const next = positive();
  next.revision = 2;
  [next.shots[0], next.shots[3]] = [next.shots[3], next.shots[0]];
  const diff = diffShotLists(positive(), next);
  assert.deepEqual(diff.added, []);
  assert.deepEqual(diff.removed, []);
  assert.deepEqual(diff.moved, ['S001', 'S004']);
  const stale = positive();
  stale.upstream.directorPlan = 'director-plan@3';
  assert.deepEqual(upstreamChanges(positive(), stale), ['directorPlan']);
});

test('animatic compiles anchored shots into an edit-decision-1.1.0 draft', () => {
  const result = compileAnimatic(positive());
  assert.deepEqual(result.skippedShotIds, []);
  assert.deepEqual(result.editDecision.clips.map((clip) => clip.id), ['C001', 'C002', 'C003', 'C004']);
  assert.deepEqual(result.editDecision.timebase, { numerator: 1, denominator: 30 });
  assert.equal(result.editDecision.clips[1].anchor.at, 'moment:answer');
  assert.equal(result.editDecision.schemaVersion, '1.1.0');
  assert.equal(result.editDecision.speech.language, 'zh');
});

test('animatic skips shots without boards and rejects mixed anchoring', () => {
  const doc = positive();
  doc.shots[1].panels[0].assetId = undefined;
  const result = compileAnimatic(doc);
  assert.deepEqual(result.skippedShotIds, ['S002']);
  assert.equal(result.editDecision.clips.length, 3);
  const literal = positive();
  for (const [index, shot] of literal.shots.entries()) {
    shot.anchor = undefined;
    delete shot.anchor;
  }
  const literalResult = compileAnimatic(literal);
  assert.deepEqual(literalResult.editDecision.clips.map((clip) => clip.timelineInTicks), [0, 150, 210, 300]);
  const mixed = positive();
  delete mixed.shots[3].anchor;
  assert.throws(() => compileAnimatic(mixed), /mixed anchoring/);
});

test('cli check and animatic commands run end to end', async () => {
  const out = [];
  const io = { stdout: { write: (value) => out.push(value) }, stderr: { write: (value) => out.push(value) } };
  const code = await main(['check', 'tests/contract_cases/positive-shotlist.json'], io);
  assert.equal(code, 0);
  const report = JSON.parse(out.join(''));
  assert.equal(report.accepted, true);
  const animated = await main(['animatic', 'tests/contract_cases/positive-shotlist.json'], io);
  assert.equal(animated, 0);
  const bad = await main(['check', 'tests/contract_cases/missing-file.json'], io);
  assert.equal(bad, 1);
});
