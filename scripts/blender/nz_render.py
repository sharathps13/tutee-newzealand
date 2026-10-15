# 3D render of New Zealand for the universities map (index.html #nzm), made in Blender (Cycles).
#   blender -b -P scripts/blender/nz_render.py -- <out_dir> [preview]
# Builds real terrain (land AND seabed) from AWS Terrain Tiles (terrarium, public), drapes the Sentinel-2 cloudless
# 2016 photo (EOX, CC BY 4.0) over the land, puts a refractive water surface over a seabed coloured by true depth,
# lights it with a low north-west sun, and renders through a tilted orthographic camera. It also projects the
# coastline (Natural Earth) and the university pins through the same camera into render pixels (projection.json),
# so the page can draw the outline, pins and leader lines exactly on top of the render.
import bpy, bmesh, math, json, os, sys, re, urllib.request
import numpy as np
from mathutils import Vector
from bpy_extras.object_utils import world_to_camera_view

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
OUT = os.path.abspath(argv[0] if argv else 'nz-render')
PREVIEW = len(argv) > 1 and argv[1] == 'preview'
PROJECT_ONLY = len(argv) > 1 and argv[1] == 'project'   # recompute projection.json (outline, pins) without rendering
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
CACHE = os.path.join(OUT, 'cache'); os.makedirs(CACHE, exist_ok=True)

# the page's map projection (map units); Blender Y points north, so Y = −(page y)
PX = lambda lon: (lon - 166.2) * 0.755 * 30 + 8
PY = lambda lat: -((-lat - 34.1) * 30 + 8)
KM_PER_UNIT = 3.7          # one map unit ≈ 3.7 km on the ground
LAND_EXAG, SEA_EXAG = 11, 2

LON0, LON1, LAT0, LAT1 = 158.0, 188.0, -51.0, -30.0
STEP = 0.04 if PREVIEW else 0.02

def fetch(url, name):
    p = os.path.join(CACHE, name)
    if not os.path.exists(p):
        req = urllib.request.Request(url, headers={'User-Agent': 'tutee-nz-map-builder'})
        with urllib.request.urlopen(req, timeout=120) as r, open(p, 'wb') as f: f.write(r.read())
    return p

def load_rgb(path):
    img = bpy.data.images.load(path, check_existing=False)
    img.colorspace_settings.name = 'Non-Color'
    w, h = img.size; a = np.empty(w * h * 4, np.float32); img.pixels.foreach_get(a)
    bpy.data.images.remove(img)
    return np.flipud(a.reshape(h, w, 4))   # row 0 = top

# ---------- elevation: terrarium tiles (zoom 7), sampled onto a lon/lat grid ----------
Z = 6 if PREVIEW else 7
n = 2 ** Z
def tile_xy(lon, lat):
    x = ((lon + 180) % 360) / 360 * n
    y = (1 - math.log(math.tan(math.radians(lat)) + 1 / math.cos(math.radians(lat))) / math.pi) / 2 * n
    return x, y
xs = sorted({int(tile_xy(l, -40)[0]) % n for l in np.arange(LON0, LON1 + .5, .5)})
ty0, ty1 = int(tile_xy(170, LAT1)[1]), int(tile_xy(170, LAT0)[1])
tiles = {}
for tx in xs:
    for ty in range(ty0, ty1 + 1):
        p = fetch(f'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{Z}/{tx}/{ty}.png', f't{Z}_{tx}_{ty}.png')
        a = load_rgb(p) * 255
        tiles[(tx, ty)] = a[..., 0] * 256 + a[..., 1] + a[..., 2] / 256 - 32768
lons = np.arange(LON0, LON1 + 1e-9, STEP); lats = np.arange(LAT1, LAT0 - 1e-9, -STEP)   # north → south
W, H = len(lons), len(lats)
elev = np.zeros((H, W), np.float32)
for j, lat in enumerate(lats):
    _, fy = tile_xy(170, lat); ty = int(fy); py = min(255, int((fy - ty) * 256))
    for i, lon in enumerate(lons):
        fx, _ = tile_xy(lon, lat); tx = int(fx) % n; px = min(255, int((fx - int(fx)) * 256))
        t = tiles.get((tx, ty)); elev[j, i] = t[py, px] if t is not None else -4000
