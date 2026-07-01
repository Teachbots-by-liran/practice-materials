// Band III vocabulary list — Israeli Ministry of Education Bagrut (5-point level)
// Used to source vocab questions (10)–(14) in Module E exams.
// Words are drawn from the official Band III core list.

export const BAND_III = {
  verbs: [
    "achieve", "acquire", "adapt", "address", "advocate", "affect", "alter",
    "analyze", "announce", "aspire", "assist", "assume", "attract", "calculate",
    "capture", "challenge", "cite", "claim", "clarify", "combine", "commit",
    "compete", "comprehend", "concentrate", "conduct", "confirm", "consume",
    "contribute", "convert", "convey", "cooperate", "coordinate", "damage",
    "declare", "decline", "defend", "demonstrate", "deny", "derive", "design",
    "destroy", "detect", "determine", "develop", "devise", "discriminate",
    "distribute", "dominate", "eliminate", "emerge", "emphasize", "enable",
    "ensure", "establish", "estimate", "evaluate", "evolve", "exclude", "expand",
    "exploit", "explore", "facilitate", "generate", "ignore", "illustrate",
    "implement", "indicate", "influence", "integrate", "investigate", "justify",
    "maintain", "manage", "manufacture", "measure", "monitor", "motivate",
    "obtain", "organize", "overcome", "participate", "perceive", "perform",
    "promote", "propose", "pursue", "recruit", "reduce", "reflect", "reform",
    "regulate", "reinforce", "reject", "release", "represent", "require",
    "resolve", "restrict", "retain", "reveal", "seek", "select", "separate",
    "specify", "summarize", "supply", "sustain", "transfer", "transform",
    "transmit", "unite", "vary", "volunteer",
  ],

  nouns: [
    "absence", "achievement", "administration", "agency", "agreement",
    "analysis", "aspect", "assignment", "assistance", "assumption", "attraction",
    "authority", "barrier", "benefit", "boundary", "budget", "campaign",
    "capability", "capacity", "career", "category", "circumstance", "claim",
    "commitment", "community", "comparison", "competition", "concept", "conflict",
    "consequence", "contribution", "convention", "crisis", "criterion", "damage",
    "decision", "demonstration", "development", "discipline", "diversity",
    "element", "emergence", "evidence", "expertise", "facility", "factor",
    "feature", "function", "generation", "goal", "growth", "hypothesis",
    "identity", "impact", "initiative", "innovation", "inquiry", "institution",
    "interpretation", "investigation", "involvement", "leadership", "mechanism",
    "motivation", "objective", "observation", "opportunity", "outcome",
    "participation", "phenomenon", "policy", "principle", "process", "progress",
    "proportion", "provision", "resource", "responsibility", "revolution",
    "significance", "solution", "source", "strategy", "strength", "structure",
    "survey", "survival", "tendency", "territory", "tradition", "trend",
    "variety", "vision", "welfare",
  ],

  adjectives: [
    "absolute", "accessible", "accurate", "adequate", "ancient", "appropriate",
    "authentic", "central", "civil", "comprehensive", "confident", "consistent",
    "conventional", "crucial", "diverse", "dominant", "dynamic", "effective",
    "efficient", "essential", "ethical", "explicit", "external", "flexible",
    "formal", "fundamental", "global", "gradual", "ideal", "inevitable",
    "initial", "innovative", "intense", "legal", "logical", "mutual", "neutral",
    "obvious", "permanent", "physical", "precise", "primary", "professional",
    "radical", "rapid", "rational", "relevant", "rural", "secure", "sensitive",
    "severe", "significant", "stable", "substantial", "sufficient", "technical",
    "temporary", "traditional", "typical", "unique", "universal", "urban",
    "valid", "violent", "virtual", "vital", "voluntary",
  ],

  adverbs: [
    "absolutely", "accurately", "adequately", "apparently", "approximately",
    "certainly", "clearly", "consistently", "continuously", "directly",
    "effectively", "essentially", "eventually", "evidently", "explicitly",
    "fundamentally", "generally", "gradually", "increasingly", "inevitably",
    "initially", "largely", "merely", "normally", "obviously", "particularly",
    "permanently", "precisely", "rapidly", "readily", "relatively",
    "significantly", "specifically", "subsequently", "sufficiently", "typically",
    "universally", "virtually", "widely",
  ],

  chunks: [
    "a degree of", "about to", "aimed at", "all in all", "as a matter of fact",
    "as a whole", "at risk", "back up", "bear in mind", "better off", "bound to",
    "break down", "bring up", "by far", "by means of", "by no means", "carry on",
    "catch up with", "come across", "come up with", "common sense", "cope with",
    "end up", "figure out", "for good", "for the sake of", "from time to time",
    "get away with", "get on with", "get over", "get rid of", "give up",
    "go through", "in advance", "in detail", "in favor of", "in practice",
    "in relation to", "in short", "in terms of", "in the long run",
    "in the meantime", "let alone", "look out for", "make a difference",
    "make use of", "no wonder", "on average", "on behalf of", "on the contrary",
    "pay attention to", "point out", "prior to", "put forward", "put off",
    "put up with", "refer to", "rely on", "result in", "run into", "run out of",
    "set off", "set out", "settle down", "stand out", "take advantage of",
    "take for granted", "take over", "take up", "to some extent", "turn out",
    "work out",
  ],
} as const;

export type VocabCategory = keyof typeof BAND_III;

export function getRandomWords(category: VocabCategory, count: number): string[] {
  const words = [...BAND_III[category]] as string[];
  for (let i = words.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [words[i], words[j]] = [words[j], words[i]];
  }
  return words.slice(0, count);
}
