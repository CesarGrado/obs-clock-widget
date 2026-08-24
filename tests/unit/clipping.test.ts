import { describe, expect, it } from 'vitest';
import { collectElementBounds, evaluateElementBounds } from '../../src/geometry/clipping';

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

  it('collects element rectangles relative to the selected runtime viewport', () => {
    const viewport = document.createElement('div');
    const line = document.createElement('div');
    viewport.append(line);
    viewport.getBoundingClientRect = () => ({ left: 100, top: 50, right: 900, bottom: 290, width: 800, height: 240, x: 100, y: 50, toJSON: () => ({}) });
    line.getBoundingClientRect = () => ({ left: 90, top: 60, right: 920, bottom: 300, width: 830, height: 240, x: 90, y: 60, toJSON: () => ({}) });

    expect(collectElementBounds(viewport, [{
      node: line,
      elementId: 'clock-line-1',
      label: 'Line 1',
      enabled: true,
      suggestedFixes: [],
    }])).toEqual([expect.objectContaining({
      elementId: 'clock-line-1',
      visible: true,
      bounds: { left: -10, top: 10, right: 820, bottom: 250 },
    })]);
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
