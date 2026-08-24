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
});
