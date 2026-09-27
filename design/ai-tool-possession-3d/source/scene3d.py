"""Ember Circuitry — 3D. A liquid circuit creature possessing a floating software window.
Blender (bpy) + Cycles. Params via env: SAMPLES, PCT, OUT."""
import bpy, bmesh, math, os, random, time
from mathutils import Vector, Euler, Matrix, Quaternion

SP = os.path.dirname(os.path.abspath(__file__))
SAMPLES = int(os.environ.get('SAMPLES', '32'))
PCT = int(os.environ.get('PCT', '50'))
OUT = os.environ.get('OUT', f'{SP}/out3d/art.png')
random.seed(7)
T0 = time.time()
def log(m): print(f'[{time.time()-T0:6.1f}s] {m}', flush=True)

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
C = scene.collection

# ------------------------------------------------------------------ render setup
scene.render.engine = 'CYCLES'
cy = scene.cycles
cy.device = 'CPU'
cy.samples = SAMPLES
cy.use_adaptive_sampling = True
cy.adaptive_threshold = 0.02
cy.use_denoising = True
cy.denoiser = 'OPENIMAGEDENOISE'
cy.max_bounces = 10; cy.glossy_bounces = 6; cy.transmission_bounces = 8; cy.diffuse_bounces = 3
cy.caustics_reflective = False; cy.caustics_refractive = False
cy.sample_clamp_indirect = 8.0
scene.render.threads_mode = 'AUTO'
scene.render.resolution_x = 1080; scene.render.resolution_y = 1350; scene.render.resolution_percentage = PCT
scene.render.image_settings.file_format = 'PNG'; scene.render.image_settings.color_depth = '16'
scene.view_settings.view_transform = 'AgX'
for look in ('AgX - Medium High Contrast', 'Medium High Contrast', 'AgX - Punchy'):
    try:
        scene.view_settings.look = look; break
    except TypeError:
        pass
scene.view_settings.exposure = 0.0

world = bpy.data.worlds.new('World'); scene.world = world; world.use_nodes = True
world.node_tree.nodes['Background'].inputs[0].default_value = (0.0016, 0.0015, 0.0017, 1)

# ------------------------------------------------------------------ helpers
def link(obj, parent=None):
    C.objects.link(obj)
    if parent: obj.parent = parent
    return obj

def mesh_obj(name, bm, parent=None):
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    return link(bpy.data.objects.new(name, me), parent)

def smooth(obj):
    for p in obj.data.polygons: p.use_smooth = True

def principled(name, **kw):
    m = bpy.data.materials.new(name); m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']
    for k, v in kw.items(): b.inputs[k].default_value = v
    return m, b

def image(path, colorspace='sRGB'):
    img = bpy.data.images.load(path); img.colorspace_settings.name = colorspace
    return img

# ------------------------------------------------------------------ rig (the window's frame of reference)
rig = link(bpy.data.objects.new('Rig', None))
rig.rotation_euler = Euler((math.radians(-5), 0, math.radians(24)), 'XYZ')
WW_, WH_, TH = 1.6, 1.6 * 760 / 860, 0.05
HX, HZ = WW_ / 2, WH_ / 2
def ui(ux, uy):  # UI pixel (860x760) -> rig-local x,z on the screen
    return -HX + ux / 860 * WW_, HZ - uy / 760 * WH_

# ------------------------------------------------------------------ window slab + screen
bm = bmesh.new(); bmesh.ops.create_cube(bm, size=1.0)
for v in bm.verts: v.co = Vector((v.co.x * (WW_ + 0.036), v.co.y * TH, v.co.z * (WH_ + 0.036)))
slab = mesh_obj('Slab', bm, rig)
bev = slab.modifiers.new('bevel', 'BEVEL'); bev.width = 0.022; bev.segments = 8; bev.limit_method = 'ANGLE'
smooth(slab)
m_slab, b = principled('Titanium', **{'Base Color': (0.035, 0.036, 0.04, 1), 'Metallic': 1.0, 'Roughness': 0.26})
slab.data.materials.append(m_slab)

bm = bmesh.new()
verts = [bm.verts.new((x, -TH / 2 - 0.0012, z)) for x, z in ((-HX, -HZ), (HX, -HZ), (HX, HZ), (-HX, HZ))]
f = bm.faces.new(verts); uvl = bm.loops.layers.uv.new()
for loop, uv in zip(f.loops, ((0, 0), (1, 0), (1, 1), (0, 1))): loop[uvl].uv = uv
f.normal_update()
screen = mesh_obj('Screen', bm, rig)
m_scr, b = principled('Screen', **{'Base Color': (0.004, 0.004, 0.005, 1), 'Roughness': 0.045, 'Emission Strength': 2.4})
nt = m_scr.node_tree; tex = nt.nodes.new('ShaderNodeTexImage'); tex.image = image(f'{SP}/out/screen.png')
tex.interpolation = 'Cubic'
nt.links.new(tex.outputs['Color'], b.inputs['Emission Color'])
screen.data.materials.append(m_scr)
log('window')

