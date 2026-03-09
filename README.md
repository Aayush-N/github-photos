# GitHub Photo Gallery

A self-hosted photo gallery that uses a **GitHub repository as its storage backend**. Upload, browse, and organise photos through a clean web UI — no database or object storage required.

Built with [Next.js 14](https://nextjs.org/), TypeScript, and Tailwind CSS.

## Features

- **GitHub as storage** — photos are committed directly to a repo via the GitHub Contents API
- **Albums** — organise photos into folders; create new albums inline during upload
- **Bulk upload** — drag-and-drop up to 50 photos at once with 5 concurrent uploads, per-file progress, and retry on failure
- **Masonry grid** — responsive photo grid with search and sort (by name or size)
- **Lightbox** — full-screen viewer with keyboard navigation (←/→/Esc)
- **Dark mode** — system-aware with manual toggle, persisted to `localStorage`

## Getting Started

### 1. Create a GitHub repository for your photos

This can be a new, empty repository. It will hold all uploaded images.

### 2. Generate a GitHub personal access token

Go to **GitHub → Settings → Developer settings → Fine-grained tokens** and create a token with **Read and Write** access to the **Contents** of your photos repository.

### 3. Clone and configure

```bash
git clone https://github.com/your-username/github-photo-gallery.git
cd github-photo-gallery
npm install
```

Create a `.env.local` file in the project root:

```env
GITHUB_TOKEN=github_pat_your_token_here
GITHUB_REPO=your-username/your-photos-repo
# Optional — defaults to "main"
GITHUB_BRANCH=main
```

### 4. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Deployment

Deploy to [Vercel](https://vercel.com) (recommended) or any Node.js host. Set the three environment variables (`GITHUB_TOKEN`, `GITHUB_REPO`, `GITHUB_BRANCH`) in your hosting provider's dashboard.

> **Note:** `GITHUB_TOKEN` is a server-side secret. It is only read in API routes and is never exposed to the browser.

## Project Structure

```
app/
  page.tsx                  # Gallery (root photos)
  albums/
    page.tsx                # Albums list
    [album]/page.tsx        # Individual album
  api/
    photos/route.ts         # GET /api/photos
    albums/route.ts         # GET /api/albums
    albums/create/route.ts  # POST /api/albums/create
    upload/route.ts         # POST /api/upload
components/
  Navbar.tsx
  PhotoGrid.tsx
  AlbumGrid.tsx
  FilterBar.tsx
  Lightbox.tsx
  UploadModal.tsx
  ThemeProvider.tsx
lib/
  github.ts                 # GitHub API client
  types.ts                  # Shared TypeScript types
```

## Limits

| Constraint | Value |
|---|---|
| Max file size | 25 MB (GitHub API limit) |
| Max files per upload batch | 50 |
| Supported formats | JPG, PNG, GIF, WebP, SVG, BMP, TIFF, AVIF, HEIC |

## License

[MIT](LICENSE)
