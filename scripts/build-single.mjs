import { readFile, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';

const DIST = 'dist-single';
const OUT = 'habit-wheel.html';

const [js, css, icon] = await Promise.all([
  readFile(join(DIST, 'app.js'), 'utf8'),
  readFile(join(DIST, 'app.css'), 'utf8'),
  readFile('public/icon.svg', 'utf8'),
]);

const iconHref = `data:image/svg+xml;base64,${Buffer.from(icon).toString('base64')}`;

// `</script>` inside a string literal would close the tag we are writing it into.
const safeJs = js.replace(/<\/script>/gi, '<\\/script>');

const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, maximum-scale=1, user-scalable=no" />
    <meta name="theme-color" content="#000000" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    <meta name="apple-mobile-web-app-title" content="Habit Wheel" />
    <link rel="icon" type="image/svg+xml" href="${iconHref}" />
    <title>Habit Wheel</title>
    <style>
${css}
    </style>
  </head>
  <body>
    <div id="root"></div>
    <script>
${safeJs}
    </script>
  </body>
</html>
`;

await writeFile(OUT, html);
await rm(DIST, { recursive: true, force: true });

const kb = (Buffer.byteLength(html) / 1024).toFixed(0);
console.log(`${OUT} — ${kb} kB, self-contained`);
