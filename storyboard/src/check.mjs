// ShotList check compiler — the declarative gate before any production package leaves
// the storyboard domain. Self-contained: no cross-plugin imports (AGENTS.md), the
// emitted documents are consumed by the host and validated by their owning plugins.

const SHAPE = {
  top: ['schemaVersion', 'id', 'revision', 'fps', 'targetDurationTicks', 'upstream', 'characters', 'props', 'assets', 'speech', 'moments', 'selections', 'shots'],
  character: ['id', 'displayName', 'wardrobe'],
  prop: ['id', 'name'],
  asset: ['id', 'kind', 'path', 'sha256', 'authorized', 'source'],
  speech: ['language', 'words'],
  word: ['id', 'text', 'startTicks', 'endTicks'],
  moment: ['id', 'wordId', 'affinity'],
  selection: ['id', 'startWordId', 'startAffinity', 'endWordId', 'endAffinity'],
  shot: ['id', 'scene', 'slug', 'action', 'sound', 'direction', 'characterRefs', 'propRefs', 'dialogue', 'plannedDurationTicks', 'anchor', 'panels'],
  dialogue: ['characterRef', 'text'],
  anchor: ['at', 'offsetTicks'],
  panel: ['id', 'layout', 'assetId'],
};

const ISSUE_CODES = {
  SHAPE: 'error',
  DUPLICATE_ID: 'error',
  DUPLICATE_ENTITY: 'warning',
  DANGLING_CHARACTER: 'error',
  DANGLING_PROP: 'error',
  DANGLING_ASSET: 'error',
  WORD_REFERENCE: 'error',
  SPEECH_ORDER: 'error',
  ANCHOR_REFERENCE: 'error',
  DIRECTION_JUMP: 'warning',
  DURATION_DRIFT: 'error',
  IMAGE_MISSING: 'error',
  IMAGE_IMPERSONATED: 'error',
  UNAUTHORIZED_GENERATION: 'error',
  DIALOGUE_TOO_LONG: 'warning',
};

const isPlainObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const matches = (value, pattern) => typeof value === 'string' && new RegExp(`^${pattern}$`).test(value);

function issue(issues, code, path, message) {
  issues.push({ code, severity: ISSUE_CODES[code] ?? 'error', path, message });
}

function checkShape(value, allowed, path, issues, required = allowed) {
  if (!isPlainObject(value)) {
    issue(issues, 'SHAPE', path, 'must be an object');
    return false;
  }
  for (const key of Object.keys(value)) {
    if (!allowed.includes(key)) issue(issues, 'SHAPE', `${path}.${key}`, 'unknown field is not allowed');
  }
  for (const key of required) {
    if (!(key in value)) issue(issues, 'SHAPE', `${path}.${key}`, 'required field is missing');
  }
  return true;
}

function checkUnique(items, idField, path, issues) {
  const seen = new Set();
  for (const [index, item] of items.entries()) {
    const id = item?.[idField];
    if (id === undefined) continue;
    if (seen.has(id)) issue(issues, 'DUPLICATE_ID', `${path}[${index}].${idField}`, `duplicate id: ${id}`);
    seen.add(id);
  }
}

function idMap(items, idField) {
  const map = new Map();
  for (const item of items ?? []) if (item?.[idField] !== undefined) map.set(item[idField], item);
  return map;
}

