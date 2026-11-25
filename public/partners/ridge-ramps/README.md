# RIDGE Ramps images

Drop image files for the RIDGE Ramps partner page here, then reference them in
`src/data/partners.ts`. Until then the site uses the gradient + 🛹 emoji fallback.

## Expected filenames

| File | Used as | `partners.ts` field |
|---|---|---|
| `logo.png` | Card/hero fallback when there's no hero photo | `logo` |
| `hero.jpg` | Brand page hero, partner cards, Open Graph image | `heroImage` |
| `gallery-1.jpg`, `gallery-2.jpg`, ... | Photo gallery on `/partners/ridge-ramps` | `gallery` |
| `product-half-pipe.jpg` (optional) | Product card image | `products[].image` |

Example:

```ts
heroImage: {
  src: "/partners/ridge-ramps/hero.jpg",
  alt: "Describe what's actually in the photo",
  credit: "Photo: RIDGE Ramps",
},
```

## Rules

- **Permission first.** RIDGE Ramps' photos are their copyrighted work. Only add
  them after RIDGE Ramps has given permission (ideally from their media kit or
  original files).
- **Credit every brand-supplied image** with `credit: "Photo: RIDGE Ramps"`. The
  credit is shown under the image.
- **Local files only.** Don't scrape or download from ridgeramps.com, and don't
  hotlink their CDN (`ridgeramps.com/cdn/shop/...`). Hotlinked URLs break when the
  store changes.
- **Our own photos** (if we buy a ramp) need no credit line, but still need a
  descriptive `alt`. When that happens, also flip `experience` to `"own"` and add
  `usingSince`.
