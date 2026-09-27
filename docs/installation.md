# Installation and compatibility

Zolt 0.x is tested on Node.js 22 and 24 across current GitHub-hosted Linux, Windows, and macOS images. Generated projects require Node.js 22.12 or newer because the current Vite and Vitest releases require it. Framework development uses pnpm 10.17.1. Generated projects support current npm and pnpm 10.

Project-local CLI installation is the default. Global `npm install -g @zolt/cli` is optional. Version 0.x may contain breaking changes in minor releases; applications use the compatible `^0.1.0` range.