function checkSemantics(shotList, issues) {
  const words = shotList.speech?.words ?? [];
  const wordIndex = idMap(words, 'id');
  let previousEnd = -1;
  for (const [index, word] of words.entries()) {
    if (!matches(word?.id, 'W[0-9]{1,6}')) issue(issues, 'SHAPE', `$.speech.words[${index}].id`, 'word id must match W[0-9]+');
    if (Number.isInteger(word?.startTicks) && Number.isInteger(word?.endTicks) && word.endTicks <= word.startTicks) {
      issue(issues, 'SHAPE', `$.speech.words[${index}]`, 'endTicks must exceed startTicks');
    } else if (word?.startTicks < previousEnd) {
      issue(issues, 'SPEECH_ORDER', `$.speech.words[${index}]`, 'words must be sorted and non-overlapping');
    }
    previousEnd = word?.endTicks ?? previousEnd;
  }
  const momentIds = new Set();
  for (const [index, moment] of (shotList.moments ?? []).entries()) {
    if (!matches(moment?.id, '[a-z][a-z0-9-]{0,39}')) { issue(issues, 'SHAPE', `$.moments[${index}].id`, 'invalid moment id'); continue; }
    if (momentIds.has(moment.id)) issue(issues, 'DUPLICATE_ID', `$.moments[${index}]`, `duplicate moment id: ${moment.id}`);
    momentIds.add(moment.id);
    if (!wordIndex.has(moment.wordId)) issue(issues, 'WORD_REFERENCE', `$.moments[${index}]`, `moment ${moment.id} references unknown word: ${moment.wordId}`);
  }
  const selectionIds = new Set();
  for (const [index, selection] of (shotList.selections ?? []).entries()) {
    if (!matches(selection?.id, '[a-z][a-z0-9-]{0,39}')) { issue(issues, 'SHAPE', `$.selections[${index}].id`, 'invalid selection id'); continue; }
    if (selectionIds.has(selection.id)) issue(issues, 'DUPLICATE_ID', `$.selections[${index}]`, `duplicate selection id: ${selection.id}`);
    selectionIds.add(selection.id);
    for (const field of ['startWordId', 'endWordId']) {
      if (!wordIndex.has(selection?.[field])) issue(issues, 'WORD_REFERENCE', `$.selections[${index}]`, `selection ${selection.id} references unknown word: ${selection?.[field]}`);
    }
  }
  return { wordIndex, momentIds, selectionIds };
}

const ANCHOR_FORM = /^(moment:[a-z][a-z0-9-]{0,39}|selection:[a-z][a-z0-9-]{0,39}:(start|end)|speech:(start|end)|tick:[0-9]+)$/;

function checkShots(shotList, issues, semantics) {
  const characters = idMap(shotList.characters, 'id');
  const props = idMap(shotList.props, 'id');
  const assets = idMap(shotList.assets, 'id');
  for (const [index, shot] of (shotList.shots ?? []).entries()) {
    const path = `$.shots[${index}]`;
    if (!matches(shot?.id, 'S[0-9]{3,4}')) issue(issues, 'SHAPE', `${path}.id`, 'shot id must match S[0-9]{3,4}');
    for (const ref of shot?.characterRefs ?? []) {
      if (!characters.has(ref)) issue(issues, 'DANGLING_CHARACTER', `${path}.characterRefs`, `unknown character: ${ref}`);
    }
    for (const ref of shot?.propRefs ?? []) {
      if (!props.has(ref)) issue(issues, 'DANGLING_PROP', `${path}.propRefs`, `unknown prop: ${ref}`);
    }
    for (const [dialogueIndex, line] of (shot?.dialogue ?? []).entries()) {
      if (!characters.has(line?.characterRef)) issue(issues, 'DANGLING_CHARACTER', `${path}.dialogue[${dialogueIndex}]`, `unknown character: ${line?.characterRef}`);
    }
    for (const [panelIndex, panel] of (shot?.panels ?? []).entries()) {
      const panelPath = `${path}.panels[${panelIndex}]`;
      if (panel?.assetId === undefined) continue;
      const asset = assets.get(panel.assetId);
      if (!asset) { issue(issues, 'DANGLING_ASSET', panelPath, `unknown asset: ${panel.assetId}`); continue; }
      if (asset.authorized === false) {
        issue(issues, 'UNAUTHORIZED_GENERATION', panelPath, `asset ${panel.assetId} is not authorized for generation`);
      }
      if (asset.path === undefined || asset.sha256 === undefined) {
        issue(issues, 'IMAGE_MISSING', panelPath, `asset ${panel.assetId} is bound as media but has no path/sha256`);
      }
    }
    const anchor = shot?.anchor;
    if (anchor !== undefined) {
      if (!ANCHOR_FORM.test(anchor?.at ?? '')) {
        issue(issues, 'SHAPE', `${path}.anchor.at`, `invalid anchor form: ${anchor?.at}`);
      } else if (anchor.at.startsWith('moment:') && !semantics.momentIds.has(anchor.at.slice(7))) {
        issue(issues, 'ANCHOR_REFERENCE', `${path}.anchor`, `anchor references unknown moment: ${anchor.at.slice(7)}`);
      } else if (anchor.at.startsWith('selection:')) {
        const id = anchor.at.split(':')[1];
        if (!semantics.selectionIds.has(id)) issue(issues, 'ANCHOR_REFERENCE', `${path}.anchor`, `anchor references unknown selection: ${id}`);
      }
    }
  }
  // 同名道具候选视为复制实体：道具是实体，候选走 assets，不重复登记
  const nameCounts = new Map();
  for (const prop of shotList.props ?? []) {
    nameCounts.set(prop?.name, (nameCounts.get(prop?.name) ?? 0) + 1);
  }
  for (const [name, count] of nameCounts) {
    if (count > 1) issue(issues, 'DUPLICATE_ENTITY', '$.props', `prop name registered ${count} times, candidates must reference one entity: ${name}`);
  }
}

