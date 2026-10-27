# RootSquare typography

Version 1.1 · 2026-10-26

RootSquare uses one typeface: **Outfit**, a geometric sans by the Outfit Project Authors. The website already loads it (Google Fonts, `Outfit:wght@100..900`), and the wordmark is drawn from Outfit ExtraBold.

## Roles and weights

| Role | Weight | Notes |
|---|---|---|
| Wordmark | ExtraBold 800 | Supplied as outlines in `01_logos/wordmark/`. Never retype the wordmark, always use the artwork. |
| Display, large headlines | Bold 700 to Black 900 | Tight line height (1.05 to 1.15). The website uses 800 to 900 for hero text. |
| Section headings | Bold 700 | Line height 1.2. |
| Subheadings, emphasis | SemiBold 600 | |
| Buttons, labels, navigation | Medium 500 | Sentence case. |
| Body text | Regular 400 | 16 to 18 px on screen, line height 1.5. Use Shadow Grey on white for 4.5:1 contrast or better. |
| Large intro paragraphs | Light 300 | Only at 20 px and above. Avoid Thin 100 and ExtraLight 200 for anything that must be read. |

Colour for text: Shadow Grey `#1d1a27` on white, or white on Shadow Grey. Chocolate Plum (`#644041`) works for secondary text on light grounds. Blaze Orange, Blazing Flame and Electric Red reach 3:1 on white but not 4.5:1, so use them only for large text and accents, never body copy. Twilight Indigo and Chocolate Plum are under 3:1 on Shadow Grey; Light Blue, White Smoke, Powder Petal and Cherry Blossom are under 3:1 on white (see `02_palette/`).

## Fallback stack

```css
font-family: "Outfit", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
```

## Files in `outfit/`

| File | Weight |
|---|---|
| `Outfit-Black.ttf` | Black |
| `Outfit-Bold.ttf` | Bold |
| `Outfit-ExtraBold.ttf` | ExtraBold |
| `Outfit-ExtraLight.ttf` | ExtraLight |
| `Outfit-Light.ttf` | Light |
| `Outfit-Medium.ttf` | Medium |
| `Outfit-Regular.ttf` | Regular |
| `Outfit-SemiBold.ttf` | SemiBold |
| `Outfit-Thin.ttf` | Thin |
| `Outfit[wght].ttf` | Variable, 100 to 900 (one file, every weight) |
| `OFL.txt` | Licence text |

Use the variable font where the app supports it (Figma, recent Adobe apps, the web). Install the static weights for everything else (Word, PowerPoint, older apps).

Source: <https://github.com/Outfitio/Outfit-Fonts> (version 1.100).

## Licence

Outfit is licensed under the **SIL Open Font License 1.1** (`outfit/OFL.txt`). In short, you may use it free of charge in commercial work, embed it in documents, apps and websites, and pass it on with this licence. You may not sell the font files on their own. The font licence covers the typeface only; it does not cover the RootSquare logo or wordmark.

## Not part of the brand typography

`radical-window_public.html` (the logo tool on the website) also loads IBM Plex Sans and IBM Plex Mono for its interface. They are not used in the logo or in this kit, so they are not included here.
