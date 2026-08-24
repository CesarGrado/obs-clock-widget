import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(path, 'utf8');

describe('deployment packaging', () => {
  it('ships a root entry that forwards visitors to the editor', () => {
    expect(existsSync('index.html')).toBe(true);
    if (existsSync('index.html')) expect(read('index.html')).toContain('url=/editor/');
  });

  it('uses Cloudflare-supported hash syntax for the headers comment', () => {
    expect(read('public/_headers').split('\n')[0]).toMatch(/^#/);
  });

  it('sets explicit revalidation rules for both scene editor and scene runtime HTML routes', () => {
    const headers = read('public/_headers');
    for (const route of ['/scene-editor/*', '/v1/scene/*']) {
      expect(headers).toContain(`${route}\n  Cache-Control: public, max-age=0, must-revalidate`);
    }
  });

  it('documents packaged font attribution and emitted formats accurately', () => {
    const notices = read('THIRD_PARTY_NOTICES.md');
    expect(notices).toContain('- Inter — Copyright 2016 The Inter Project Authors');
    expect(notices).toContain('WOFF2 assets');
    expect(notices).not.toContain('WOFF and WOFF2');
    expect(notices).toContain('- Ubuntu Mono — Copyright 2011 Canonical Ltd. — Ubuntu Font Licence 1.0');
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

  it('ships the complete Ubuntu Font Licence text for Ubuntu Mono', () => {
    const text = read('licenses/Ubuntu-Mono-UFL-1.0.txt');
    expect(text).toContain('UBUNTU FONT LICENCE Version 1.0');
    expect(text).toContain('PREAMBLE');
    expect(text).toContain('PERMISSION & CONDITIONS');
    expect(text).toContain('TERMINATION');
    expect(text).toContain('DISCLAIMER');
  });

  it('ships the complete Apache 2.0 licence text for Permanent Marker', () => {
    const text = read('licenses/Permanent-Marker-Apache-2.0.txt');
    expect(text).toContain('Apache License');
    expect(text).toContain('Version 2.0, January 2004');
    expect(text).toContain('TERMS AND CONDITIONS FOR USE, REPRODUCTION, AND DISTRIBUTION');
    expect(text).toContain('END OF TERMS AND CONDITIONS');
    expect(text).toContain('Copyright (c) 2010 by Font Diner, Inc. All rights reserved.');
    expect(read('THIRD_PARTY_NOTICES.md')).toContain('- Permanent Marker — Copyright 2010 Font Diner, Inc. — Apache 2.0');
  });

  it('deploys notices and license texts into the built output', () => {
    expect(existsSync('dist/THIRD_PARTY_NOTICES.md'), 'dist/ is missing — run npm run build before unit tests (see README quality gates)').toBe(true);
    if (existsSync('dist/THIRD_PARTY_NOTICES.md')) {
      expect(read('dist/THIRD_PARTY_NOTICES.md')).toContain('- Inter — Copyright 2016 The Inter Project Authors');
      expect(read('dist/THIRD_PARTY_NOTICES.md')).toContain('- Ubuntu Mono — Copyright 2011 Canonical Ltd. — Ubuntu Font Licence 1.0');
      expect(read('dist/THIRD_PARTY_NOTICES.md')).toContain('- Permanent Marker — Copyright 2010 Font Diner, Inc. — Apache 2.0');
    }
    for (const name of ['Inter-OFL.txt', 'Montserrat-OFL.txt', 'Roboto-Mono-OFL.txt', 'Ubuntu-Mono-UFL-1.0.txt', 'Permanent-Marker-Apache-2.0.txt']) {
      expect(existsSync(`dist/licenses/${name}`)).toBe(true);
    }
    expect(read('dist/licenses/Ubuntu-Mono-UFL-1.0.txt')).toContain('UBUNTU FONT LICENCE Version 1.0');
    expect(read('dist/licenses/Permanent-Marker-Apache-2.0.txt')).toContain('Apache License');
  });

  it('emits WOFF2 font files only in the built output', () => {
    const walk = (dir: string): string[] => readdirSync(dir, { withFileTypes: true }).flatMap((entry) => entry.isDirectory() ? walk(`${dir}/${entry.name}`) : [`${dir}/${entry.name}`]);
    expect(existsSync('dist'), 'dist/ is missing — run npm run build before unit tests (see README quality gates)').toBe(true);
    const files = existsSync('dist') ? walk('dist') : [];
    expect(files.filter((file) => file.endsWith('.woff2')).length).toBeGreaterThan(100);
    expect(files.filter((file) => file.endsWith('.woff'))).toEqual([]);
  });
});