# ------------------------------------------------------------------ the creature: metaball liquid
EXl, EZl = ui(307, 282)
mb = bpy.data.metaballs.new('GooMB'); mb.resolution = 0.0075; mb.render_resolution = 0.0075; mb.threshold = 0.6
goo_mb = link(bpy.data.objects.new('GooMB', mb), rig)
def ball(co, r, stiff=2.0):
    e = mb.elements.new(type='BALL'); e.co = Vector(co); e.radius = r; e.stiffness = stiff; return e
def ellip(co, r, sx, sy, sz, stiff=2.0, rot=None):
    e = mb.elements.new(type='ELLIPSOID'); e.co = Vector(co); e.radius = r; e.stiffness = stiff
    e.size_x, e.size_y, e.size_z = sx, sy, sz
    if rot is not None: e.rotation = rot
    return e

YF = -TH / 2  # screen plane
def edge_x(z):  # right boundary of the goo sheet, organic
    return (EXl + 0.24) + 0.10 * math.sin(z * 5.1 + 0.6) + 0.05 * math.sin(z * 11.3 + 2.0) - 0.16 * max(0, z - 0.35) - 0.10 * max(0, -z - 0.35)

# the sheet: flattened blobs hugging the screen
z = -HZ + 0.02
while z < HZ - 0.01:
    x = -HX + 0.01
    ex = edge_x(z)
    while x < ex:
        r = 0.075 + random.random() * 0.035
        ellip((x + (random.random() - .5) * .03, YF - 0.004, z + (random.random() - .5) * .03), r, 1.0, 0.36, 1.0)
        x += 0.062
    z += 0.062
# lip wrapping the left edge (it came from behind the tool)
z = -HZ - 0.02
while z < HZ + 0.02:
    ball((-HX - 0.005, 0.0, z), 0.085 + 0.03 * random.random()); z += 0.05
# bulges behind the left edge (the body, glimpsed)
for co, r in (((-HX - 0.04, 0.10, 0.25), 0.21), ((-HX - 0.02, 0.12, -0.25), 0.19), ((-HX + 0.02, 0.10, 0.62), 0.15), ((-HX + 0.01, 0.09, -0.6), 0.16)):
    ball(co, r)
# wrap over the top and bottom edges
x = -HX
while x < ui(250, 0)[0]:
    ball((x, -0.005, HZ + 0.004), 0.07 + 0.02 * random.random()); x += 0.05
x = -HX
while x < ui(430, 0)[0]:
    ball((x, -0.005, -HZ - 0.004), 0.07 + 0.02 * random.random()); x += 0.05
# mound that carries the eye + a raised socket ring
ellip((EXl, YF - 0.02, EZl), 0.38, 1.0, 0.42, 1.0)
for k in range(40):
    a = k / 40 * math.tau
    ball((EXl + math.cos(a) * 0.272, YF - 0.05, EZl + math.sin(a) * 0.272), 0.062, 2.2)
# tendrils reaching into the dormant screen
for zt, reach, wob in ((0.52, 0.30, 0.9), (0.30, 0.42, 1.3), (0.05, 0.30, 0.7), (-0.12, 0.50, 1.1), (-0.34, 0.36, 1.6), (-0.55, 0.44, 0.8)):
    x0 = edge_x(zt) - 0.02; n = 16
    for i in range(n):
        t = i / (n - 1)
        x = x0 + reach * t; zz = zt + 0.035 * math.sin(t * 6 * wob + zt * 9) + 0.02 * t
        r = 0.068 * (1 - t) ** 0.8 + 0.018
        ellip((x, YF - 0.002, zz), r, 1.0, 0.42, 0.8)
# drips hanging from the bottom edge
DRIPS = [(ui(95, 0)[0], 0.20), (ui(210, 0)[0], 0.12), (ui(330, 0)[0], 0.27)]
for dx, L in DRIPS:
    n = 10
    for i in range(n):
        t = i / (n - 1)
        r = 0.05 * (1 - 0.55 * t) + (0.018 if t > 0.85 else 0)
        ball((dx + 0.004 * math.sin(t * 5), -0.006, -HZ - 0.03 - L * t), r, 2.0)
log(f'metaball elements: {len(mb.elements)}')

dg = bpy.context.evaluated_depsgraph_get()
goo_me = bpy.data.meshes.new_from_object(goo_mb.evaluated_get(dg))
goo = link(bpy.data.objects.new('Goo', goo_me), rig)
bpy.data.objects.remove(goo_mb)
smooth(goo)
log(f'goo mesh: {len(goo_me.vertices)} verts')

