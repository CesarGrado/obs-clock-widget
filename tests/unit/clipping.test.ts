import { describe, expect, it } from 'vitest';
import { evaluateElementBounds } from '../../src/geometry/clipping';

describe('element-bounds clipping', () => {
  it('reports a rendered line outside a compact viewport even when overflow-hidden exposes no scroll overflow', () => {
    expect(evaluateElementBounds(
      { width: 800, height: 240 },
      [{
        elementId: 'clock-line-1',
        label: 'Line 1',
        enabled: true,
        visible: true,
        bounds: { left: 0, top: 0, right: 15_000, bottom: 512 },
        suggestedFixes: [
          'Reduce Line 1 size or shorten its format.',
          'Choose a larger OBS Browser Source size.',
        ],
      }],
    )).toEqual([{
      elementId: 'clock-line-1',
      label: 'Line 1',
      clippedEdges: ['right', 'bottom'],
      suggestedFixes: [
        'Reduce Line 1 size or shorten its format.',
        'Choose a larger OBS Browser Source size.',
      ],
    }]);
  });

  it('includes stroke and shadow paint margins that extend past the element box', () => {
    expect(evaluateElementBounds(
      { width: 800, height: 240 },
      [{
        elementId: 'clock-line-2',
        label: 'Line 2',
        enabled: true,
        visible: true,
        bounds: { left: 8, top: 8, right: 792, bottom: 232 },
        paintMargins: { left: 9, top: 9, right: 31, bottom: 41 },
        suggestedFixes: ['Reduce Stroke or Shadow.'],
      }],
    )).toEqual([{
      elementId: 'clock-line-2',
      label: 'Line 2',
      clippedEdges: ['left', 'top', 'right', 'bottom'],
      suggestedFixes: ['Reduce Stroke or Shadow.'],
    }]);
  });
});
