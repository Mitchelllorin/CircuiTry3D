"""
THE LAUNCHER ICON, CUT FROM THE REAL MARK.

What shipped was a flat schematic drawn edge to edge: a circuit diagram with
"R1 = 3 kΩ", "12V" and "5A" written on it, filling the whole 108dp square and
carrying its own dark panel. Three things wrong with that, and the phone shows
all three at once.

  1. It is not the mark. CircuiTry3D's icon is parts on a board, rendered
     through a camera — _media/_brand/CircuiTry3D/CircuiTry3D_icon_3d_512.png.
     A flat drawing is not that, and an app called 3D cannot ship a 2D icon.

  2. It ignores the adaptive-icon safe zone. An adaptive foreground is 108dp,
     but the launcher masks it down to the middle 72dp and a round mask keeps
     only a 72dp circle. Everything outside that is thrown away, so a full-bleed
     drawing loses its outer third — which is where those resistors were.

  3. It has text. At 48dp "R1 = 3 kΩ" is three grey smudges.

So: render the same scene the master icon comes from, lift it off its
background, and fit it inside the safe zone. The foreground is transparent
around the board, which is what lets the launcher's own shape, the parallax
and @color/ic_launcher_background do their jobs.

    python tools/brand/launcher-icon.py            # writes the mipmaps
    python tools/brand/launcher-icon.py --preview  # + masked previews to check

Nothing here draws geometry. The geometry is icon_scene.build_scene(), shared
with the 512 master, so the launcher icon cannot drift away from the brand one.
"""
import sys, math, argparse
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

BRAND_RENDER = Path(r"C:\Dev\_tools\brand-render")
sys.path.insert(0, str(BRAND_RENDER))

import icon_scene  # noqa: E402  (needs the path above)

REPO = Path(__file__).resolve().parents[2]
RES = REPO / "android" / "app" / "src" / "main" / "res"

# Supersample, then take the subject down with a premultiplied filter. The
# rasteriser has no anti-aliasing of its own, so this is where edges come from.
SS = 1600

# res/values/ic_launcher_background.xml — the foreground is laid over this.
BACKGROUND = (15, 23, 42)

# Adaptive foreground is 108dp; the launcher shows the middle 72dp and a round
# mask keeps a 72dp circle (radius 33.3% of the canvas). 0.54 puts the board
# inside that circle apart from its empty corners, and still reads at 48dp.
SAFE = 0.54

# Legacy icons carry their own shape, so the mark can sit larger in the frame,
# the way the 512 master does.
LEGACY = 0.84

FOREGROUND_DP = {"mdpi": 108, "hdpi": 162, "xhdpi": 216, "xxhdpi": 324, "xxxhdpi": 432}
LEGACY_DP = {"mdpi": 48, "hdpi": 72, "xhdpi": 96, "xxhdpi": 144, "xxxhdpi": 192}


def subject_rgba():
    """The mark on a transparent ground, cropped to itself.

    render() fills untouched pixels with `bg` and hands back RGB, so there is no
    alpha to read. Rendering the same scene over black and over white gives it
    up exactly: a pixel the geometry covered is identical in both, because its
    shade never depended on the background. No tolerance, no colour keying, and
    it stays correct if the palette changes.
    """
    on_black = np.asarray(icon_scene.render_icon(SS, (0, 0, 0)).convert("RGB")).astype(np.int16)
    on_white = np.asarray(icon_scene.render_icon(SS, (255, 255, 255)).convert("RGB")).astype(np.int16)

    covered = (on_black == on_white).all(axis=2)
    if not covered.any():
        raise SystemExit("nothing rendered — the scene came back empty")

    rgba = np.zeros((SS, SS, 4), np.uint8)
    rgba[..., :3] = on_black.astype(np.uint8)
    rgba[..., 3] = np.where(covered, 255, 0).astype(np.uint8)

    ys, xs = np.nonzero(covered)
    top, bottom = ys.min(), ys.max() + 1
    left, right = xs.min(), xs.max() + 1
    return Image.fromarray(rgba[top:bottom, left:right], "RGBA")


