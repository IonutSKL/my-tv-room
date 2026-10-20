# My TV Room

A personal channel switcher for Digi Sport 1 and Digi24, built with plain HTML, CSS and JavaScript.

## Use

Open `dist/index.html`, or serve the `dist` directory with any static web server.

- Select a channel in the sidebar.
- Press 1 for Digi Sport 1, 2 for Digi24, or F for fullscreen while the app has focus.
- The last selected channel is saved in your browser.

Digi24 loads its source page inside the app. RD-S.live refuses embedded viewing, so Digi Sport 1 opens on its original website. Playback, consent, advertising and geographic restrictions are controlled by the source websites. This app does not proxy streams or bypass their restrictions.

## Vercel

Import this repository, select Other as the framework, leave the build and install commands empty, and use `dist` as the output directory. The included vercel.json supplies these settings. Pushes to the connected production branch trigger automatic deployments.

The app has no server, dependencies, API keys or environment variables. It contains no authentication; Vercel project access settings determine who can view a deployment.
