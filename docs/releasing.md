# Releasing

Zolt follows semantic versions: patch for compatible fixes, minor for compatible features (with normal 0.x caution), and major for stable breaking changes.

1. Merge a reviewed pull request after CI succeeds.
2. Update the root and all publishable package versions together; update generated dependency ranges and the CLI/core version constants.
3. Run `pnpm security:check` and `pnpm run ci` locally.
4. Dispatch the Release workflow with that version.
5. The workflow verifies versions and creates `vX.Y.Z`.
6. The tag triggers Publish, which repeats validation, publishes with npm trusted publishing/OIDC, and creates the GitHub Release.

Configure the npm trusted publisher for this repository and the `publish.yml` workflow. Never commit an npm token. Production npm publication occurs only from a version tag.