# a light 3x3 smoothing, so a lone volcano (Taranaki) rises as a cone, not a needle with a long shadow
k = np.pad(elev, 1, mode='edge'); elev = sum(k[dy:dy + H, dx:dx + W] for dy in range(3) for dx in range(3)) / 9
print('grid', W, H, 'elev range', float(elev.min()), float(elev.max()))

# ---------- scene ----------
bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene

# terrain mesh (land + seabed), vertices on the lon/lat grid
X = np.array([PX(l) for l in lons], np.float32); Y = np.array([PY(l) for l in lats], np.float32)
zz = np.where(elev > 0, elev / 1000 / KM_PER_UNIT * LAND_EXAG, np.maximum(elev, -6500) / 1000 / KM_PER_UNIT * SEA_EXAG).astype(np.float32)
gx, gy = np.meshgrid(X, Y)
verts = np.stack([gx, gy, zz], -1).reshape(-1, 3)
ii, jj = np.meshgrid(np.arange(W - 1), np.arange(H - 1))
v0 = (jj * W + ii).ravel(); quads = np.stack([v0, v0 + W, v0 + W + 1, v0 + 1], -1)
me = bpy.data.meshes.new('terrain')
me.vertices.add(len(verts)); me.vertices.foreach_set('co', verts.ravel())
me.loops.add(quads.size); me.loops.foreach_set('vertex_index', quads.ravel().astype(np.int32))
me.polygons.add(len(quads)); me.polygons.foreach_set('loop_start', np.arange(0, quads.size, 4, dtype=np.int32))
me.shade_smooth() if hasattr(me, 'shade_smooth') else None
# attributes: true elevation (m) and lon/lat UV for the photo
at = me.attributes.new('elev', 'FLOAT', 'POINT'); at.data.foreach_set('value', elev.ravel())
uv = me.uv_layers.new(name='lonlat')
gu, gv = np.meshgrid((lons - 164) / 16, (lats + 49) / 16)
uvv = np.stack([gu, gv], -1).reshape(-1, 2)[quads.ravel()]
uv.data.foreach_set('uv', uvv.ravel().astype(np.float32))
me.update(); me.validate()
terrain = bpy.data.objects.new('terrain', me); sc.collection.objects.link(terrain)

# land photo (Sentinel-2 cloudless 2016, EOX, CC BY 4.0), lon 164–180, lat −49…−33
s2 = fetch('https://tiles.maps.eox.at/wms?SERVICE=WMS&REQUEST=GetMap&VERSION=1.1.1&LAYERS=s2cloudless&STYLES=&SRS=EPSG:4326&BBOX=164,-49,180,-33&WIDTH=' + ('1600' if PREVIEW else '4000') + '&HEIGHT=' + ('1600' if PREVIEW else '4000') + '&FORMAT=image/jpeg', 's2_' + ('p' if PREVIEW else 'f') + '.jpg')

def node(nt, kind, loc=(0, 0), **kw):
    nd = nt.nodes.new(kind); nd.location = loc
    for k, v in kw.items(): setattr(nd, k, v)
    return nd

