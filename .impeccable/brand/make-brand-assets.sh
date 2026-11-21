#!/bin/sh
# Regenerates the brand rasters in public/ from the sources in .impeccable/brand/ (run from the
# repo root; needs playwright-cli with Google Chrome, ffmpeg and sips).
#
#   public/favicon.svg          copy of mark.svg (slate rounded square, mist disc, slate hole)
#   public/og-image.png         1200x630, screenshot of og-image.html (Albert Sans from
#                               src/app/styles/fonts, deterministic bars from a seeded generator)
#   public/apple-touch-icon.png 180x180  } screenshots of icon.html#bleed (mark-bleed.svg: a
#   public/icon-192.png         192x192  } full-bleed slate square, the disc inside the central
#   public/icon-512.png         512x512  } 80%, so a maskable crop is safe)
#   public/favicon.ico          16, 32 and 48 px images, screenshots of icon.html#bleed (square, so no
#                               opaque corner pixels), packed by ffmpeg
#
# Chrome renders at devicePixelRatio 1 here, so a viewport of WxH gives a WxH PNG.
set -eu

root=$(pwd)
src=$root/.impeccable/brand
out=$root/public
tmp=$(mktemp -d)
trap 'rm -rf "$root/.playwright-cli"; playwright-cli -s=brand close >/dev/null 2>&1 || true; rm -rf "$tmp"' EXIT

shot() { # shot <url> <width> <height> <file>
  playwright-cli -s=brand resize "$2" "$3" >/dev/null
  playwright-cli -s=brand goto "$1" >/dev/null
  playwright-cli -s=brand eval "location.reload()" >/dev/null
  sleep 1
  playwright-cli -s=brand screenshot --filename="$4" >/dev/null
}

cp "$src/mark.svg" "$out/favicon.svg"

# Chrome blocks file: URLs in playwright-cli unless the config allows them.
echo '{"allowUnrestrictedFileAccess": true}' > "$tmp/cli.config.json"
playwright-cli -s=brand open --config "$tmp/cli.config.json" --browser=chrome >/dev/null
shot "file://$src/og-image.html" 1200 630 "$out/og-image.png"

shot "file://$src/icon.html#bleed" 180 180 "$out/apple-touch-icon.png"
shot "file://$src/icon.html#bleed" 192 192 "$out/icon-192.png"
shot "file://$src/icon.html#bleed" 512 512 "$out/icon-512.png"

for s in 16 32 48; do shot "file://$src/icon.html#bleed" "$s" "$s" "$tmp/$s.png"; done
ffmpeg -y -v error -i "$tmp/16.png" -i "$tmp/32.png" -i "$tmp/48.png" \
  -map 0 -map 1 -map 2 -c:v png -pix_fmt rgba "$out/favicon.ico"
