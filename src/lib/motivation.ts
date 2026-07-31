/** Short, non-cheesy motivational lines shown during Focus Mode. */

const DURING = [
  "Builders finish. That's the whole difference.",
  "Ugly and done beats perfect and imagined.",
  "You're solving a real problem right now.",
  "Ten focused minutes beats three distracted hours.",
  "Confusion is the feeling of learning. Keep going.",
  "Ship it rough. Improve it later.",
];

const COMPLETE = [
  "That's one more thing that exists because of you.",
  "You didn't watch a tutorial — you built something.",
  "Momentum beats motivation. You just built momentum.",
  "Real portfolios are made of finished small things.",
  "Show it to someone today. That's how it gets real.",
];

/** Deterministic per lesson so the message doesn't flicker on re-render. */
function pick(list: string[], seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return list[h % list.length];
}

export const focusMessage = (seed: string) => pick(DURING, seed);
export const completionMessage = (seed: string) => pick(COMPLETE, seed);
