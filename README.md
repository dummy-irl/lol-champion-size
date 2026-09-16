# LoL Champion Size

An interactive web game where players test their knowledge of the
canonical physical sizes of League of Legends champions.

Players compare a reference character with another character and
resize the target to match its correct proportional size.

## Status

MVP beta. The game is playable with the complete supplied champion roster.

## Features

- Random reference and target champion selection
- Physical height data measured in meters
- Target resizing with pointer dragging
- Fixed ground-line positioning
- Meter-based playground scale
- Incremental `+` / `-` camera zoom
- Accuracy calculation from physical heights
- Permanent result panel with correct-size reveal
- Next-round flow without page reload
- Local League-style Beaufort typography
- Summoner's Rift website background

## Tech

Built with HTML, CSS, and vanilla JavaScript. No framework or backend is
required.

Champion data is stored in `champions.js`. Image assets are stored under
`assets/` and are tracked with Git LFS.

## Run Locally

Open `index.html` in a browser, or serve the repository with any static
file server.

## GitHub Pages

Because the image assets use Git LFS, deploy GitHub Pages through a GitHub
Actions workflow that checks out LFS files before uploading the site. Direct
branch-based Pages deployment may serve LFS pointer files instead of the PNGs.

The site entry point is `index.html`, so no build step is required.

Demo: https://dummy-irl.github.io/lol-champion-size/