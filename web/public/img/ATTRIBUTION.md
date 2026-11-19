# Photo attribution

Photographs used on the public homepage (`/`). Photographer names were read from each photo's
Pexels page on 2026-11-19. Both are published under the Pexels License (https://www.pexels.com/license/).

| File | Original | Photographer | Licence | Modifications |
|---|---|---|---|---|
| `hero.webp` (2000 px), `hero-sm.webp` (1000 px) | [High Rise Buildings Under Construction in Dubai](https://www.pexels.com/photo/high-rise-buildings-under-construction-in-dubai-3367920/) (Pexels photo 3367920) | Andrea Piacquadio | [Pexels License](https://www.pexels.com/license/) | Downloaded at 2400 px from the Pexels CDN, resized and converted to WebP (`cwebp -q 72 -m 6`). On the page a dark gradient overlay is drawn over it for text legibility. |
| `crew-ppe.webp` (1200 px) | [Construction Worker at Building Site in Dubai](https://www.pexels.com/photo/construction-worker-at-building-site-in-dubai-36470665/) (Pexels photo 36470665) | Bm Asif | [Pexels License](https://www.pexels.com/license/) | Cropped to the upper part of the frame (excludes a company logo printed on the shirt), resized and converted to WebP (`cwebp -q 74 -m 6 -crop 0 620 2160 1280 -resize 1200 0`). |

## Commands

```sh
# downloads (scratch directory, verified with `file` as JPEG)
curl -o pexels-3367920.jpg  "https://images.pexels.com/photos/3367920/pexels-photo-3367920.jpeg?auto=compress&cs=tinysrgb&w=2400"
curl -o pexels-36470665.jpg "https://images.pexels.com/photos/36470665/pexels-photo-36470665.jpeg?auto=compress&cs=tinysrgb&w=2400"
# conversion
cwebp -q 72 -m 6 -resize 2000 0 pexels-3367920.jpg -o hero.webp
cwebp -q 72 -m 6 -resize 1000 0 pexels-3367920.jpg -o hero-sm.webp
cwebp -q 74 -m 6 -crop 0 620 2160 1280 -resize 1200 0 pexels-36470665.jpg -o crew-ppe.webp
```

## Statement

The people in these photographs are not AmanShift users, patients or study participants, and
nothing on the page suggests they are experiencing heat illness. The photographs were taken
independently of AmanShift; their use implies no endorsement by the photographers, the people
pictured, or any company or site visible in them.