function checkDirection(shotList, issues) {
  const shots = shotList.shots ?? [];
  for (const [index, shot] of shots.entries()) {
    const previous = shots[index - 1];
    if (previous === undefined) continue;
    const shared = (shot?.characterRefs ?? []).filter((ref) => (previous?.characterRefs ?? []).includes(ref));
    if (!shared.length || shot?.direction === 'center' || previous?.direction === 'center') continue;
    if (shot.direction !== previous.direction) {
      issue(issues, 'DIRECTION_JUMP', `$.shots[${index}]`,
        `screen direction flips for ${shared.join(', ')} between ${previous.id} and ${shot.id} without a neutral shot`);
    }
  }
}

// 发音单位估算（Hypit measure 的移植概念）：中文按汉字计，英文按音节组近似。
export function estimateSpeechUnits(text, language = 'zh') {
  const han = (text.match(/[\u4e00-\u9fff\u3040-\u30ff]/gu) ?? []).length;
  const latinWords = (text.match(/[A-Za-z0-9]+/gu) ?? []).length;
  if (language === 'zh') return han + latinWords;
  let syllables = 0;
  for (const word of text.match(/[A-Za-z]+/gu) ?? []) {
    syllables += Math.max(1, (word.toLowerCase().match(/[aeiouy]+/gu) ?? []).length);
  }
  return syllables;
}

function checkDialogue(shotList, issues, { unitsPerSecond = 4.5, tolerance = 1.15 } = {}) {
  const language = shotList.speech?.language ?? 'zh';
  const secondsPerTick = shotList.fps.denominator / shotList.fps.numerator;
  for (const [index, shot] of (shotList.shots ?? []).entries()) {
    const seconds = (shot?.plannedDurationTicks ?? 0) * secondsPerTick;
    for (const line of shot?.dialogue ?? []) {
      const units = estimateSpeechUnits(line?.text ?? '', language);
      const capacity = seconds * unitsPerSecond * tolerance;
      if (units > capacity) {
        issue(issues, 'DIALOGUE_TOO_LONG', `$.shots[${index}].dialogue`,
          `shot ${shot.id} fits ~${capacity.toFixed(1)} units at ${unitsPerSecond} u/s, dialogue needs ${units}`);
      }
    }
  }
}

/**
 * Check one ShotList revision. Returns structured gates, never throws for domain
 * findings; only unreadable input throws. `accepted` is true when no error-severity
 * issue remains (warnings do not block).
 */
