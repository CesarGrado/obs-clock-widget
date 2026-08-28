import { describe, expect, it } from 'vitest';
import { parseSceneConfigImport } from '../../src/config/scene-import';


describe('scene config import', () => {
  it('loads a canonical generated scene URL', () => {
    const result = parseSceneConfigImport(
      'https://obs-clock-widget.pages.dev/v1/scene/#v=1&h=GAME+NIGHT&th=sunset',
      'https://timer.puxxlr.com',
    );

    expect(result).toMatchObject({ ok: true, config: { headline: 'GAME NIGHT', theme: 'sunset' } });
  });

  it('loads an official production scene URL while running on the Pages alias', () => {
    const result = parseSceneConfigImport(
      'https://timer.puxxlr.com/v1/scene/#v=1&h=GAME+NIGHT&th=sunset',
      'https://obs-clock-widget.pages.dev',
    );

    expect(result).toMatchObject({ ok: true, config: { headline: 'GAME NIGHT', theme: 'sunset' } });
  });

  it('accepts canonical raw fragments with or without the hash marker', () => {
    for (const fragment of ['v=1&h=GAME+NIGHT&th=sunset', '#v=1&h=GAME+NIGHT&th=sunset']) {
      expect(parseSceneConfigImport(fragment)).toMatchObject({ ok: true, config: { headline: 'GAME NIGHT', theme: 'sunset' } });
    }
  });

  it('accepts canonical font and weight normalization as an exact pair', () => {
    expect(parseSceneConfigImport('v=1&hf=bebas-neue&hw=400')).toMatchObject({
      ok: true,
      config: { headlineFont: 'bebas-neue', headlineWeight: 400 },
    });
  });

  it.each([
    ['empty input', ''],
    ['foreign origin', 'https://example.com/v1/scene/#v=1'],
    ['credentials', 'https://user:pass@timer.puxxlr.com/v1/scene/#v=1'],
    ['invalid protocol', 'ftp://timer.puxxlr.com/v1/scene/#v=1'],
    ['wrong route', 'https://timer.puxxlr.com/v1/clock/#v=1'],
    ['encoded path', 'https://timer.puxxlr.com/v1%2Fscene/#v=1'],
    ['query configuration', 'https://timer.puxxlr.com/v1/scene/?v=1#v=1'],
    ['missing fragment', 'https://timer.puxxlr.com/v1/scene/'],
    ['duplicate key', 'v=1&h=GAME+NIGHT&h=AGAIN'],
    ['unsupported version', 'v=2'],
    ['noncanonical default', 'v=1&h=STREAM+STARTING+SOON'],
    ['incomplete font normalization', 'v=1&hf=bebas-neue'],
    ['malformed escape', 'v=1&h=%E0%A4%A'],
    ['oversized fragment', `v=1&h=${'A'.repeat(2050)}`],
  ])('rejects %s without producing a scene', (_case, value) => {
    expect(parseSceneConfigImport(value, 'https://timer.puxxlr.com')).toEqual({ ok: false });
  });
});
