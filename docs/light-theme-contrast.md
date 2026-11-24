# Light theme: colours and contrast (24 Nov 2026)

Switch: Light / Dark in the user menu (all roles). Dark is the default. The choice is saved on the device (`localStorage`, key `deutli-theme`) and applied before the page paints (`src/lib/theme.ts`).
Tokens live in `src/app/globals.css` (`[data-theme="light"]`). An area that must stay dark (sign-in showcase, Pro plan card) carries `data-theme="dark"`.

| Pair | Colours | Ratio | Needs |
|---|---|---|---|
| Text on page | #0b1739 on #f4f6fc | 16.3 | 4.5 |
| Text on card | #0b1739 on #ffffff | 17.6 | 4.5 |
| Muted text on page / card / panel | #4a5578 on #f4f6fc / #ffffff / #eceffa | 6.8 / 7.3 / 6.4 | 4.5 |
| Purple text on card / page / tint | #4f3fd8 on #ffffff / #f4f6fc / #e6e3ff | 6.9 / 6.4 / 5.5 | 4.5 |
| White text on button purple | #ffffff on #6552f5 | 5.2 | 4.5 |
| Success text on card / tint | #0a7a4c on #ffffff / #dcf5e9 | 5.4 / 4.7 | 4.5 |
| Error text on card / tint | #c42b3d on #ffffff / #fde9ec | 5.6 / 4.8 | 4.5 |
| Wrong answer text | #b8234a on #ffffff | 6.2 | 4.5 |
| Progress bar (cyan) on white | #0678a3 | 5.0 | 3 |
| Input outline on card / page | #7b86a8 | 3.6 / 3.3 | 3 |
| Focus ring on card | #5b49e6 | 5.9 | 3 |

Not changed, but below AA (found while checking, also true in the dark theme):
- White text on the brand purple `#7161ff` (dark theme button colour) is 4.3:1.
- White text on the right end of the purple-to-magenta gradient (`#cb3cff`) is 3.7:1.
