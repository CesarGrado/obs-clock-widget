export const alignedDelay = (now: number, seconds: boolean): number => {
  const interval = seconds ? 1_000 : 60_000;
  return interval - (now % interval) || interval;
};

export function startClock(tick: () => void, seconds: boolean): () => void {
  let timer: ReturnType<typeof setTimeout> | undefined; let stopped = false;
  const schedule = () => { if (stopped) return; timer = setTimeout(run, alignedDelay(Date.now(), seconds)); };
  const run = () => { tick(); schedule(); };
  const visibility = () => { if (document.visibilityState === 'visible') { if (timer) clearTimeout(timer); run(); } };
  tick(); schedule(); document.addEventListener('visibilitychange', visibility);
  return () => { stopped = true; if (timer) clearTimeout(timer); document.removeEventListener('visibilitychange', visibility); };
}