mat = bpy.data.materials.new('terrain'); mat.use_nodes = True; nt = mat.node_tree; nt.nodes.clear()
outn = node(nt, 'ShaderNodeOutputMaterial', (900, 0))
bsdf = node(nt, 'ShaderNodeBsdfPrincipled', (600, 0)); bsdf.inputs['Roughness'].default_value = .9
attr = node(nt, 'ShaderNodeAttribute', (-800, -200), attribute_name='elev')
uvn = node(nt, 'ShaderNodeUVMap', (-800, 200), uv_map='lonlat')
tex = node(nt, 'ShaderNodeTexImage', (-500, 250), extension='CLIP', interpolation='Cubic'); tex.image = bpy.data.images.load(s2)
grade = node(nt, 'ShaderNodeHueSaturation', (-200, 250)); grade.inputs['Saturation'].default_value = 1.08; grade.inputs['Value'].default_value = 1.25
nt.links.new(uvn.outputs['UV'], tex.inputs['Vector']); nt.links.new(tex.outputs['Color'], grade.inputs['Color'])
# seabed colour by true depth: sand in the shallows → turquoise shelf → ocean blue → abyssal navy
depth = node(nt, 'ShaderNodeMath', (-500, -200), operation='MULTIPLY'); depth.inputs[1].default_value = -1
nt.links.new(attr.outputs['Fac'], depth.inputs[0])
remap = node(nt, 'ShaderNodeMapRange', (-300, -200)); remap.inputs['From Min'].default_value = 0; remap.inputs['From Max'].default_value = 5500; remap.clamp = True
nt.links.new(depth.outputs['Value'], remap.inputs['Value'])
curve = node(nt, 'ShaderNodeMath', (-150, -200), operation='POWER'); curve.inputs[1].default_value = .32   # spread the shallow end
nt.links.new(remap.outputs['Result'], curve.inputs[0])
ramp = node(nt, 'ShaderNodeValToRGB', (0, -200)); el = ramp.color_ramp.elements
el[0].position = 0; el[0].color = (.36, .70, .66, 1)
el[1].position = 1; el[1].color = (.004, .02, .07, 1)
for pos, col in [(.12, (.12, .52, .58, 1)), (.2, (.04, .30, .46, 1)), (.32, (.02, .16, .33, 1)), (.5, (.012, .08, .22, 1)), (.7, (.007, .045, .14, 1))]:
    e = el.new(pos); e.color = col
nt.links.new(curve.outputs['Value'], ramp.inputs['Fac'])
# land where elevation > 0 (photo), seabed elsewhere; where the photo has no data (outside its box) use pasture green
isl = node(nt, 'ShaderNodeMath', (-300, 0), operation='GREATER_THAN'); isl.inputs[1].default_value = 0.5
nt.links.new(attr.outputs['Fac'], isl.inputs[0])
fallback = node(nt, 'ShaderNodeMix', (100, 250), data_type='RGBA'); fallback.inputs[7].default_value = (.12, .2, .08, 1)
nt.links.new(tex.outputs['Alpha'], fallback.inputs[0]); nt.links.new(grade.outputs['Color'], fallback.inputs[7]); fallback.inputs[6].default_value = (.12, .2, .08, 1)
nt.links.new(fallback.outputs[2], bsdf.inputs['Base Color'])
# the sea floor as seen through water: light is absorbed with depth, so the floor's own shading (and its relief) only
# shows in the shallows, v = e^(−depth / 32 m); deeper, all you see is the colour the water column scatters back,
# which darkens from turquoise to deep ocean navy, with faint large-scale variation (plankton, sediment, swell)
vis = node(nt, 'ShaderNodeMath', (-300, -500), operation='DIVIDE'); vis.inputs[1].default_value = -32
nt.links.new(depth.outputs['Value'], vis.inputs[0])
vexp = node(nt, 'ShaderNodeMath', (-150, -500), operation='EXPONENT', use_clamp=True); nt.links.new(vis.outputs['Value'], vexp.inputs[0])
wcol = node(nt, 'ShaderNodeValToRGB', (0, -500)); we = wcol.color_ramp.elements
we[0].position = 0; we[0].color = (.09, .36, .38, 1); we[1].position = 1; we[1].color = (.003, .016, .055, 1)
for pos, col in [(.1, (.04, .25, .32, 1)), (.2, (.018, .13, .23, 1)), (.32, (.010, .065, .15, 1)), (.5, (.006, .036, .10, 1))]:
    e = we.new(pos); e.color = col
