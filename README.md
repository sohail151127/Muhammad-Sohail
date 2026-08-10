# Muhammad Sohail — Academic Research Portfolio

A dependency-free static academic website designed for funded MS, MS-to-PhD, PhD and research applications.

## Pages

- `index.html` — academic homepage
- `research.html` — detailed LIBS/AAS/CF-LIBS/PCA case study
- `cv.html` — privacy-safe academic CV with Print / Save as PDF
- `404.html` — custom fallback page

## Preview locally

Run a simple static server from this directory:

```powershell
python -m http.server 8080
```

Then open `http://localhost:8080`.

## Deploy

The folder can be deployed directly—no build command is required.

- GitHub Pages: push the folder contents to a repository and enable Pages.
- Cloudflare Pages: upload the folder or connect the repository; leave the build command empty and set the output directory to `/`.
- Netlify: drag this folder into Netlify Drop.

Use a short professional domain if possible, such as `muhammadsohailphysics.com` or a concise `.me` domain.

## Update content

- Main profile and sections: edit `index.html`.
- Thesis methodology, figures and conclusions: edit `research.html`.
- Academic record: edit `cv.html`.
- Colors, spacing and typography: edit `assets/css/styles.css`.
- Interactions: edit `assets/js/main.js`.
- Research images: place files in `assets/images/research/` and reference them with relative paths.

## Privacy rules

Do not add CNIC, passport, birth date, registration/roll numbers, home address, signatures, private referee details or unredacted transcripts. Confirm any new public claims against source evidence before publishing.

## Recommended next additions

1. Replace the profile image with a high-resolution professional headshot.
2. Confirm the preferred public email and all academic profile links.
3. Add a polished, current academic CV PDF after review.
4. Add GitHub repositories for completed scientific-computing projects.
5. Add a domain and update Open Graph metadata with the final public URL.
