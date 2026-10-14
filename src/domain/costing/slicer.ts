/**
 * Parse filament weight and print time from text copied out of a slicer.
 *
 * Supported examples:
 *   Bambu Studio / OrcaSlicer UI:  "Total filament: 48.23 g"  "Total time: 1h 36m"  "Model printing time: 1h30m"
 *   OrcaSlicer / Prusa G-code:     "; total filament used [g] = 48.23"  "; estimated printing time (normal mode) = 1h 36m 12s"
 *   Plain text:                    "48 g, 1:36"  "2d 3h 4m"
 *
 * Returns grams for the whole plate (the slicer total, which already includes supports, purge
 * and wipe tower) and hours as a decimal. Fields that cannot be found are null.
 */
export interface SlicerParseResult {
  grams: number | null;
  hours: number | null;
}

function parseDuration(s: string): number | null {
  const colon = s.match(/\b(\d{1,3}):([0-5]\d)(?::([0-5]\d))?\b/);
  const d = s.match(/(\d+(?:\.\d+)?)\s*d(?:ays?)?\b/i);
  const h = s.match(/(\d+(?:\.\d+)?)\s*h(?:ours?|rs?)?\b/i) ?? s.match(/(\d+(?:\.\d+)?)\s*h(?=\s*\d)/i);
  const m = s.match(/(\d+(?:\.\d+)?)\s*m(?:in(?:ute)?s?)?(?![a-z])/i);
  const sec = s.match(/(\d+(?:\.\d+)?)\s*s(?:ec(?:ond)?s?)?(?![a-z])/i);
  if (d || h || m || sec) {
    const total = Number(d?.[1] ?? 0) * 24 + Number(h?.[1] ?? 0) + Number(m?.[1] ?? 0) / 60 + Number(sec?.[1] ?? 0) / 3600;
    return total > 0 ? total : null;
  }
  if (colon) {
    return Number(colon[1]) + Number(colon[2]) / 60 + Number(colon[3] ?? 0) / 3600;
  }
  return null;
}

export function parseSlicerSummary(text: string): SlicerParseResult {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  // Grams: prefer lines that say "total", then any "filament/weight ... g" line.
  let grams: number | null = null;
  const gramLine = (l: string) => {
    const bracket = l.match(/\[g\]\s*[=:]\s*([\d.,]+)/i);
    if (bracket) return Number(bracket[1]!.replace(/,/g, ""));
    const inline = l.match(/([\d.,]+)\s*g\b/i);
    return inline ? Number(inline[1]!.replace(/,/g, "")) : null;
  };
  const gramCandidates = lines.filter((l) => /filament|weight|material|used/i.test(l) && /\bg\b|\[g\]/i.test(l));
  const totalGram = gramCandidates.find((l) => /total/i.test(l)) ?? gramCandidates[0];
  if (totalGram) grams = gramLine(totalGram);
  if (grams === null) {
    const any = lines.map(gramLine).find((v) => v !== null && v > 0);
    grams = any ?? null;
  }

  // Time: prefer total time, then "printing time", then any duration-looking line.
  let hours: number | null = null;
  const timeCandidates = lines.filter((l) => /time|duration|estimated/i.test(l));
  const ordered = [
    ...timeCandidates.filter((l) => /total/i.test(l)),
    ...timeCandidates.filter((l) => /print/i.test(l)),
    ...timeCandidates,
    ...lines,
  ];
  for (const l of ordered) {
    const afterSep = l.includes("=") ? l.slice(l.indexOf("=") + 1) : l.includes(":") && /[a-z]/i.test(l.split(":")[0]!) ? l.slice(l.indexOf(":") + 1) : l;
    // Skip gram-only lines so "48 g" is not mistaken for minutes/hours.
    if (/\bg\b|\[g\]/i.test(afterSep) && !/\d\s*[hms]\b/i.test(afterSep)) continue;
    const v = parseDuration(afterSep);
    if (v !== null) {
      hours = v;
      break;
    }
  }

  return {
    grams: grams !== null && Number.isFinite(grams) && grams > 0 ? Math.round(grams * 100) / 100 : null,
    hours: hours !== null && Number.isFinite(hours) ? Math.round(hours * 10000) / 10000 : null,
  };
}
