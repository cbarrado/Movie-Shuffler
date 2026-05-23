"""Generate a 1024x1024 PNG icon (two dice) for Movie Shuffler.

Run once: produces icon.png in the icons/ folder. Then `cargo tauri icon
icons/icon.png` generates all sizes Tauri needs.
"""

from PIL import Image, ImageDraw

SIZE = 1024
WHITE = (236, 236, 241, 255)  # app --text
RED = (239, 68, 68, 255)      # app --accent
DARK = (28, 28, 34, 255)      # app --surface


def draw_die(draw, x, y, size, radius, fill, pip_color, pips, pip_radius):
    """Draw a die with rounded corners and a set of pips (positions in 3x3 grid)."""
    draw.rounded_rectangle(
        [x, y, x + size, y + size], radius=radius, fill=fill
    )
    cell = size / 4
    # 3x3 grid centers (col, row) in [0..2]
    for col, row in pips:
        cx = x + cell * (col + 1)
        cy = y + cell * (row + 1)
        draw.ellipse(
            [cx - pip_radius, cy - pip_radius, cx + pip_radius, cy + pip_radius],
            fill=pip_color,
        )


def main():
    img = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    # Back die: top-left, white, showing 5
    back_size = 500
    back_x, back_y = 60, 60
    draw_die(
        d,
        back_x,
        back_y,
        back_size,
        radius=90,
        fill=WHITE,
        pip_color=DARK,
        pips=[(0, 0), (2, 0), (1, 1), (0, 2), (2, 2)],
        pip_radius=40,
    )

    # Subtle shadow under the front die where it overlaps the back die
    front_size = 560
    front_x = SIZE - front_size - 60
    front_y = SIZE - front_size - 60

    shadow = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    sd = ImageDraw.Draw(shadow)
    sd.rounded_rectangle(
        [front_x - 6, front_y - 6, front_x + front_size + 6, front_y + front_size + 6],
        radius=110,
        fill=(0, 0, 0, 90),
    )
    img.alpha_composite(shadow)

    # Front die: bottom-right, red, showing 3
    draw_die(
        d,
        front_x,
        front_y,
        front_size,
        radius=100,
        fill=RED,
        pip_color=WHITE,
        pips=[(0, 0), (1, 1), (2, 2)],
        pip_radius=48,
    )

    out = "icon.png"
    img.save(out)
    print(f"Saved {out} ({SIZE}x{SIZE})")


if __name__ == "__main__":
    main()
