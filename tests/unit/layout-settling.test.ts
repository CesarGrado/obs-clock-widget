import { describe, expect, it, vi } from 'vitest';
import { createLayoutSettler } from '../../src/editor/layout-settling';

function frameQueue() {
  let nextId = 1;
  const callbacks = new Map<number, FrameRequestCallback>();
  return {
    host: {
      requestAnimationFrame: vi.fn((callback: FrameRequestCallback) => {
        const id = nextId++; callbacks.set(id, callback); return id;
      }),
      cancelAnimationFrame: vi.fn((id: number) => { callbacks.delete(id); }),
    },
    runNext() {
      const entry = callbacks.entries().next().value as [number, FrameRequestCallback] | undefined;
      if (!entry) throw new Error('No queued frame');
      callbacks.delete(entry[0]); entry[1](0);
    },
    count: () => callbacks.size,
  };
}

describe('layout settling', () => {
  it('waits for fonts and two frames before resolving', async () => {
    let releaseFonts!: () => void;
    const fontsReady = new Promise<void>((resolve) => { releaseFonts = resolve; });
    const frames = frameQueue();
    const settler = createLayoutSettler({ fonts: { ready: fontsReady } } as unknown as Document, frames.host);
    const result = settler.settle();

    expect(frames.count()).toBe(0);
    releaseFonts(); await Promise.resolve(); await Promise.resolve();
    expect(frames.count()).toBe(1);
    frames.runNext(); expect(frames.count()).toBe(1);
    frames.runNext();
    await expect(result).resolves.toBe(true);
  });

  it('resolves superseded and cancelled requests instead of leaking promises', async () => {
    const frames = frameQueue();
    const settler = createLayoutSettler({} as Document, frames.host);
    const stale = settler.settle(); await Promise.resolve(); await Promise.resolve();
    const current = settler.settle();
    await expect(stale).resolves.toBe(false);
    await Promise.resolve(); await Promise.resolve();
    expect(frames.count()).toBe(1);
    settler.cancel();
    await expect(current).resolves.toBe(false);
    expect(frames.count()).toBe(0);
  });
});
