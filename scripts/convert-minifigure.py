"""Run with Blender 4.2: blender -b --factory-startup -P scripts/convert-minifigure.py -- SOURCE_DIR OUTPUT_DIR.
Source: Rioforce, CC BY 3.0 with packaged non-commercial Fan Art notice. See NOTICE.txt.
No source scripts/drivers are executed. Only evaluated static meshes are exported.
"""
import bpy,sys,os,json,hashlib
from mathutils import Vector
args=sys.argv[sys.argv.index('--')+1:];source,out=args
os.makedirs(out,exist_ok=True)
manifest={'author':'Rioforce','title':'LEGO Minifigure - Cycles','source':'https://rioforce.wordpress.com/2013/07/30/download-a-lego-minifigure/','license':'CC BY 3.0; original package additionally restricts Fan Art to non-commercial use','variants':{}}
for variant,level in [('standard',1),('high',2)]:
 bpy.ops.wm.open_mainfile(filepath=os.path.join(source,'LEGO Minifigure - Blendswap.blend'),use_scripts=False)
 bpy.data.objects['Armature'].data.pose_position='REST'
 body=bpy.data.objects['Plane'];cap=bpy.data.objects['Cap -High-Poly']
 bpy.ops.object.select_all(action='DESELECT');body.select_set(True);bpy.context.view_layer.objects.active=body
 bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT');bpy.ops.mesh.separate(type='LOOSE');bpy.ops.object.mode_set(mode='OBJECT')
 pieces=list(bpy.context.selected_objects)
 # Rebuild legacy Cycles materials as glTF-compatible PBR, preserving the source UV atlas.
 for name in ['Minifig','Cap']:
  mat=bpy.data.materials[name];mat.use_nodes=True;mat.node_tree.nodes.clear();nodes=mat.node_tree.nodes;links=mat.node_tree.links
  shader=nodes.new('ShaderNodeBsdfPrincipled');output=nodes.new('ShaderNodeOutputMaterial');links.new(shader.outputs['BSDF'],output.inputs['Surface'])
  shader.inputs['Roughness'].default_value=.28
  if name=='Minifig':
   texture=nodes.new('ShaderNodeTexImage');texture.image=bpy.data.images.load(os.path.join(source,'Mini-tex.png'),check_existing=False);links.new(texture.outputs['Color'],shader.inputs['Base Color'])
  else:shader.inputs['Base Color'].default_value=(.4507858455,0,.0018211615,1)
 groups={}
 for obj in pieces+[cap]:
  n=len(obj.data.vertices);points=[obj.matrix_world@Vector(c) for c in obj.bound_box];x=sum(p.x for p in points)/8;side='right' if x>0 else 'left'
  if obj==cap:name='cap'
  elif n==562:name='head'
  elif n in [676,66,27]:name='torso'
  elif n in [778,288]:name='hips'
  elif n==1697:name=side+'_leg'
  elif n==362:name=side+'_arm'
  elif n in [235,320]:name=side+'_hand'
  else:raise RuntimeError('Unknown source component: '+str(n))
  for modifier in obj.modifiers:
   if modifier.type=='SUBSURF':modifier.levels=level;modifier.render_levels=level
  bpy.context.view_layer.update();evaluated=obj.evaluated_get(bpy.context.evaluated_depsgraph_get());mesh=bpy.data.meshes.new_from_object(evaluated,preserve_all_data_layers=True,depsgraph=bpy.context.evaluated_depsgraph_get());copy=bpy.data.objects.new(name,mesh);copy.matrix_world=obj.matrix_world.copy();bpy.context.collection.objects.link(copy);groups.setdefault(name,[]).append(copy)
 result=[]
 for name,objects in groups.items():
  bpy.ops.object.select_all(action='DESELECT')
  for o in objects:o.select_set(True)
  bpy.context.view_layer.objects.active=objects[0]
  if len(objects)>1:bpy.ops.object.join()
  obj=bpy.context.object;obj.name='minifig_'+name
  bpy.ops.object.origin_set(type='ORIGIN_GEOMETRY',center='BOUNDS');obj['component']=name;result.append(obj)
 bpy.ops.object.select_all(action='DESELECT')
 for obj in result:obj.select_set(True)
 triangles=0
 for obj in result:obj.data.calc_loop_triangles();triangles+=len(obj.data.loop_triangles)
 target=os.path.join(out,'minifigure-'+variant+'.glb')
 bpy.ops.export_scene.gltf(filepath=target,export_format='GLB',use_selection=True,export_animations=False,export_extras=True,export_cameras=False,export_lights=False,export_yup=True,export_draco_mesh_compression_enable=True,export_draco_mesh_compression_level=7,export_draco_position_quantization=16,export_draco_normal_quantization=12,export_draco_texcoord_quantization=14)
 manifest['variants'][variant]={'url':'/models/rioforce/minifigure-'+variant+'.glb','bytes':os.path.getsize(target),'triangles':triangles,'components':len(result),'subdivision':level,'sha256':hashlib.sha256(open(target,'rb').read()).hexdigest()}
 print('EXPORTED',variant,manifest['variants'][variant])
with open(os.path.join(out,'manifest.json'),'w') as f:json.dump(manifest,f,indent=2)
