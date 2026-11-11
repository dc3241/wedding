// Renders one video from a job file. Run by .github/workflows/render-video.yml:
//   node render.mjs <job_url_or_path>
// Env (optional, for local testing): BROWSER_EXECUTABLE, SKIP_UPLOAD=1
//
// Job (built by lib/admin/videos/job.ts in the app):
//   post_id, callback_url, token, speed, vo_url, supabase_url, anon_key, bucket,
//   upload {path, token}, assets {key: {url, mediaType, ext}}, pauses [{at, seconds}],
//   spec {durationSec, beats[]}  (footage visuals carry assetKey)
import { bundle } from '@remotion/bundler';
import { ensureBrowser, renderMedia, selectComposition } from '@remotion/renderer';
import { createClient } from '@supabase/supabase-js';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const here = path.dirname(new URL(import.meta.url).pathname);
const work = path.join(here, 'work');
const pubJob = path.join(here, 'public', 'job');
fs.rmSync(work, { recursive: true, force: true });
fs.rmSync(pubJob, { recursive: true, force: true });
fs.mkdirSync(work, { recursive: true });
fs.mkdirSync(pubJob, { recursive: true });

const src = process.argv[2];
if (!src) throw new Error('usage: node render.mjs <job_url_or_path>');

const readJob = async () => {
  if (/^https?:/.test(src)) {
    const res = await fetch(src);
    if (!res.ok) throw new Error(`job fetch failed: ${res.status}`);
    return res.json();
  }
  return JSON.parse(fs.readFileSync(src, 'utf8'));
};

const download = async (url, dest) => {
  if (url.startsWith('file://')) return fs.copyFileSync(new URL(url), dest);
  if (!/^https?:/.test(url)) return fs.copyFileSync(url, dest);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`download failed (${res.status}): ${url.slice(0, 80)}`);
  fs.writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
};

const ff = (args) => execFileSync('ffmpeg', ['-y', '-loglevel', 'error', ...args], { stdio: 'inherit' });
const probeDuration = (file) => {
  try {
    const out = execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file]).toString().trim();
    const n = parseFloat(out);
    return Number.isFinite(n) ? n : 0;
  } catch {
    return 0;
  }
};

const report = async (job, status, error) => {
  if (!job?.callback_url) return;
  try {
    await fetch(job.callback_url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ post_id: job.post_id, token: job.token, status, error: error ? String(error).slice(0, 800) : undefined }),
    });
  } catch (e) {
    console.error('callback failed', e);
  }
};

let job;
try {
  job = await readJob();

  // 1. assets
  const voRaw = path.join(work, 'vo.mp3');
  await download(job.vo_url, voRaw);
  const spec = job.spec;
  for (const beat of spec.beats) {
    const v = beat.visual;
    if (v.type !== 'footage') continue;
    const asset = job.assets?.[v.assetKey];
    if (!asset) throw new Error(`missing footage for segment ${beat.id}`);
    const name = `${v.assetKey}.${asset.ext || 'mp4'}`;
    const dest = path.join(pubJob, name);
    await download(asset.url, dest);
    v.src = `job/${name}`;
    v.mediaType = asset.mediaType;
    v.clipDuration = asset.mediaType === 'video' ? probeDuration(dest) : 0;
  }

  // 2. voiceover: speed up, then splice silences for pauses
  const speed = job.speed ?? 1.1;
  const sped = path.join(work, 'sped.m4a');
  ff(['-i', voRaw, '-filter:a', `atempo=${speed}`, '-ar', '44100', '-ac', '2', '-c:a', 'aac', '-b:a', '256k', sped]);
  let finalAudio = sped;
  const pauses = [...(job.pauses ?? [])].sort((a, b) => a.at - b.at);
  if (pauses.length) {
    const parts = [];
    let cursor = 0;
    const piece = (i, from, to) => {
      const out = path.join(work, `p${i}.m4a`);
      ff(['-i', sped, '-ss', String(from), ...(to == null ? [] : ['-to', String(to)]), '-ar', '44100', '-ac', '2', '-c:a', 'aac', '-b:a', '256k', out]);
      return out;
    };
    pauses.forEach((p, i) => {
      parts.push(piece(`a${i}`, cursor, p.at));
      const sil = path.join(work, `s${i}.m4a`);
      ff(['-f', 'lavfi', '-i', 'anullsrc=r=44100:cl=stereo', '-t', String(p.seconds), '-c:a', 'aac', '-b:a', '256k', sil]);
      parts.push(sil);
      cursor = p.at;
    });
    parts.push(piece('z', cursor, null));
    const list = path.join(work, 'list.txt');
    fs.writeFileSync(list, parts.map((f) => `file '${f}'`).join('\n'));
    finalAudio = path.join(work, 'final.m4a');
    ff(['-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', finalAudio]);
  }

  // 3. render silent video
  const browserExecutable = process.env.BROWSER_EXECUTABLE || undefined;
  if (!browserExecutable) await ensureBrowser();
  const chromiumOptions = { gl: 'swiftshader', ignoreCertificateErrors: true };
  const serveUrl = await bundle({ entryPoint: path.join(here, 'src/index.jsx'), publicDir: path.join(here, 'public') });
  const inputProps = { spec };
  const composition = await selectComposition({ serveUrl, id: 'Spec', inputProps, browserExecutable, chromiumOptions });
  const silent = path.join(work, 'silent.mp4');
  await renderMedia({
    composition, serveUrl, inputProps, codec: 'h264', crf: 18, outputLocation: silent, browserExecutable, chromiumOptions,
    onProgress: ({ renderedFrames }) => { if (renderedFrames % 90 === 0) console.log(`rendered ${renderedFrames}/${composition.durationInFrames}`); },
  });

  // 4. mux the voiceover bytes without re-encoding (never -shortest: the end holds past the audio)
  const out = path.join(work, 'out.mp4');
  ff(['-i', silent, '-i', finalAudio, '-map', '0:v', '-map', '1:a', '-c', 'copy', '-movflags', '+faststart', out]);
  console.log(`done: ${(fs.statSync(out).size / 1e6).toFixed(1)} MB, ${probeDuration(out).toFixed(1)}s`);

  // 5. upload + report
  if (!process.env.SKIP_UPLOAD && job.upload) {
    const sb = createClient(job.supabase_url, job.anon_key, { auth: { persistSession: false } });
    const { error } = await sb.storage.from(job.bucket).uploadToSignedUrl(job.upload.path, job.upload.token, fs.readFileSync(out), {
      contentType: 'video/mp4',
      upsert: true,
    });
    if (error) throw new Error(`upload failed: ${error.message}`);
  }
  await report(job, 'done');
} catch (err) {
  console.error(err);
  await report(job, 'failed', err instanceof Error ? err.message : err);
  process.exit(1);
}
