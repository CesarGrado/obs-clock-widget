export function copyText(text: string): Promise<boolean> {
  const copySynchronously = () => {
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : undefined;
    const helper = document.createElement('textarea');
    helper.value = text;
    helper.setAttribute('readonly', '');
    Object.assign(helper.style, { position: 'fixed', left: '0', top: '0', opacity: '0', pointerEvents: 'none' });
    document.body.append(helper);
    helper.focus();
    helper.select();
    let copied = false;
    try {
      copied = document.execCommand('copy');
    } catch {
      copied = false;
    }
    helper.remove();
    previousFocus?.focus();
    return copied;
  };

  const asyncClipboard = navigator.clipboard;
  if (!asyncClipboard) return Promise.resolve(copySynchronously());
  return asyncClipboard.writeText(text).then(() => true, copySynchronously);
}

export function clippingCopySuccess(
  success: string,
  hasClippingIssues: boolean,
  clippingPending: boolean,
): string {
  const stem = success.replace(/\.$/, '');
  if (hasClippingIssues) return `${stem}, but fix the clipping warning before using this source in OBS.`;
  if (clippingPending) return `${stem}, but wait for the clipping check before using this source in OBS.`;
  return success;
}
