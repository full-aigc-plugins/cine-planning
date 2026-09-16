// Animatic compilation: turn an accepted ShotList into an edit-decision-1.1.0
// document for the host to route to the video composition plugin. This module
// emits data only — the receiving plugin owns schema validation and rendering.

const buildUniverse = (shotList) => ({
  words: new Map((shotList.speech?.words ?? []).map((word) => [word.id, word])),
  moments: new Map((shotList.moments ?? []).map((moment) => [moment.id, moment])),
  selections: new Map((shotList.selections ?? []).map((selection) => [selection.id, selection])),
});

function resolveAnchorTicks(anchor, universe) {
  const at = anchor.at ?? '';
  const offset = anchor.offsetTicks ?? 0;
  const wordTicks = (wordId, affinity) => {
    const word = universe.words.get(wordId);
    if (!word) throw new Error(`anchor references unknown word: ${wordId}`);
    return affinity === 'end' ? word.endTicks : word.startTicks;
  };
  if (at === 'speech:start') {
    const first = universe.words.values().next();
    return (first.done ? undefined : first.value.startTicks ?? 0) + offset;
  }
  if (at === 'speech:end') {
    const words = [...universe.words.values()];
    if (!words.length) throw new Error('speech:end requires speech words');
    return words.at(-1).endTicks + offset;
  }
  if (at.startsWith('tick:')) return Number(at.slice(5)) + offset;
  if (at.startsWith('moment:')) {
    const moment = universe.moments.get(at.slice(7));
    if (!moment) throw new Error(`anchor references unknown moment: ${at.slice(7)}`);
    return wordTicks(moment.wordId, moment.affinity) + offset;
  }
  if (at.startsWith('selection:')) {
    const [, id, boundary] = at.split(':');
    if (!['start', 'end'].includes(boundary ?? '')) throw new Error(`invalid anchor form: ${anchor.at}`);
    const selection = universe.selections.get(id);
    if (!selection) throw new Error(`anchor references unknown selection: ${id}`);
    return boundary === 'start'
      ? wordTicks(selection.startWordId, selection.startAffinity) + offset
      : wordTicks(selection.endWordId, selection.endAffinity) + offset;
  }
  throw new Error(`invalid anchor form: ${anchor.at}`);
}

/**
 * Compile an accepted ShotList into an edit-decision-1.1.0 draft. One tick is
 * one frame of the shot list's rational fps. Shots with a bound, authorized,
 * hashed board become clips; shots without one are skipped and reported. A shot
 * list is either fully anchored or fully literal — mixing the two leaves the
 * timeline position policy undefined and is rejected.
 */
export function compileAnimatic(shotList) {
  const shots = shotList.shots ?? [];
  const anchoredCount = shots.filter((shot) => shot?.anchor !== undefined).length;
  if (anchoredCount > 0 && anchoredCount < shots.length) {
    throw new Error('mixed anchoring is not supported: anchor every shot or none');
  }
  const useAnchors = anchoredCount > 0;
  const universe = buildUniverse(shotList);

  const assetById = new Map((shotList.assets ?? []).map((asset) => [asset.id, asset]));
  const clips = [];
  const skippedShotIds = [];
  const warnings = [];
  let literalCursor = 0;
  for (const [index, shot] of shots.entries()) {
    const panel = (shot.panels ?? []).find((candidate) => candidate.assetId !== undefined);
    const asset = panel === undefined ? undefined : assetById.get(panel.assetId);
    if (panel === undefined || asset === undefined || asset.kind !== 'board') {
      skippedShotIds.push(shot.id);
      warnings.push({ code: 'PANEL_IMAGE_MISSING', path: `$.shots[${index}]`, message: `shot ${shot.id} has no bound board asset; skipped in animatic` });
      continue;
    }
    const clip = {
      id: `C${shot.id.slice(1)}`,
      assetId: asset.id,
      sourceInTicks: 0,
      sourceOutTicks: shot.plannedDurationTicks,
      track: 0,
      transition: 'cut',
      gainDb: 0,
    };
    if (useAnchors) {
      // Resolve up front so unresolvable anchors fail here, not downstream.
      resolveAnchorTicks(shot.anchor, universe);
      clip.anchor = { at: shot.anchor.at, ...(shot.anchor.offsetTicks !== undefined ? { offsetTicks: shot.anchor.offsetTicks } : {}) };
    } else {
      clip.timelineInTicks = literalCursor;
      literalCursor += shot.plannedDurationTicks;
    }
    clips.push(clip);
  }

  const editDecision = {
    schemaVersion: '1.1.0',
    id: `${shotList.id}-animatic`,
    revision: shotList.revision,
    timebase: { numerator: shotList.fps.denominator, denominator: shotList.fps.numerator },
    clips,
    ...(shotList.speech !== undefined ? { speech: shotList.speech } : {}),
    ...(shotList.moments !== undefined ? { moments: shotList.moments } : {}),
    ...(shotList.selections !== undefined ? { selections: shotList.selections } : {}),
  };
  return { editDecision, skippedShotIds, warnings };
}
