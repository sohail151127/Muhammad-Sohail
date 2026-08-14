# Muhammad Sohail — Academic Research Portfolio

A dependency-free static academic website designed for funded MS, MS-to-PhD, PhD and research applications.

## Pages

- `index.html` — academic homepage
- `research.html` — detailed LIBS/AAS/CF-LIBS/PCA case study
- `libs-spectrum-analyzer.html` — interactive browser-based spectrum analysis project
- `spectral-peak-fitter.html` — Gaussian, Lorentzian and pseudo-Voigt peak-fitting and FWHM analyzer
- `laser-experiment-calculator.html` — guided Gaussian-beam and pulsed-laser calculator
- `boltzmann-plasma-analyzer.html` — guided Boltzmann plot and plasma excitation-temperature analyzer
- `stark-electron-density-analyzer.html` — guided Stark-broadening and electron-density analyzer
- `lte-mcwhirter-checker.html` — guided LTE plausibility and McWhirter criterion checker
- `libs-plasma-report-builder.html` — print-ready LIBS plasma diagnostics report builder
- `cv.html` — privacy-safe academic CV with Print / Save as PDF
- `404.html` — custom fallback page

## LIBS Spectrum Analyzer

The analyzer accepts a CSV or tab-delimited text file whose first column is wavelength and whose remaining columns are sample intensities. It supports:

- Multiple-sample comparison
- Optional linear edge-baseline correction
- Maximum or integrated-area normalization
- Adjustable candidate-peak detection
- Interactive SVG inspection
- Processed CSV download

All uploaded files remain in the browser and are not sent to a server. The bundled demonstration data are synthetic and clearly labelled as such.

## Preview locally

Run a simple static server from this directory:

```powershell
python -m http.server 8080
```

Then open `http://localhost:8080`.

## Deploy

The repository root is deployed through GitHub Pages; no build command is required. Changes merged or pushed to `main` are published automatically.

## Update content

- Main profile and sections: edit `index.html`.
- Thesis methodology, figures and conclusions: edit `research.html`.
- Spectrum analyzer interface: edit `libs-spectrum-analyzer.html`.
- Spectrum processing logic: edit `assets/js/spectrum-analyzer.js`.
- Analyzer styling: edit `assets/css/spectrum-analyzer.css`.
- Peak-fitting interface: edit `spectral-peak-fitter.html`.
- Peak-fitting logic: edit `assets/js/peak-fitter.js`.
- Peak-fitting styling: edit `assets/css/peak-fitter.css`.
- Laser calculator logic: edit `assets/js/laser-calculator.js`.
- Laser calculator styling: edit `assets/css/laser-calculator.css`.
- Boltzmann analyzer logic: edit `assets/js/boltzmann-analyzer.js`.
- Boltzmann analyzer styling: edit `assets/css/boltzmann-analyzer.css`.
- Stark analyzer logic: edit `assets/js/stark-analyzer.js`.
- Stark analyzer styling: edit `assets/css/stark-analyzer.css`.
- LTE checker logic: edit `assets/js/lte-checker.js`.
- LTE checker styling: edit `assets/css/lte-checker.css`.
- Plasma report logic: edit `assets/js/plasma-report.js`.
- Plasma report styling: edit `assets/css/plasma-report.css`.
- Academic record: edit `cv.html`.
- Shared colors, spacing and typography: edit `assets/css/styles.css`.
- Shared interactions: edit `assets/js/main.js`.
- Research images: place files in `assets/images/research/` and reference them with relative paths.

The header navigation is shared across every page. Homepage menu items scroll to sections, while research, analyzer and CV pages provide detailed secondary content. Degree wording preserves the official MPhil title and explains it internationally as a research master's.

## Publishing workflow

Repository-level instructions in `AGENTS.md` direct Codex to validate completed changes, commit them and push to `origin main` unless a request is explicitly marked preview-only or not for publication.

## Privacy rules

Do not add CNIC, passport, birth date, registration or roll numbers, home address, signatures, private referee details, private research files or unredacted transcripts. Confirm any new public claims against source evidence before publishing.

## Recommended next additions

1. Confirm the preferred public email and academic profile links.
2. Add a polished, current academic CV PDF after review.
3. Add another carefully documented scientific-computing project.
4. Consider a professional domain and final Open Graph metadata.
5. The existing portrait asset is intentionally retained but not rendered; it can be reconsidered later.
