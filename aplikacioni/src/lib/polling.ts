// A completion-based timer prevents overlapping reads. No personal state is persisted.
export function startPolling<T>({ read, receive, failed, interval = 5000, timeout = 12000 }: {
  read: (signal: AbortSignal) => Promise<T>; receive: (data: T) => void;
  failed: () => void; interval?: number; timeout?: number;
}) {
  let stopped = false, running = false, generation = 0, rerun = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let controller: AbortController | undefined;
  async function run() {
    if (stopped) return;
    if (running) { rerun = true; return; }
    clearTimeout(timer); running = true;
    const current = generation;
    const active = new AbortController(); controller = active;
    const deadline = setTimeout(() => active.abort(), timeout);
    try {
      const data = await read(active.signal);
      if (!stopped && current === generation && !active.signal.aborted) receive(data);
    } catch { if (!stopped && current === generation) failed(); }
    finally {
      clearTimeout(deadline); running = false;
      if (!stopped) { const delay = rerun ? 0 : interval; rerun = false; timer = setTimeout(run, delay); }
    }
  }
  void run();
  return {
    refresh() { void run(); },
    invalidate() { generation++; controller?.abort(); rerun = true; void run(); },
    stop() { stopped = true; generation++; clearTimeout(timer); controller?.abort(); },
  };
}
