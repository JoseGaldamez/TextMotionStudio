# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Creators and social-media professionals on Windows and macOS who need to add polished animated captions to short-form videos without learning a technical editing workflow.

## Product Purpose

TextMotion Studio guides users through a clear four-step workflow: load a video, generate captions, choose a caption style, and export the finished video. Success means that a non-technical user can understand the workflow immediately and prepare a captioned video with minimal friction.

## Positioning

The product is a focused desktop captioning studio that will process video locally, keeping source media on the user's computer while making animated-caption creation approachable.

## Operating Context

The application is used as a desktop creative tool. Its initial window size is 1920×1080, with a minimum resize size of 1280×720. The core workspace combines a persistent workflow panel, a video preview, caption controls, and a timeline.

## Capabilities and Constraints

- Current scope is frontend-only, using mock data and local React state.
- The existing stack is Wails, React, and Go.
- Real transcription, FFmpeg, Whisper, export processing, and complex backend logic are out of scope for the initial interface.
- A selected local video may be previewed with native browser video controls implemented through the custom UI.
- Navigation and style selection need only lightweight visual state for this iteration.

## Brand Commitments

- Product name: TextMotion Studio.
- Voice: modern, professional, minimal, premium, and understandable to non-technical users.
- The interface must feel like a native desktop creative application rather than a website or administrative dashboard.
- Dark surfaces and a restrained violet/indigo accent are binding visual constraints.
- The user-provided reference image is the visual authority for the initial workspace composition.

## Evidence on Hand

- Detailed product and interface brief supplied by the user.
- Visual reference: `C:/Users/joseg/AppData/Local/Temp/codex-clipboard-1c7a1f31-8a3e-4915-852c-504d3af9495b.png`.
- No real caption, transcript, customer, benchmark, or export data is available; demo captions must remain clearly mock behavior.

## Product Principles

- Make the four-step workflow legible at a glance.
- Keep creative controls focused and progressive rather than exposing technical complexity.
- Preserve user trust by foregrounding local processing and avoiding fabricated capabilities.
- Treat the video and captions as the primary content; interface chrome should remain quiet.
- Use familiar desktop affordances with clear focus, hover, loading, disabled, and empty states.

## Accessibility & Inclusion

Controls should be keyboard reachable, focus-visible, and labeled. Text and interactive states should maintain readable contrast in the dark theme.
