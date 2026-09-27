# لمّا الـ AI يتلبّس الأداة — 3D, no text

A 4:5 poster (1080×1350, plus a 2160×2700 master) with no text anywhere. The top third is left as clean dark space for a headline.

A liquid circuit creature, glossy black with glowing orange veins and a single eye (in the spirit of Upgrade from Ben 10, original design), has wrapped around a floating scientific software window. It covers half the screen and reaches across it with tendrils, and drips from its bottom edge. The half it has taken over is lit up; the rest of the tool is still cold and grey.

## Pipeline
1. `source/design.js` (Chromium canvas): text-free textures. Run `node render.js "screen?S=2.5" eye circuits`.
2. `source/scene3d.py` (Blender 5 / Cycles): metaball creature, window slab, lights, depth of field. Run `SAMPLES=64 PCT=200 OUT=out3d/art.png python3 scene3d.py`.
3. `python3 post.py out3d && python3 finish.py out3d`: bloom, chromatic fringe, vignette, grain.
