"use client";

import { useState } from "react";
import { joinClass, type CloudSession } from "./cloud";

export function Welcome({
  canJoin,
  notice,
  onJoin,
  onSolo,
}: {
  canJoin: boolean;
  notice?: string | null;
  onJoin: () => void;
  onSolo: (name: string) => void;
}) {
  const [solo, setSolo] = useState(!canJoin);
  const [name, setName] = useState("");

  return (
    <div className="wq-app">
      <main className="wq-stage" style={{ justifyContent: "center" }}>
        {notice && (
          <div className="wq-note-box" role="alert">
            {notice}
          </div>
        )}
        <div className="wq-logo" style={{ fontSize: 34 }}>
          Word<span>Quest</span>
        </div>
        <h1 className="wq-prompt">Learn the words that matter for your Bagrut, a few minutes a day.</h1>
        <p className="wq-sub">Short daily sessions. Words come back right before you&apos;d forget them.</p>
        {solo && (
          <>
            <label className="wq-label" htmlFor="wq-name" style={{ marginTop: 12 }}>
              What&apos;s your first name?
            </label>
            <input
              id="wq-name"
              className="wq-answer"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="given-name"
              maxLength={24}
              onKeyDown={(e) => {
                if (e.key === "Enter" && name.trim()) onSolo(name.trim());
              }}
            />
            <p className="wq-cue">Your progress stays on this phone. You can join a class later.</p>
          </>
        )}
      </main>
      <footer className="wq-dock">
        {solo ? (
          <>
            <button className="wq-btn wq-btn-primary" disabled={!name.trim()} onClick={() => onSolo(name.trim())}>
              Start
            </button>
            {canJoin && (
              <button className="wq-btn wq-btn-link" onClick={() => setSolo(false)}>
                I have a class code
              </button>
            )}
          </>
        ) : (
          <>
            <button className="wq-btn wq-btn-primary" onClick={onJoin}>
              Join my class
            </button>
            <button className="wq-btn wq-btn-link" onClick={() => setSolo(true)}>
              Practise on my own
            </button>
          </>
        )}
      </footer>
    </div>
  );
}

export function JoinForm({
  invite,
  signedInAs,
  onJoined,
  onCancel,
}: {
  /** Opened from a class link: the code is filled in and hidden. */
  invite?: { code: string; name: string } | null;
  /** Someone else's class is signed in on this phone. */
  signedInAs?: CloudSession | null;
  onJoined: (s: CloudSession) => void;
  onCancel: () => void;
}) {
  const [code, setCode] = useState(invite?.code ?? "");
  const [nickname, setNickname] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const ready = code.replace(/[^a-z0-9]/gi, "").length >= 7 && nickname.trim() && /^\d{4}$/.test(pin);

  const submit = async () => {
    if (!ready || busy) return;
    setBusy(true);
    setError(null);
    const r = await joinClass(code, nickname, pin);
    setBusy(false);
    if (r.ok) onJoined(r.session);
    else setError(r.error);
  };

  return (
    <div className="wq-app">
      <main className="wq-stage">
        {invite ? (
          <>
            <div className="wq-logo">
              Word<span>Quest</span>
            </div>
            <div className="wq-eyebrow">Join your class</div>
            <h1 className="wq-prompt">{invite.name}</h1>
            {signedInAs && (
              <div className="wq-note-box">
                This phone is signed in as {signedInAs.nickname} in {signedInAs.className}. Joining here switches to {invite.name}.
              </div>
            )}
          </>
        ) : (
          <>
            <div className="wq-eyebrow">Join your class</div>
            <h1 className="wq-prompt">Your teacher will give you a class code</h1>
            <label className="wq-label" htmlFor="wq-code">
              Class code
            </label>
            <input
              id="wq-code"
              className="wq-answer"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="ABC-1234"
              autoCapitalize="characters"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              maxLength={10}
            />
          </>
        )}
        <label className="wq-label" htmlFor="wq-nick">
          Your name in this class
        </label>
        <input
          id="wq-nick"
          className="wq-answer"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          placeholder="e.g. Noa L."
          autoComplete="off"
          maxLength={24}
        />
        <label className="wq-label" htmlFor="wq-pin">
          4-digit PIN
        </label>
        <input
          id="wq-pin"
          className="wq-answer"
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
          inputMode="numeric"
          type="password"
          autoComplete="off"
          placeholder="••••"
          onKeyDown={(e) => e.key === "Enter" && submit()}
        />
        <p className="wq-cue">
          New here? Pick any 4 digits and remember them. Next time, use the same name and PIN to get your progress back on any phone.
        </p>
        {error && (
          <div className="wq-note-box" role="alert" style={{ background: "var(--bad-soft)", color: "var(--bad)" }}>
            {error}
          </div>
        )}
      </main>
      <footer className="wq-dock">
        <button className="wq-btn wq-btn-primary" disabled={!ready || busy} onClick={submit}>
          {busy ? "Joining…" : "Join"}
        </button>
        <button className="wq-btn wq-btn-link" onClick={onCancel}>
          {invite ? "Not now" : "Back"}
        </button>
      </footer>
    </div>
  );
}
