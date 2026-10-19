// Typed answers: small typos count as correct, unless the typo is itself
// another real word (affect/effect, adapt/adopt) — then the difference is the point.

export type GradeResult = "correct" | "typo" | "wrong";

/** Edit distance where swapping two neighbouring letters ("sustian") counts as one typo. */
export function editDistance(a: string, b: string): number {
  const d = Array.from({ length: a.length + 1 }, (_, i) =>
    Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)),
  );
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      }
    }
  }
  return d[a.length][b.length];
}

export function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[’']/g, "'")
    .replace(/[^a-z'\- ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** British/American spelling pairs we accept as identical. */
function spellingVariants(s: string): string[] {
  return [
    s,
    s.replace(/ise(s|d)?$/, "ize$1").replace(/isation/, "ization").replace(/yse(s|d)?$/, "yze$1"),
    s.replace(/ize(s|d)?$/, "ise$1").replace(/ization/, "isation").replace(/yze(s|d)?$/, "yse$1"),
  ];
}

function allowedTypos(length: number): number {
  if (length <= 4) return 0;
  if (length <= 8) return 1;
  return 2;
}

/**
 * @param realWords other real words the student might confuse with this one
 *   (list words, their families, confusables). A typo that lands on one is wrong.
 */
export function gradeTyped(input: string, expected: string, realWords: Iterable<string> = []): GradeResult {
  const given = normalize(input);
  const target = normalize(expected);
  if (!given) return "wrong";
  if (spellingVariants(given).some((v) => spellingVariants(target).includes(v))) return "correct";

  for (const w of realWords) {
    const real = normalize(w);
    if (real !== target && real === given) return "wrong";
  }
  return editDistance(given, target) <= allowedTypos(target.length) ? "typo" : "wrong";
}
