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