# falling droplet
bm = bmesh.new(); bmesh.ops.create_uvsphere(bm, u_segments=48, v_segments=32, radius=0.026)
for v in bm.verts: v.co.z *= 1.18
drop = mesh_obj('Drop', bm, rig); drop.location = (DRIPS[2][0] + 0.003, -0.006, -HZ - 0.03 - DRIPS[2][1] - 0.16); smooth(drop)

# ------------------------------------------------------------------ goo material: wet black glass with living circuitry
texspace = link(bpy.data.objects.new('TexSpace', None), rig)
m_goo, b = principled('Goo', **{'Base Color': (0.0035, 0.0032, 0.0034, 1), 'Roughness': 0.09, 'Coat Weight': 1.0, 'Coat Roughness': 0.025, 'Specular IOR Level': 0.6, 'Emission Strength': 3.2})
nt = m_goo.node_tree; N = nt.nodes; Lk = nt.links
tc = N.new('ShaderNodeTexCoord'); tc.object = texspace
mp = N.new('ShaderNodeMapping'); mp.inputs['Scale'].default_value = (1 / 1.6, 1 / 1.6, 1 / 2.0); mp.inputs['Location'].default_value = (1.1 / 1.6, 0.5, 1.05 / 2.0)
ci = N.new('ShaderNodeTexImage'); ci.image = image(f'{SP}/out/circuits.png'); ci.projection = 'BOX'; ci.projection_blend = 0.35; ci.interpolation = 'Cubic'
Lk.new(tc.outputs['Object'], mp.inputs['Vector']); Lk.new(mp.outputs['Vector'], ci.inputs['Vector'])
# breathe the veins: a slow noise mask so the pattern pulses rather than tiles evenly
nz = N.new('ShaderNodeTexNoise'); nz.inputs['Scale'].default_value = 2.2; nz.inputs['Detail'].default_value = 3
Lk.new(tc.outputs['Object'], nz.inputs['Vector'])
ramp = N.new('ShaderNodeValToRGB'); ramp.color_ramp.elements[0].position = 0.38; ramp.color_ramp.elements[0].color = (0.06, 0.06, 0.06, 1); ramp.color_ramp.elements[1].position = 0.62
Lk.new(nz.outputs['Fac'], ramp.inputs['Fac'])
mul = N.new('ShaderNodeMix'); mul.data_type = 'RGBA'; mul.blend_type = 'MULTIPLY'; mul.inputs['Factor'].default_value = 1.0
gam = N.new('ShaderNodeGamma'); gam.inputs['Gamma'].default_value = 2.2
Lk.new(ci.outputs['Color'], gam.inputs['Color'])
Lk.new(gam.outputs['Color'], mul.inputs[6]); Lk.new(ramp.outputs['Color'], mul.inputs[7])
Lk.new(mul.outputs[2], b.inputs['Emission Color'])
bump = N.new('ShaderNodeBump'); bump.inputs['Strength'].default_value = 0.35; bump.inputs['Distance'].default_value = 0.0015
Lk.new(ci.outputs['Color'], bump.inputs['Height']); Lk.new(bump.outputs['Normal'], b.inputs['Normal']); Lk.new(bump.outputs['Normal'], b.inputs['Coat Normal'])
for o in (goo, drop): o.data.materials.append(m_goo)
log('goo material')

# ------------------------------------------------------------------ the eye
def goo_front_y(x, z, rad=0.03):
    ys = [v.co.y for v in goo_me.vertices if (v.co.x - x) ** 2 + (v.co.z - z) ** 2 < rad * rad]
    return min(ys) if ys else YF - 0.06
yf = goo_front_y(EXl, EZl) - 0.012
eye_rig = link(bpy.data.objects.new('EyeRig', None), rig)
eye_rig.location = (EXl, yf, EZl)

R_E = 0.245
bm = bmesh.new(); bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=False, segments=128, radius1=R_E, radius2=R_E, depth=0.08)
bmesh.ops.rotate(bm, verts=bm.verts, cent=(0, 0, 0), matrix=Matrix.Rotation(math.radians(90), 3, 'X'))
bmesh.ops.translate(bm, verts=bm.verts, vec=(0, 0.04 + 0.0004, 0))
puck = mesh_obj('Puck', bm, eye_rig); puck.data.materials.append(m_goo)
bev = puck.modifiers.new('bevel', 'BEVEL'); bev.width = 0.006; bev.segments = 4; smooth(puck)

