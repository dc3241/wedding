// Render contract: renderSlides(specs, outDir) -> PNG per spec.
// Usage (CLI): node render.mjs specs.json out/   (specs.json = array of slide specs)
import {bundle} from '@remotion/bundler';
import {renderStill, selectComposition} from '@remotion/renderer';
import path from 'node:path';
import fs from 'node:fs/promises';

// On Remotion Lambda / a normal host, drop these two and let Remotion find Chrome.
const browserExecutable =
  process.env.BROWSER_EXECUTABLE ||
  '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell';
const chromiumOptions = {gl: 'swiftshader', ignoreCertificateErrors: true};

export const renderSlides = async (specs, outDir) => {
  await fs.mkdir(outDir, {recursive: true});
  const serveUrl = await bundle({
    entryPoint: path.resolve('src/index.jsx'),
    publicDir: path.resolve('public'),
  });
  const files = [];
  for (const spec of specs) {
    const inputProps = {spec};
    const composition = await selectComposition({serveUrl, id: 'Slide', inputProps, browserExecutable, chromiumOptions});
    const name = spec.file || `${spec.layout}-${spec.theme}-${spec.format}.png`;
    const output = path.resolve(outDir, name);
    await renderStill({composition, serveUrl, output, inputProps, browserExecutable, chromiumOptions, imageFormat: 'png'});
    files.push(output);
  }
  return files;
};

if (process.argv[1].endsWith('render.mjs') && process.argv[2]) {
  const specs = JSON.parse(await fs.readFile(process.argv[2], 'utf8'));
  const files = await renderSlides(specs, process.argv[3] || 'renders/out');
  console.log(`rendered ${files.length} files`);
}
