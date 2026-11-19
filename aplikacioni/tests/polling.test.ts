import { afterEach, expect, test, vi } from "vitest";
import { startPolling } from "../src/lib/polling";
afterEach(() => vi.useRealTimers());
test("reads again after five seconds, never overlaps a slow read", async () => {
  vi.useFakeTimers(); let resolve!: (n:number)=>void;
  const read=vi.fn(()=>new Promise<number>(r=>{resolve=r;})),receive=vi.fn();
  const poll=startPolling({read,receive,failed:vi.fn(),timeout:60000});
  await vi.advanceTimersByTimeAsync(10000); poll.refresh(); poll.refresh();
  expect(read).toHaveBeenCalledTimes(1);
  resolve(1); await vi.advanceTimersByTimeAsync(0);
  expect(receive).toHaveBeenCalledWith(1);
  await vi.advanceTimersByTimeAsync(1); expect(read).toHaveBeenCalledTimes(2);
  resolve(2); await vi.advanceTimersByTimeAsync(4999); expect(read).toHaveBeenCalledTimes(2);
  await vi.advanceTimersByTimeAsync(1); expect(read).toHaveBeenCalledTimes(3); poll.stop();
});
test("invalidated and unmounted responses are ignored, timers cleaned up", async () => {
  vi.useFakeTimers(); let resolve!: (n:number)=>void; let signal!: AbortSignal;
  const receive=vi.fn(),read=vi.fn((s:AbortSignal)=>{signal=s;return new Promise<number>(r=>{resolve=r;});});
  const poll=startPolling({read,receive,failed:vi.fn()});
  poll.invalidate(); expect(signal.aborted).toBe(true);
  resolve(1); await vi.advanceTimersByTimeAsync(1); expect(receive).not.toHaveBeenCalled();
  poll.stop(); expect(signal.aborted).toBe(true); resolve(2);
  await vi.advanceTimersByTimeAsync(60000); expect(receive).not.toHaveBeenCalled(); expect(vi.getTimerCount()).toBe(0);
});
test("failure reports stale state, retry succeeds without manufacturing an empty snapshot",async()=>{
  vi.useFakeTimers();const failed=vi.fn(),receive=vi.fn();
  const read=vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValue({seats:1});
  const poll=startPolling({read,receive,failed});
  await vi.advanceTimersByTimeAsync(0);expect(failed).toHaveBeenCalledTimes(1);expect(receive).not.toHaveBeenCalled();
  poll.refresh();await vi.advanceTimersByTimeAsync(0);expect(receive).toHaveBeenCalledWith({seats:1});poll.stop();
});
test("hung fetch is aborted and can retry",async()=>{
  vi.useFakeTimers();const failed=vi.fn();
  const read=vi.fn((signal:AbortSignal)=>new Promise((_,reject)=>signal.addEventListener('abort',()=>reject(new Error('timeout')))));
  const poll=startPolling({read,receive:vi.fn(),failed});
  await vi.advanceTimersByTimeAsync(12000);expect(failed).toHaveBeenCalledTimes(1);
  await vi.advanceTimersByTimeAsync(5000);expect(read).toHaveBeenCalledTimes(2);poll.stop();
});
