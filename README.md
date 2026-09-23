# README

## About

This is the official Wails React-TS template.

You can configure the project by editing `wails.json`. More information about the project settings can be found
here: https://wails.io/docs/reference/project-config

## Live Development

To run in live development mode, run `wails dev` in the project directory. This will run a Vite development
server that will provide very fast hot reload of your frontend changes. If you want to develop in a browser
and have access to your Go methods, there is also a dev server that runs on http://localhost:34115. Connect
to this in your browser, and you can call your Go code from devtools.

## Building

`wails build` creates the application binary, but not a release-ready package
with native caption tools. Use the release staging instructions in
`docs/native-dependencies.md` for Windows/macOS. Commercial distribution is
blocked until an LGPL-compatible FFmpeg build and its corresponding source
have been selected and documented.
