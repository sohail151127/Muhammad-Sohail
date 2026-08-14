# Academic Portfolio Publishing Instructions

## Repository purpose

- This repository powers Muhammad Sohail's live academic portfolio on GitHub Pages.
- The production branch is `main`, and `origin` must remain `https://github.com/sohail151127/Muhammad-Sohail.git`.
- Treat the repository root as the deployment root. The homepage loads `assets/css/styles.css` and `assets/js/main.js`.

## Default workflow for requested website changes

- Before editing, run `git status --short --branch` and preserve unrelated user changes.
- Pull remote updates with `git pull --ff-only origin main` before starting when the worktree is clean.
- Implement the user's requested change in this repository; do not edit a separate ZIP or generated copy.
- Preserve existing links, responsive behavior, accessibility and the premium academic visual identity unless the user requests otherwise.
- For visual changes, test the homepage at desktop and mobile widths and check for horizontal overflow, broken assets and browser errors.
- Validate all relative `href`, `src` and `data-lightbox` paths before publishing.
- Run `git diff --check` and any relevant syntax checks before committing.
- If validation passes, commit the completed change with a concise descriptive message and push it to `origin main` unless the user explicitly says `preview only`, `draft`, or `do not publish`.
- Do not push when validation fails, the remote has conflicting changes, or unrelated local changes cannot be preserved safely. Report the blocker instead.

## Privacy and research-integrity rules

- Never commit private theses, source workbooks, transcripts, CNIC or passport data, birth dates, registration or roll numbers, home addresses, signatures, private referee details, credentials, tokens, or local filesystem paths.
- Do not add files directly from private folders on `E:`. Only add deliberately prepared, privacy-safe public artifacts.
- Keep completed research claims distinct from future interests and label exploratory analyses conservatively.
- Do not remove retained source assets merely because they are not currently rendered unless the user explicitly requests deletion.

## Clarity and teaching standard

- Write for an intelligent beginner who may not already know the scientific or technical vocabulary.
- Define every specialist term at first use, explain why each input matters, and always show units.
- For calculators and interactive tools, include a guided example, plain-language result interpretations, visible formulas, assumptions, limitations and a glossary.
- Explain the difference between a calculated estimate, a measured value and a confirmed scientific conclusion.
- Never leave an unexplained acronym, ambiguous control, hidden requirement or unexplained error state in a public-facing page.
- Prefer short layered explanations: a simple meaning first, then the formula or technical detail for readers who want it.

## Git safety

- Do not use destructive history-rewriting commands or force-push `main`.
- Do not use `git reset --hard` or discard uncommitted user changes.
- If a push is rejected, fetch and inspect the remote state; do not force the push.
