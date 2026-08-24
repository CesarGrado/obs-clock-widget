interface FontReadyDocument {
  fonts?: { ready: Promise<unknown> };
}

interface FrameHost {
  requestAnimationFrame(callback: FrameRequestCallback): number;
  cancelAnimationFrame(handle: number): void;
}

export interface LayoutSettler {
  settle(): Promise<boolean>;
  cancel(): void;
}

interface PendingSettle {
  generation: number;
  frame?: number;
  resolve(result: boolean): void;
}

export function createLayoutSettler(
  doc: FontReadyDocument = document,
  frameHost: FrameHost = window,
): LayoutSettler {
  let generation = 0;
  let pending: PendingSettle | undefined;

  const finish = (request: PendingSettle, result: boolean) => {
    if (request.frame !== undefined) frameHost.cancelAnimationFrame(request.frame);
    request.frame = undefined;
    if (pending === request) pending = undefined;
    request.resolve(result);
  };

  const active = (request: PendingSettle) => pending === request && request.generation === generation;

  const frame = (request: PendingSettle, callback: () => void) => {
    let ranSynchronously = false;
    const handle = frameHost.requestAnimationFrame(() => {
      ranSynchronously = true;
      request.frame = undefined;
      if (active(request)) callback();
      else finish(request, false);
    });
    if (!ranSynchronously && active(request)) request.frame = handle;
  };

  const settle = () => {
    if (pending) finish(pending, false);
    const requestGeneration = ++generation;
    return new Promise<boolean>((resolve) => {
      const request: PendingSettle = { generation: requestGeneration, resolve };
      pending = request;
      const afterFonts = () => {
        if (!active(request)) { finish(request, false); return; }
        frame(request, () => frame(request, () => finish(request, true)));
      };
      if (doc.fonts) void doc.fonts.ready.then(afterFonts, afterFonts);
      else queueMicrotask(afterFonts);
    });
  };

  const cancel = () => {
    generation += 1;
    if (pending) finish(pending, false);
  };

  return { settle, cancel };
}
