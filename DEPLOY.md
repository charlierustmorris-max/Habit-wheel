# Deploying to Railway

The repo is already set up for it. `railway.json` tells Railway to build with
`npm run build` and serve with `npm start`, and `server.mjs` is a dependency-free
static server that binds whatever port Railway hands it. You shouldn't need to
configure anything.

## From GitHub (the easy path)

1. **Get the code onto the branch you want to deploy.** The app currently lives
   on `claude/habit-tracker-categories-lymawf`. Merge it into `main` first if you
   want Railway watching `main`.

2. **Create the project.** Go to [railway.com](https://railway.com) → **New
   Project** → **Deploy from GitHub repo** → pick `Habit-wheel`. Authorise
   Railway for the repo if it asks.

3. **Point it at the right branch.** Project → your service → **Settings** →
   **Source** → **Branch**. Set it to whichever branch has the app.

4. **Let it build.** Railway detects Node, installs dependencies, runs
   `npm run build`, then `npm start`. Watch the **Deployments** tab — the first
   build takes a couple of minutes. You want it to finish on
   `Habit Wheel listening on http://0.0.0.0:<port>`.

5. **Give it a URL.** Settings → **Networking** → **Generate Domain**. Railway
   hands you something like `habit-wheel-production.up.railway.app`. That's the
   app.

6. **Put it on your phone.** Open the URL in Safari → Share → **Add to Home
   Screen**. It launches full-screen with no browser chrome, which is what the
   manifest and the status-bar meta tags are for.

Every push to that branch redeploys automatically.

## From the CLI instead

```bash
npm i -g @railway/cli
railway login
railway init          # creates the project
railway up            # builds and deploys from your working directory
railway domain        # generates the public URL
```

## Environment variables

None required. Railway injects `PORT` and `server.mjs` reads it, falling back to
3000 locally.

## If the build fails

**`vite: not found` or `tsc: not found`** — Railway installed only production
dependencies, and the build tools are dev dependencies. Add a service variable
`NPM_CONFIG_PRODUCTION` = `false` and redeploy.

**Build succeeds, page is blank** — open the browser console. A failed asset
request usually means the build output landed somewhere other than `dist/`;
check the build log for where Vite wrote it.

**Deploy loops or health checks fail** — the start command must be `npm start`.
Anything that binds `localhost` instead of `0.0.0.0`, or a hardcoded port, will
fail Railway's health check. `server.mjs` already does both correctly.

## Custom domain

Settings → **Networking** → **Custom Domain** → enter your domain. Railway shows
you a CNAME record to add at your registrar. Propagation is usually minutes.

## One thing worth knowing

Your habit data lives in `localStorage`, in the browser that logged it. Hosting
the app on Railway puts the *app* on the internet, not your data — logging on
your phone won't show up on your laptop, and clearing site data wipes it.

Manage → **Copy my data as JSON** is the backup, and **Restore from JSON** is how
you move it to another device. If you'd rather have real sync, that needs a
backend and accounts, which is a much bigger change than this deploy.
