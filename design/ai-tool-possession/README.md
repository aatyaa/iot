# لمّا الـ AI يتلبّس الأداة — Tool-Augmented Scientific Agents

A 4:5 social post (Facebook / Instagram) for the Arabic series on AI in the service of science.

| File | Use |
| --- | --- |
| `titled.png` (1080×1350) | Ready to post, with the Arabic headline and the English term |
| `clean.png` (1080×1350) | Same artwork with the top third left empty, for your own text |
| `*@2x.png` (2160×2700) | High-resolution masters for print or later edits |
| `design-philosophy.md` | The visual system behind the piece ("Ember Circuitry") |

## The idea
A scientific software window, not a physical instrument, is caught halfway through being possessed.
- **The dormant side:** cold grey. The assistant panel only *talks* ("In theory, it might be worth testing someday…").
- **The possessed side:** glossy black with living orange circuit veins. The tool's radial chart has become a single eye, the spectrum is lit up and a new peak is flagged as NOVEL. The status bar reads `agent.merge(spectra)`, a quiet nod to Upgrade from Ben 10.
- **The boundary:** a liquid, advancing edge. Circuit roots reach ahead of it into the grey zone, and circuit traces spill out of the window onto the desk.

## Rebuilding
The piece is generated in code. Canvas/Skia is rendered in headless Chromium at 2x, then a Python finishing pass adds bloom, chromatic fringe, vignette and film grain.

```bash
# fonts (OFL, from Google Fonts): Alexandria, Readex Pro, JetBrains Mono, Instrument Sans → source/fonts/
cd source && mkdir -p out && python3 -m http.server 8765 &
node render.js art text      # -> out/art.png, out/text.png   (needs playwright)
python3 post.py && python3 finish.py   # -> out/clean*.png, out/titled*.png
```
