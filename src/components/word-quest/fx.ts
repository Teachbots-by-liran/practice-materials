// Sound, vibration and confetti. All optional: they fail silently where unsupported.

let ctx: AudioContext | null = null;

export type Sound = "good" | "bad" | "win" | "tap";

export function playSound(kind: Sound, enabled: boolean): void {
  if (!enabled) return;
  try {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    ctx = ctx ?? new AC();
    const notes = kind === "good" ? [660, 880] : kind === "win" ? [523, 659, 784, 1046] : kind === "tap" ? [520] : [220, 180];
    notes.forEach((f, k) => {
      const o = ctx!.createOscillator();
      const g = ctx!.createGain();
      const t = ctx!.currentTime + k * 0.09;
      o.type = kind === "bad" ? "triangle" : "sine";
      o.frequency.value = f;
      const peak = kind === "tap" ? 0.06 : 0.18;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(peak, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
      o.connect(g).connect(ctx!.destination);
      o.start(t);
      o.stop(t + 0.2);
    });
  } catch {}
}

export function buzz(pattern: number | number[]): void {
  try {
    navigator.vibrate?.(pattern);
  } catch {}
}

export function confetti(canvas: HTMLCanvasElement | null, n = 60): void {
  if (!canvas || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const r = canvas.getBoundingClientRect();
  const x = canvas.getContext("2d");
  if (!x) return;
  const dpr = window.devicePixelRatio || 1;
  canvas.width = r.width * dpr;
  canvas.height = r.height * dpr;
  x.scale(dpr, dpr);
  const cs = getComputedStyle(canvas);
  const colors = ["--brand", "--spark", "--good"].map((v) => cs.getPropertyValue(v).trim() || "#4F46E5");
  const ps = Array.from({ length: n }, () => ({
    x: r.width / 2,
    y: r.height * 0.35,
    vx: (Math.random() - 0.5) * 9,
    vy: -Math.random() * 9 - 3,
    s: Math.random() * 6 + 4,
    c: colors[Math.floor(Math.random() * colors.length)],
    a: Math.random() * 6,
  }));
  let t = 0;
  const frame = () => {
    x.clearRect(0, 0, r.width, r.height);
    for (const p of ps) {
      p.vy += 0.32;
      p.x += p.vx;
      p.y += p.vy;
      p.a += 0.2;
      x.save();
      x.translate(p.x, p.y);
      x.rotate(p.a);
      x.fillStyle = p.c;
      x.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2);
      x.restore();
    }
    if (++t < 80) requestAnimationFrame(frame);
    else x.clearRect(0, 0, r.width, r.height);
  };
  requestAnimationFrame(frame);
}

export function speak(text: string): void {
  try {
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "en-US";
    u.rate = 0.9;
    speechSynthesis.speak(u);
  } catch {}
}