nt.links.new(curve.outputs['Value'], wcol.inputs['Fac'])
coords = node(nt, 'ShaderNodeTexCoord', (-500, -750))
swell = node(nt, 'ShaderNodeTexNoise', (-300, -750)); swell.inputs['Scale'].default_value = .012; swell.inputs['Detail'].default_value = 4; swell.inputs['Roughness'].default_value = .55
nt.links.new(coords.outputs['Object'], swell.inputs['Vector'])
vary = node(nt, 'ShaderNodeMapRange', (-120, -750)); vary.inputs['To Min'].default_value = .86; vary.inputs['To Max'].default_value = 1.14
nt.links.new(swell.outputs['Fac'], vary.inputs['Value'])
tint = node(nt, 'ShaderNodeMix', (200, -600), data_type='RGBA', blend_type='MULTIPLY'); tint.inputs[0].default_value = 1
nt.links.new(wcol.outputs['Color'], tint.inputs[6]); nt.links.new(vary.outputs['Result'], tint.inputs[7])
scatter = node(nt, 'ShaderNodeEmission', (400, -600)); scatter.inputs['Strength'].default_value = 1.0
nt.links.new(tint.outputs[2], scatter.inputs['Color'])
floor = node(nt, 'ShaderNodeBsdfPrincipled', (400, -300)); floor.inputs['Roughness'].default_value = 1
nt.links.new(ramp.outputs['Color'], floor.inputs['Base Color'])
seabed = node(nt, 'ShaderNodeMixShader', (650, -400))
nt.links.new(vexp.outputs['Value'], seabed.inputs[0]); nt.links.new(scatter.outputs[0], seabed.inputs[1]); nt.links.new(floor.outputs[0], seabed.inputs[2])
final = node(nt, 'ShaderNodeMixShader', (800, -100))
nt.links.new(isl.outputs['Value'], final.inputs[0]); nt.links.new(seabed.outputs[0], final.inputs[1]); nt.links.new(bsdf.outputs[0], final.inputs[2])
outn.location = (1000, -100); nt.links.new(final.outputs[0], outn.inputs['Surface'])
terrain.data.materials.append(mat)

# water: a refractive surface at sea level with fine wind ripples (they catch the sun as glints)
bpy.ops.mesh.primitive_plane_add(size=1, location=((PX(LON0) + PX(LON1)) / 2, (PY(LAT0) + PY(LAT1)) / 2, 0))
water = bpy.context.active_object; water.name = 'water'; water.scale = (PX(LON1) - PX(LON0), PY(LAT1) - PY(LAT0), 1)
wm = bpy.data.materials.new('water'); wm.use_nodes = True; wt = wm.node_tree; wt.nodes.clear()
wo = node(wt, 'ShaderNodeOutputMaterial', (600, 0))
wb = node(wt, 'ShaderNodeBsdfPrincipled', (300, 0))
wb.inputs['Base Color'].default_value = (.92, .97, 1, 1); wb.inputs['Roughness'].default_value = .025; wb.inputs['IOR'].default_value = 1.333
wb.inputs['Transmission Weight'].default_value = 1
# wind ripples far finer than the map can resolve: they only roughen the sky's reflection into a soft sheen
wn = node(wt, 'ShaderNodeTexNoise', (-200, -200)); wn.inputs['Scale'].default_value = 70; wn.inputs['Detail'].default_value = 6
wbump = node(wt, 'ShaderNodeBump', (50, -200)); wbump.inputs['Strength'].default_value = .035; wbump.inputs['Distance'].default_value = .01
wt.links.new(wn.outputs['Fac'], wbump.inputs['Height']); wt.links.new(wbump.outputs['Normal'], wb.inputs['Normal']); wt.links.new(wb.outputs[0], wo.inputs['Surface'])
water.data.materials.append(wm)
water.visible_shadow = False   # let sunlight through to the seabed (no caustics), so the shallows light up

# light: a low sun from the north-west (the relief-atlas convention) and a soft blue sky
sun_data = bpy.data.lights.new('sun', 'SUN'); sun_data.energy = 4.8; sun_data.angle = math.radians(1.2); sun_data.color = (1, .96, .9)
sun = bpy.data.objects.new('sun', sun_data); sc.collection.objects.link(sun)
sun.rotation_euler = (math.radians(52), 0, math.radians(135))   # 38° above the horizon, from the north-west
world = bpy.data.worlds.new('sky'); sc.world = world; world.use_nodes = True
bg = world.node_tree.nodes['Background']; bg.inputs['Color'].default_value = (.42, .58, .82, 1); bg.inputs['Strength'].default_value = .7

