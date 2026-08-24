import { describe, expect, it } from 'vitest';
import { cloneSceneConfig } from '../../src/config/clone';
import { DEFAULT_SCENE_CONFIG } from '../../src/config/scene-defaults';
import { sceneClippingIssues } from '../../src/geometry/scene-clipping';

const rect = (left: number, top: number, right: number, bottom: number): DOMRect => ({
  left, top, right, bottom, width: right - left, height: bottom - top, x: left, y: top, toJSON: () => ({}),
});

describe('scene clipping', () => {
  it('names clipped semantic scene elements and ignores absent optional text', () => {
    const root = document.createElement('div');
    root.getBoundingClientRect = () => rect(100, 50, 2020, 1130);
    const headline = document.createElement('div'); headline.className = 'scene-headline'; headline.getBoundingClientRect = () => rect(120, 80, 2100, 260);
    const number = document.createElement('div'); number.className = 'scene-number'; number.getBoundingClientRect = () => rect(400, 300, 1200, 600);
    root.append(headline, number);
    const config = cloneSceneConfig(DEFAULT_SCENE_CONFIG); config.subtitle = '';

    expect(sceneClippingIssues(root, config, { width: 1920, height: 1080 })).toEqual([
      expect.objectContaining({ elementId: 'scene-headline', label: 'Headline', clippedEdges: ['right'] }),
    ]);
  });
});