def resize_rgba(img, size):
    """Resize without the dark halo.

    Straight LANCZOS on RGBA filters colour and alpha separately, so the black
    sitting under the transparent pixels bleeds into every edge and the board
    picks up a dirty outline. Premultiply, filter, then divide it back out.
    """
    a = np.asarray(img).astype(np.float32) / 255.0
    pre = np.dstack([a[..., :3] * a[..., 3:4], a[..., 3:4]])
    small = np.asarray(
        Image.fromarray((pre * 255).round().astype(np.uint8), "RGBA").resize(size, Image.LANCZOS)
    ).astype(np.float32) / 255.0
    alpha = small[..., 3:4]
    rgb = np.divide(small[..., :3], alpha, out=np.zeros_like(small[..., :3]), where=alpha > 1e-4)
    out = np.dstack([np.clip(rgb, 0, 1), np.clip(alpha, 0, 1)])
    return Image.fromarray((out * 255).round().astype(np.uint8), "RGBA")


def fit(subject, canvas_px, fraction):
    """Centre the mark on a transparent square, scaled to `fraction` of it."""
    target = canvas_px * fraction
    scale = min(target / subject.width, target / subject.height)
    size = (max(1, round(subject.width * scale)), max(1, round(subject.height * scale)))
    small = resize_rgba(subject, size)
    canvas = Image.new("RGBA", (canvas_px, canvas_px), (0, 0, 0, 0))
    canvas.paste(small, ((canvas_px - size[0]) // 2, (canvas_px - size[1]) // 2), small)
    return canvas


def masked(layer, shape):
    """Flatten onto the background colour under a launcher-style mask."""
    size = layer.width
    base = Image.new("RGBA", (size, size), BACKGROUND + (255,))
    base.alpha_composite(layer)
    mask = Image.new("L", (size, size), 0)
    draw = ImageDraw.Draw(mask)
    if shape == "round":
        draw.ellipse([0, 0, size - 1, size - 1], fill=255)
    else:
        draw.rounded_rectangle([0, 0, size - 1, size - 1], radius=int(size * 0.22), fill=255)
    base.putalpha(mask)
    return base


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--preview", action="store_true",
                    help="also write masked previews next to this script")
    args = ap.parse_args()

    print(f"rendering the mark at {SS}x{SS} ...")
    subject = subject_rgba()
    print(f"  mark is {subject.width}x{subject.height} before fitting")

    for density, dp in FOREGROUND_DP.items():
        out = RES / f"mipmap-{density}" / "ic_launcher_foreground.png"
        fit(subject, dp, SAFE).save(out)
        print(f"  {out.relative_to(REPO)}  {dp}x{dp}")

    for density, dp in LEGACY_DP.items():
        layer = fit(subject, dp, LEGACY)
        for name, shape in (("ic_launcher.png", "square"), ("ic_launcher_round.png", "round")):
            out = RES / f"mipmap-{density}" / name
            masked(layer, shape).save(out)
            print(f"  {out.relative_to(REPO)}  {dp}x{dp}")

    if args.preview:
        here = Path(__file__).parent
        fg = fit(subject, 432, SAFE)
        # What a round-masked launcher actually keeps of the foreground.
        base = Image.new("RGBA", (432, 432), BACKGROUND + (255,))
        base.alpha_composite(fg)
        m = Image.new("L", (432, 432), 0)
        ImageDraw.Draw(m).ellipse([108, 108, 323, 323], fill=255)   # the 72dp circle
        base.putalpha(m)
        base.save(here / "preview-round-mask.png")
        masked(fit(subject, 192, LEGACY), "square").resize((48, 48), Image.LANCZOS).save(
            here / "preview-legacy-48.png")
        print("  previews: tools/brand/preview-*.png")

    print("done")


if __name__ == "__main__":
    main()
