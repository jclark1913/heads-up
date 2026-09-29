# Deploy to GitHub Pages

The repository is configured for GitHub Actions deployment. GitHub serves the PWA's built `dist` directory over HTTPS. The app and [deck sharing](../specs/10-deck-sharing.md) use only static hosting. QR links carry the cards in the URL fragment and preserve the deployed repository path. No backend, credentials, or sharing-service deployment is needed. Generate links from the permanent site; localhost and temporary preview addresses are unsuitable for lasting cross-device shares.

## One-time setup

1. Commit and push the app, including `package-lock.json`, `public/`, and `.github/workflows/`, to the `main` branch of [jclark1913/heads-up](https://github.com/jclark1913/heads-up).
2. In the repository's **Settings → Pages → Build and deployment**, select **GitHub Actions** as the source.
3. Open **Actions → Deploy to GitHub Pages → Run workflow**, selecting `main`. This also retries the initial deployment if its automatic run started before Pages was enabled.
4. Open the URL shown by the successful deployment. With the current repository name and no custom domain, it will be [jclark1913.github.io/heads-up/](https://jclark1913.github.io/heads-up/).

No personal access token or repository secret is required. GitHub supplies the workflow token. The repository must have Actions and Pages available and enabled. The **github-pages** environment may require approval if you configure an environment protection rule.

## What runs automatically

- [CI](../.github/workflows/ci.yml) runs on pull requests targeting `main`, when manually requested, and as a required job in the deployment workflow. It checks formatting, TypeScript, ESLint, all unit tests, the production build, and all browser scenarios in Chromium and WebKit.
- [Deploy to GitHub Pages](../.github/workflows/deploy.yml) runs on every push to `main` and can be started manually from `main`. It waits for CI, builds for the URL reported by GitHub Pages, uploads `dist`, and deploys it. A failed check prevents publication. Manual runs from other branches do not deploy.
- Only the deployment job receives Pages write and identity-token permissions. Checks use read-only repository access.

The workflow reads the site's base path from GitHub rather than hardcoding `/heads-up/`. A different repository name, a user site, or a custom domain therefore gets the appropriate build path. Set up a custom domain in Pages settings before rerunning deployment. The manifest's relative start URL, scope, and icon paths resolve under the deployed app path. It intentionally omits an explicit `id`, so browsers use the resolved start URL as the app identity; `id: "./"` would instead identify the origin root. Keep the start URL stable after release. See [manifest identity rules](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Manifest/Reference/id).

GitHub's [custom workflow documentation](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages) describes the Pages setup. Vite's [Pages deployment guide](https://vite.dev/guide/static-deploy.html#github-pages) explains the build base path.

## Local production preview

To check the current repository path locally:

```sh
npm run build -- --base /heads-up/ --outDir .tmp/pages-preview
npm run preview -- --base /heads-up/ --outDir .tmp/pages-preview --port 4183 --strictPort
```

Open [the local Pages preview](http://127.0.0.1:4183/heads-up/). This separate output directory and port allow the temporary phone tunnel to keep serving the regular build. Normal `npm run dev`, `npm run build`, and `npm run phone:test` continue using their existing paths.

## After deployment

Open the final HTTPS URL on the Pixel 10a and iPhone 17 Pro and follow the [device trial](../specs/08-device-trial.md), including motion permission, both landscape directions, manual controls, and Home Screen launch. Install from the permanent URL; a shortcut or saved settings from the temporary tunnel do not transfer to the new origin.

This MVP still requires an internet connection. Offline caching and safe update prompts remain a later milestone. GitHub Pages hosting does not add those features by itself.
