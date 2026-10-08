# Repository boundaries

This repository contains research documents, reproducibility material,
measurements, test-only RTL, and local laboratory tools. Keep those changes here.

`console/` is a pinned reference to wally-game-console. Product changes belong
there only when they are required to build or use the game console and follow
CVW conventions. Do not put SDWire3, capture-device workarounds, personal setup,
publication tooling, or experiment instrumentation into the product repository.
Do not edit the official RasterIX submodule for a local experiment. Store
experimental patches in this repository and apply them to a separate checkout.

# Publication privacy

Never copy an entire private working directory into this repository. Import only
selected research files through `tools/publication/sanitize.py` or the local
manifest importer. Exact private names, account paths, device IDs, and their
replacement rules live in `.private/` and must never enter any commit.

Preserve the private originals. Scrub document authors, hidden XML, comments,
revision metadata, image metadata, archive members, filenames, and text. Review
image/video content before recording its hash in `publication/media-review.json`.
Unknown binaries are rejected. Do not publish supervisor identities or
affiliation that identifies them. Repository owner and explicit product URLs
are public by design; they are not anonymous.

Before committing, run tests and the privacy audit with the private settings.
Use `git config core.hooksPath .githooks` and keep both hooks enabled. Public CI
cannot know unpublished names; it supplements local checking, not replaces it.
Do not bypass a failing hook or alter its allowlist merely to pass an audit.

# Evidence and documents

Keep measured values, source revisions, and scope qualifications intact. Public
copies may have identifying paths/metadata replaced. Use the publication
manifest for their hashes; archived experiment hashes may describe private
originals. Never call redacted logs byte-for-byte originals.

Prefer repository-relative links. Preserve upstream copyright and license
notices. Explain placeholders and distinguish archived scripts from supported
tools. Hardware-writing commands require explicit target selection and checks;
publishing scripts is not authorization to operate the hardware.

Use English for code, commit messages, and maintenance instructions. Japanese
research prose is retained. Do not claim formal correctness or universal
performance from a finite experiment.
