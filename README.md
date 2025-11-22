# ItsKarma.github.io

This site is built with [11ty](https://www.11ty.dev/), a simple static site generator.

## Development

Install dependencies:
```bash
npm install
```

Build the site:
```bash
npm run build
```

Serve locally with live reload:
```bash
npm run serve
```

The site will be available at `http://localhost:8080`

## Structure

- `_posts/` - Blog posts in Markdown
- `pages/` - Static pages (About, Toolbox, etc.)
- `_layouts/base.html` - Main HTML template with inline CSS
- `img/` - Images
- `_site/` - Generated site (not committed)

## Deployment

The site automatically deploys to GitHub Pages via GitHub Actions when you push to the `main` or `refactor` branch.

## Adding Content

Just create a new Markdown file in `_posts/` with the following front matter:

```markdown
---
layout: base.html
title: "Your Post Title"
date: 2025-11-22
---

Your content here...
```

That's it! No categories, no tags, no complexity.
