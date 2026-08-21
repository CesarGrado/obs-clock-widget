import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(path, 'utf8');

describe('deployment packaging', () => {
  it('uses Cloudflare-supported hash syntax for the headers comment', () => {
    expect(read('public/_headers').split('\n')[0]).toMatch(/^#/);
  });

  it('documents packaged font attribution and emitted formats accurately', () => {
    const notices = read('THIRD_PARTY_NOTICES.md');
    expect(notices).toContain('- Inter — Copyright 2016 The Inter Project Authors');
    expect(notices).toContain('WOFF and WOFF2 assets');
  });

  it('ships complete SIL OFL text and attribution for every distributed font', () => {
    const licenses = [
      ['licenses/Inter-OFL.txt', 'Copyright 2016 The Inter Project Authors'],
      ['licenses/Montserrat-OFL.txt', 'Copyright 2011 The Montserrat Project Authors'],
      ['licenses/Roboto-Mono-OFL.txt', 'Copyright 2015 The Roboto Mono Project Authors'],
    ] as const;
    for (const [path, copyright] of licenses) {
      const text = read(path);
      expect(text).toContain(copyright);
      expect(text).toContain('SIL OPEN FONT LICENSE Version 1.1 - 26 February 2007');
      expect(text).toContain('PERMISSION & CONDITIONS');
      expect(text).toContain('TERMINATION');
      expect(text).toContain('DISCLAIMER');
      expect(text).toContain('OTHER DEALINGS IN THE FONT SOFTWARE.');
    }
  });
});