bm = bmesh.new(); bm.loops.layers.uv.new(); bmesh.ops.create_circle(bm, cap_ends=True, cap_tris=False, segments=192, radius=R_E - 0.004, calc_uvs=True)
bmesh.ops.rotate(bm, verts=bm.verts, cent=(0, 0, 0), matrix=Matrix.Rotation(math.radians(90), 3, 'X'))
disc = mesh_obj('EyeDisc', bm, eye_rig); disc.location = (0, -0.0006, 0)
m_eye, b = principled('Eye', **{'Base Color': (0.002, 0.002, 0.002, 1), 'Roughness': 0.2, 'Coat Weight': 1.0, 'Coat Roughness': 0.015, 'Emission Strength': 9.0})
nt = m_eye.node_tree; et = nt.nodes.new('ShaderNodeTexImage'); et.image = image(f'{SP}/out/eye.png'); et.interpolation = 'Cubic'
nt.links.new(et.outputs['Color'], b.inputs['Emission Color']); disc.data.materials.append(m_eye)

# glass lens over the iris
A_, Hd = 0.118, 0.034
Rs = (A_ * A_ + Hd * Hd) / (2 * Hd)
bm = bmesh.new(); bmesh.ops.create_uvsphere(bm, u_segments=128, v_segments=64, radius=Rs)
bmesh.ops.translate(bm, verts=bm.verts, vec=(0, Rs - Hd, 0))
bmesh.ops.delete(bm, geom=[v for v in bm.verts if v.co.y > 0.0005], context='VERTS')
edges = [e for e in bm.edges if e.is_boundary]
bmesh.ops.edgeloop_fill(bm, edges=edges)
dome = mesh_obj('Lens', bm, eye_rig); dome.location = (0, -0.0012, 0); smooth(dome)
m_glass, b = principled('Lens', **{'Base Color': (1, 1, 1, 1), 'Roughness': 0.0, 'IOR': 1.36, 'Transmission Weight': 1.0, 'Specular IOR Level': 0.7})
dome.data.materials.append(m_glass)
bpy.data.objects.remove(dome)
log('eye')

# ------------------------------------------------------------------ floor
bm = bmesh.new(); bmesh.ops.create_grid(bm, x_segments=1, y_segments=1, size=12)
floor = mesh_obj('Floor', bm); floor.location = (0, 2.0, -1.42)
m_floor, b = principled('Floor', **{'Base Color': (0.006, 0.006, 0.0065, 1), 'Roughness': 0.2, 'Specular IOR Level': 0.45})
floor.data.materials.append(m_floor)

# ------------------------------------------------------------------ camera
cam_d = bpy.data.cameras.new('Cam'); cam_d.lens = 62; cam_d.sensor_width = 36; cam_d.sensor_fit = 'AUTO'
cam = link(bpy.data.objects.new('Cam', cam_d)); scene.camera = cam
cam.location = (0.50, -4.55, 0.58)
target = Vector((-0.02, 0, -0.16))
cam.rotation_euler = (target - cam.location).to_track_quat('-Z', 'Y').to_euler()
cam_d.shift_y = 0.085
cam_d.dof.use_dof = True; cam_d.dof.focus_object = disc; cam_d.dof.aperture_fstop = 3.2

# let the eye turn a little toward the viewer
bpy.context.view_layer.update()
cam_local = rig.matrix_world.inverted() @ cam.location
look = (cam_local - eye_rig.location).normalized()
fwd = Vector((0, -1, 0))
blend = fwd.lerp(look, 0.55).normalized()
eye_rig.rotation_mode = 'QUATERNION'
eye_rig.rotation_quaternion = fwd.rotation_difference(blend)

# ------------------------------------------------------------------ lights
def area(name, loc, target, size, energy, color, shape='RECTANGLE', size_y=None):
    ld = bpy.data.lights.new(name, 'AREA'); ld.energy = energy; ld.color = color; ld.shape = shape; ld.size = size
    if size_y: ld.size_y = size_y
    o = link(bpy.data.objects.new(name, ld)); o.location = loc
    o.rotation_euler = (Vector(target) - Vector(loc)).to_track_quat('-Z', 'Y').to_euler()
    return o
area('Key', (2.6, -3.2, 2.9), (0, 0, 0), 2.6, 520, (0.80, 0.87, 1.0), size_y=1.3)
area('Strip', (-0.4, -2.2, 3.1), (0, 0, 0.2), 5.0, 260, (0.95, 0.96, 1.0), size_y=0.18)
area('Rim', (-3.2, 2.6, 1.2), (0, 0, 0), 2.2, 900, (1.0, 0.40, 0.11))
area('Kicker', (3.0, 2.2, -0.3), (0, 0, 0), 1.5, 260, (0.55, 0.65, 0.9))
log('scene ready')

scene.render.filepath = OUT
bpy.ops.render.render(write_still=True)
log(f'rendered -> {OUT}')
if os.environ.get('SAVE_BLEND'):
    bpy.ops.wm.save_as_mainfile(filepath=f'{SP}/out3d/scene.blend')