export function validateShotList(shotList, options = {}) {
  const issues = [];
  if (!checkShape(shotList, SHAPE.top, '$', issues)) return { issues, accepted: false, summary: {} };
  checkShape(shotList.upstream, ['screenplay', 'directorPlan', 'shotIntents'], '$.upstream', issues, ['screenplay', 'directorPlan']);
  checkShape(shotList.fps, ['numerator', 'denominator'], '$.fps', issues);
  for (const [index, character] of (shotList.characters ?? []).entries()) checkShape(character, SHAPE.character, `$.characters[${index}]`, issues);
  for (const [index, prop] of (shotList.props ?? []).entries()) checkShape(prop, SHAPE.prop, `$.props[${index}]`, issues);
  for (const [index, asset] of (shotList.assets ?? []).entries()) {
    if (checkShape(asset, SHAPE.asset, `$.assets[${index}]`, issues) && asset.authorized === true && (asset.path !== undefined) !== (asset.sha256 !== undefined)) {
      issue(issues, 'IMAGE_IMPERSONATED', `$.assets[${index}]`, 'path and sha256 must be recorded together');
    }
  }
  if (shotList.speech !== undefined) {
    if (checkShape(shotList.speech, SHAPE.speech, '$.speech', issues)) {
      for (const [index, word] of (shotList.speech.words ?? []).entries()) checkShape(word, SHAPE.word, `$.speech.words[${index}]`, issues);
    }
  }
  for (const [index, moment] of (shotList.moments ?? []).entries()) checkShape(moment, SHAPE.moment, `$.moments[${index}]`, issues);
  for (const [index, selection] of (shotList.selections ?? []).entries()) checkShape(selection, SHAPE.selection, `$.selections[${index}]`, issues);
  for (const [index, shot] of (shotList.shots ?? []).entries()) {
    if (!checkShape(shot, SHAPE.shot, `$.shots[${index}]`, issues)) continue;
    for (const [panelIndex, panel] of (shot.panels ?? []).entries()) checkShape(panel, SHAPE.panel, `$.shots[${index}].panels[${panelIndex}]`, issues);
    for (const [dialogueIndex, line] of (shot.dialogue ?? []).entries()) checkShape(line, SHAPE.dialogue, `$.shots[${index}].dialogue[${dialogueIndex}]`, issues);
    if (shot.anchor !== undefined) checkShape(shot.anchor, SHAPE.anchor, `$.shots[${index}].anchor`, issues, ['at']);
  }
  const semantics = checkSemantics(shotList, issues);
  checkShots(shotList, issues, semantics);
  checkDirection(shotList, issues);
  checkDialogue(shotList, issues, options);
  checkUnique(shotList.shots ?? [], 'id', '$.shots', issues);
  checkUnique(shotList.assets ?? [], 'id', '$.assets', issues);
  const totalTicks = (shotList.shots ?? []).reduce((sum, shot) => sum + (shot?.plannedDurationTicks ?? 0), 0);
  if (Number.isInteger(shotList.targetDurationTicks) && totalTicks !== shotList.targetDurationTicks) {
    issue(issues, 'DURATION_DRIFT', '$', `planned shots total ${totalTicks} ticks, target is ${shotList.targetDurationTicks}`);
  }
  const summary = {
    shots: (shotList.shots ?? []).length,
    plannedTicks: totalTicks,
    targetTicks: shotList.targetDurationTicks,
    anchored: (shotList.shots ?? []).filter((shot) => shot?.anchor !== undefined).length,
    errors: issues.filter((item) => item.severity === 'error').length,
    warnings: issues.filter((item) => item.severity === 'warning').length,
  };
  return { issues, accepted: summary.errors === 0, summary };
}

/**
 * Revision diff: reordering must keep shot identities stable — moved ids are
 * reported, never silently renumbered.
 */
export function diffShotLists(previous, next) {
  const before = idMap(previous?.shots, 'id');
  const after = idMap(next?.shots, 'id');
  const added = [...after.keys()].filter((id) => !before.has(id));
  const removed = [...before.keys()].filter((id) => !after.has(id));
  const moved = [...before.keys()].filter((id) => after.has(id)
    && (previous.shots.findIndex((shot) => shot.id === id)) !== (next.shots.findIndex((shot) => shot.id === id)));
  const changed = [...before.keys()].filter((id) => after.has(id)
    && JSON.stringify(before.get(id)) !== JSON.stringify(after.get(id)));
  return { added, removed, moved, changed };
}

/** Upstream revision comparison: changed refs mark dependent work stale. */
export function upstreamChanges(previous, next) {
  const changed = [];
  for (const key of new Set([...Object.keys(previous?.upstream ?? {}), ...Object.keys(next?.upstream ?? {})])) {
    if ((previous?.upstream ?? {})[key] !== (next?.upstream ?? {})[key]) changed.push(key);
  }
  return changed;
}