# camera: orthographic, tilted 24° so the relief reads in 3D; frames the page's map panel (global x −5…520, y −5…465)
TILT = math.radians(24)
cam_data = bpy.data.cameras.new('cam'); cam_data.type = 'ORTHO'; cam_data.ortho_scale = 525; cam_data.clip_end = 5000
cam = bpy.data.objects.new('cam', cam_data); sc.collection.objects.link(cam); sc.camera = cam
target = Vector((215, -232, 0)); D = 1500
cam.location = target + Vector((0, -D * math.sin(TILT), D * math.cos(TILT))); cam.rotation_euler = (TILT, 0, 0)

r = sc.render; r.engine = 'CYCLES'
r.resolution_x, r.resolution_y = (900, 806) if PREVIEW else (1800, 1611); r.resolution_percentage = 100
sc.cycles.device = 'CPU'; sc.cycles.samples = 24 if PREVIEW else 48; sc.cycles.use_denoising = True
sc.cycles.max_bounces = 6; sc.cycles.transmission_bounces = 4; sc.cycles.glossy_bounces = 3; sc.cycles.diffuse_bounces = 2
sc.cycles.caustics_refractive = False; sc.cycles.caustics_reflective = False
sc.view_settings.view_transform = 'AgX'; sc.view_settings.exposure = -.05
try: sc.view_settings.look = 'AgX - Medium High Contrast'
except Exception:
    try: sc.view_settings.look = 'Medium High Contrast'
    except Exception: pass
r.film_transparent = False
r.image_settings.file_format = 'PNG'
r.filepath = os.path.join(OUT, 'nz-3d' + ('-preview' if PREVIEW else '') + '.png')

# ---------- projection: coastline + pins → render pixels ----------
bpy.context.view_layer.update()
RW, RH = r.resolution_x, r.resolution_y
def to_px(x, y, z=0.0):
    v = world_to_camera_view(sc, cam, Vector((x, y, z)))
    return [round(v.x * RW, 2), round((1 - v.y) * RH, 2)]
def height_at(lon, lat):
    i = int(round((lon - LON0) / STEP)); j = int(round((LAT1 - lat) / STEP))
    return float(zz[min(H - 1, max(0, j)), min(W - 1, max(0, i))])
land = json.load(open(os.path.join(OUT, 'ne_10m_land.geojson'), encoding='utf8')) if os.path.exists(os.path.join(OUT, 'ne_10m_land.geojson')) else None
rings = []
if land:
    for f in land['features']:
        g = f['geometry']; polys = [g['coordinates']] if g['type'] == 'Polygon' else g['coordinates']
        for p in polys:
            ring = p[0]
            if all(165.5 < a < 179.5 and -48 < b < -33.8 for a, b in ring): rings.append([to_px(PX(a), PY(b)) for a, b in ring])
# the eight universities, in the page's list order (lon, lat). Fixed here, never read back from the page, so
# re-running the render can't project already-projected pins a second time.
UNIS = [(174.770, -36.850), (174.875, -36.985),   # University of Auckland (city), AUT (South campus, Manukau, so the two pins don't overlap)
        (175.282, -37.790), (175.608, -40.350),   # Waikato (Hamilton), Massey (Palmerston North)
        (174.778, -41.290), (172.642, -43.530),   # Victoria (Wellington), Canterbury (Christchurch)
        (172.478, -43.640), (170.500, -45.870)]   # Lincoln, Otago (Dunedin)
pins = [to_px(PX(lon), PY(lat), height_at(lon, lat)) for lon, lat in UNIS]
json.dump({'size': [RW, RH], 'frame': {'x': -5, 'y': -5, 'w': 525, 'h': 470}, 'rings': rings, 'pins': pins}, open(os.path.join(OUT, 'projection' + ('-preview' if PREVIEW else '') + '.json'), 'w'))
print('projected', len(rings), 'rings,', len(pins), 'pins')

if PROJECT_ONLY: sys.exit(0)
bpy.ops.render.render(write_still=True)
print('rendered', r.filepath)
