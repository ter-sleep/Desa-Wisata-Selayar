import {
  ACESFilmicToneMapping, AmbientLight, BoxGeometry, BufferGeometry, CanvasTexture, CircleGeometry,
  Color, ConeGeometry, CylinderGeometry, DirectionalLight, ExtrudeGeometry, Group, IcosahedronGeometry,
  InstancedMesh, Line, LineBasicMaterial, LineLoop, Material, Mesh, MeshStandardMaterial, Object3D,
  Path, PerspectiveCamera, PlaneGeometry, RepeatWrapping, Scene, Shape, SphereGeometry,
  SRGBColorSpace, Vector3, WebGLRenderer,
} from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { CSS2DObject, CSS2DRenderer } from 'three/addons/renderers/CSS2DRenderer.js'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import type { MapPoint, Position } from '@/lib/map-data'
import {
  geometryBounds, geometryCenter, geometryContains, geometryPolygons, mainIslandGeometry,
  miniatureProjection, projectPosition, unprojectPosition, type AreaGeometry, type TourismGeography,
} from '@/lib/tourism-geography'

export type CameraPose = { position: [number, number, number]; target: [number, number, number] }
type Callbacks = { onSelect: (slug: string) => void; onArea: () => void; onReady: () => void; onContextLost: () => void }

export function createMiniatureScene(container: HTMLDivElement, geography: TourismGeography, callbacks: Callbacks, pose: CameraPose | null) {
  const scene = new Scene()
  const geometries = new Set<BufferGeometry>()
  const materials = new Set<Material>()
  const instances: InstancedMesh[] = []
  const geometry = <T extends BufferGeometry>(value: T) => { geometries.add(value); return value }
  const material = <T extends Material>(value: T) => { materials.add(value); return value }
  const projection = miniatureProjection(geography.archipelago.geometry)
  const main = mainIslandGeometry(geography.archipelago.geometry)
  const mainBounds = geometryBounds(main)
  const mainRing = main.coordinates[0].map(([longitude, latitude]) => projectPosition([latitude, longitude], projection))
  let seed = 731042
  const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296 }

  function sample(area: AreaGeometry, count: number, clearings: [number, number][] = []) {
    const bounds = geometryBounds(area)
    const points: [number, number][] = []
    for (let attempt = 0; points.length < count && attempt < count * 80; attempt++) {
      const position: Position = [bounds.south + random() * (bounds.north - bounds.south), bounds.west + random() * (bounds.east - bounds.west)]
      if (geometryContains(area, position)) {
        const point = projectPosition(position, projection)
        if (clearings.every(([x, z]) => Math.hypot(point[0] - x, point[1] - z) > .26)) points.push(point)
      }
    }
    if (points.length !== count) throw new Error('The island geometry could not support the decorative layout.')
    return points
  }

  const peaks = sample(main, 14).map(([x, z]) => ({ x, z, radius: .55 + random() * 1.1, height: .5 + random() * 1.1 }))
  function heightAt(x: number, z: number) {
    let distance = Infinity
    for (const [edgeX, edgeZ] of mainRing) distance = Math.min(distance, (x - edgeX) ** 2 + (z - edgeZ) ** 2)
    const coast = Math.min(1, Math.sqrt(distance) / .35)
    const relief = peaks.reduce((height, peak) =>
      Math.max(height, peak.height * Math.max(0, 1 - Math.hypot(x - peak.x, z - peak.z) / peak.radius)), 0)
    return (.09 + relief) * coast
  }

  function shape(rings: number[][][], inset = 1) {
    const result = new Shape()
    const [centerX, centerZ] = projectPosition(geometryCenter({ type: 'Polygon', coordinates: rings }), projection)
    rings.forEach((ring, index) => {
      const path = index === 0 ? result : new Path()
      ring.forEach(([longitude, latitude], vertex) => {
        const [x, z] = projectPosition([latitude, longitude], projection)
        const insetX = centerX + (x - centerX) * inset
        const insetZ = centerZ + (z - centerZ) * inset
        if (vertex === 0) path.moveTo(insetX, -insetZ)
        else path.lineTo(insetX, -insetZ)
      })
      path.closePath()
      if (index > 0) result.holes.push(path)
    })
    return result
  }

  const sand = material(new MeshStandardMaterial({ color: '#ecd397', roughness: .95 }))
  const grass = material(new MeshStandardMaterial({ color: '#83a866', roughness: 1, flatShading: true }))
  const islandParts = geometryPolygons(geography.archipelago.geometry).map((rings) =>
    new ExtrudeGeometry(shape(rings), { depth: .42, bevelEnabled: false }).rotateX(-Math.PI / 2).translate(0, -.42, 0),
  )
  const mergedIslands = mergeGeometries(islandParts, false)
  islandParts.forEach((part) => part.dispose())
  if (!mergedIslands) throw new Error('The island geometries could not be assembled.')
  const islandMesh = new Mesh(geometry(mergedIslands), sand)
  islandMesh.castShadow = true
  islandMesh.receiveShadow = true
  scene.add(islandMesh)

  const [west, north] = projectPosition([mainBounds.north, mainBounds.west], projection)
  const [east, south] = projectPosition([mainBounds.south, mainBounds.east], projection)
  const land = geometry(new PlaneGeometry(east - west, south - north, 30, 150).rotateX(-Math.PI / 2))
  const positions = land.getAttribute('position')
  const included: boolean[] = []
  for (let index = 0; index < positions.count; index++) {
    const x = positions.getX(index), z = positions.getZ(index)
    included.push(geometryContains(main, unprojectPosition([x / .97, z / .97], projection)))
    positions.setY(index, heightAt(x, z))
  }
  const original = land.getIndex()
  if (!original) throw new Error('The miniature landscape has no triangle indices.')
  const triangles: number[] = []
  for (let index = 0; index < original.count; index += 3) {
    const a = original.getX(index), b = original.getX(index + 1), c = original.getX(index + 2)
    if (included[a] && included[b] && included[c]) triangles.push(a, b, c)
  }
  land.setIndex(triangles)
  land.computeVertexNormals()
  const landscape = new Mesh(land, grass)
  landscape.castShadow = true
  landscape.receiveShadow = true
  scene.add(landscape)

  const nearbyParts = geometryPolygons(geography.archipelago.geometry).filter((rings) => rings !== main.coordinates).map((rings) =>
    new ExtrudeGeometry(shape(rings, .99), { depth: .035, bevelEnabled: false }).rotateX(-Math.PI / 2),
  )
  const mergedGrass = mergeGeometries(nearbyParts, false)
  nearbyParts.forEach((part) => part.dispose())
  if (nearbyParts.length > 0 && !mergedGrass) throw new Error('The surrounding island landscapes could not be assembled.')
  if (mergedGrass) scene.add(new Mesh(geometry(mergedGrass), grass))

  const matrix = new Object3D()
  const color = new Color()
  function instanced(geometryValue: BufferGeometry, materialValue: MeshStandardMaterial, count: number) {
    const mesh = new InstancedMesh(geometryValue, materialValue, count)
    mesh.castShadow = true
    mesh.receiveShadow = true
    instances.push(mesh)
    scene.add(mesh)
    return mesh
  }
  const trunks = instanced(geometry(new CylinderGeometry(.027, .038, .32, 5)), material(new MeshStandardMaterial({ color: '#775235' })), 640)
  const pineMaterial = material(new MeshStandardMaterial({ color: '#ffffff', flatShading: true }))
  const leafMaterial = material(new MeshStandardMaterial({ color: '#ffffff', flatShading: true }))
  const pines = instanced(geometry(new ConeGeometry(.16, .6, 6)), pineMaterial, 320)
  const leaves = instanced(geometry(new IcosahedronGeometry(.16, 0)), leafMaterial, 320)
  const houses = sample(geography.village.geometry, 24)
  sample(main, 640, houses).forEach(([x, z], index) => {
    const size = .65 + random() * .65
    matrix.position.set(x, heightAt(x, z) + size * .16, z)
    matrix.scale.setScalar(size)
    matrix.updateMatrix()
    trunks.setMatrixAt(index, matrix.matrix)
    matrix.position.y += size * (index < 320 ? .32 : .18)
    matrix.updateMatrix()
    const crown = index < 320 ? pines : leaves
    const treeIndex = index < 320 ? index : index - 320
    crown.setMatrixAt(treeIndex, matrix.matrix)
    color.set(index < 320 ? '#3f7049' : '#6d984d').multiplyScalar(.8 + random() * .35)
    crown.setColorAt(treeIndex, color)
  })

  const walls = instanced(geometry(new BoxGeometry(.13, .13, .17)), material(new MeshStandardMaterial({ color: '#f6deb0' })), houses.length)
  const roofs = instanced(geometry(new ConeGeometry(.145, .1, 4)), material(new MeshStandardMaterial({ color: '#d88953', flatShading: true })), houses.length)
  houses.forEach(([x, z], index) => {
    const size = .7 + random() * .4
    matrix.scale.setScalar(size)
    matrix.rotation.y = random() * Math.PI
    matrix.position.set(x, heightAt(x, z) + .065 * size, z)
    matrix.updateMatrix()
    walls.setMatrixAt(index, matrix.matrix)
    matrix.position.y += .11 * size
    matrix.rotation.y += Math.PI / 4
    matrix.updateMatrix()
    roofs.setMatrixAt(index, matrix.matrix)
  })

  const seaCanvas = document.createElement('canvas')
  seaCanvas.width = seaCanvas.height = 256
  const context = seaCanvas.getContext('2d')
  if (!context) throw new Error('A canvas is required to paint the miniature sea.')
  context.fillStyle = '#ffffff'
  context.fillRect(0, 0, 256, 256)
  context.strokeStyle = 'rgba(25, 104, 114, .055)'
  for (let row = 0; row < 20; row++) {
    context.beginPath()
    for (let x = 0; x <= 256; x += 4) {
      const y = row * 14 + Math.sin(x / 32 + row) * 4
      if (x === 0) context.moveTo(x, y)
      else context.lineTo(x, y)
    }
    context.stroke()
  }
  const seaTexture = new CanvasTexture(seaCanvas)
  seaTexture.wrapS = seaTexture.wrapT = RepeatWrapping
  seaTexture.repeat.set(28, 28)
  seaTexture.colorSpace = SRGBColorSpace
  const seaMaterial = material(new MeshStandardMaterial({ color: '#59b3ba', map: seaTexture, roughness: .85 }))
  const sea = new Mesh(geometry(new PlaneGeometry(450, 450).rotateX(-Math.PI / 2)), seaMaterial)
  sea.position.y = -.43
  sea.receiveShadow = true
  scene.add(sea)
  const waveMaterial = material(new LineBasicMaterial({ color: '#b8e4d5', transparent: true, opacity: .17 }))
  for (const scale of [1.04, 1.09, 1.15]) {
    const loop = new LineLoop(geometry(new BufferGeometry().setFromPoints(mainRing.map(([x, z]) => new Vector3(x * scale, -.405, z * scale)))), waveMaterial)
    scene.add(loop)
  }

  const villageMaterial = material(new LineBasicMaterial({ color: '#fff3b0', depthTest: false, transparent: true, opacity: .95 }))
  const districtMaterial = material(new LineBasicMaterial({ color: '#d4e4bb', transparent: true, opacity: .55 }))
  for (const [boundary, stroke] of [[geography.district, districtMaterial], [geography.village, villageMaterial]] as const) {
    for (const rings of geometryPolygons(boundary.geometry)) for (const ring of rings) {
      const line = new Line(geometry(new BufferGeometry().setFromPoints(ring.map(([longitude, latitude]) => {
        const [x, z] = projectPosition([latitude, longitude], projection)
        return new Vector3(x, heightAt(x, z) + .06, z)
      }))), stroke)
      line.renderOrder = 3
      scene.add(line)
    }
  }

  const areaButton = document.createElement('button')
  areaButton.type = 'button'
  areaButton.className = 'miniature-region-label'
  areaButton.textContent = 'Desa Bontomarannu'
  areaButton.addEventListener('click', callbacks.onArea)
  const regionLabel = new CSS2DObject(areaButton)
  const [regionX, regionZ] = projectPosition(geometryCenter(geography.village.geometry), projection)
  regionLabel.position.set(regionX, heightAt(regionX, regionZ) + .65, regionZ)
  scene.add(regionLabel)

  const ambient = new AmbientLight('#d5ecdd', 1.7)
  const sun = new DirectionalLight('#fff0ce', 2.7)
  sun.position.set(8, 18, 12)
  sun.castShadow = true
  sun.shadow.mapSize.set(1024, 1024)
  sun.shadow.camera.left = sun.shadow.camera.bottom = -18
  sun.shadow.camera.right = sun.shadow.camera.top = 18
  sun.shadow.bias = -.0004
  sun.shadow.normalBias = .035
  scene.add(ambient, sun)

  const renderer = new WebGLRenderer({ alpha: true, antialias: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5))
  renderer.outputColorSpace = SRGBColorSpace
  renderer.toneMapping = ACESFilmicToneMapping
  renderer.shadowMap.enabled = true
  renderer.shadowMap.autoUpdate = false
  renderer.shadowMap.needsUpdate = true
  renderer.domElement.setAttribute('aria-hidden', 'true')
  const labels = new CSS2DRenderer()
  labels.domElement.className = 'miniature-label-layer'
  container.append(renderer.domElement, labels.domElement)
  const camera = new PerspectiveCamera(38, 1, .1, 500)
  const controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.dampingFactor = .08
  controls.minDistance = 3
  controls.maxDistance = 160
  controls.maxPolarAngle = Math.PI * .47
  controls.autoRotateSpeed = .55
  const home: CameraPose = { position: [14, 17, 20], target: [0, .2, 0] }
  function restore(value: CameraPose) {
    const damping = controls.enableDamping, automatic = controls.autoRotate
    controls.enableDamping = false
    controls.autoRotate = false
    controls.update()
    camera.position.fromArray(value.position)
    controls.target.fromArray(value.target)
    controls.update()
    controls.enableDamping = damping
    controls.autoRotate = automatic
  }
  restore(pose || home)
  const pinHead = geometry(new SphereGeometry(.09, 8, 6))
  const pinStem = geometry(new CylinderGeometry(.012, .012, .65, 5))
  const pinRing = geometry(new CircleGeometry(.17, 24).rotateX(-Math.PI / 2))
  const pinMaterial = material(new MeshStandardMaterial({ color: '#e77557' }))
  const pinWhite = material(new MeshStandardMaterial({ color: '#fff5d5' }))
  const userMaterial = material(new MeshStandardMaterial({ color: '#65baf3' }))
  let markers: { group: Group; button: HTMLButtonElement; slug: string }[] = []
  let userMarker: { group: Group; label: HTMLSpanElement } | null = null

  function pin(position: Position, label: HTMLElement, tint: MeshStandardMaterial) {
    const [x, z] = projectPosition(position, projection)
    const group = new Group()
    group.position.set(x, heightAt(x, z), z)
    const stem = new Mesh(pinStem, pinWhite)
    stem.position.y = .33
    const head = new Mesh(pinHead, tint)
    head.position.y = .7
    const ring = new Mesh(pinRing, pinWhite)
    ring.position.y = .015
    const caption = new CSS2DObject(label)
    caption.position.y = 1.0
    group.add(stem, head, ring, caption)
    scene.add(group)
    return group
  }

  let disposed = false, contextUnavailable = false, ready = false, previousTime = performance.now()
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
  const draw = (time: number) => {
    if (disposed || contextUnavailable) return
    controls.update(Math.min((time - previousTime) / 1000, .1))
    previousTime = time
    if (!reducedMotion.matches) seaTexture.offset.x = Math.sin(time / 12000) * .025
    renderer.render(scene, camera)
    labels.render(scene, camera)
    if (!ready) {
      ready = true
      renderer.domElement.dataset.triangles = String(renderer.info.render.triangles)
      renderer.domElement.dataset.drawCalls = String(renderer.info.render.calls)
      callbacks.onReady()
    }
  }
  function resize() {
    if (disposed || contextUnavailable) return
    const width = Math.max(1, container.clientWidth), height = Math.max(1, container.clientHeight)
    renderer.setSize(width, height)
    labels.setSize(width, height)
    camera.aspect = width / height
    camera.updateProjectionMatrix()
  }
  resize()
  const resizeObserver = new ResizeObserver(resize)
  resizeObserver.observe(container)
  const visibility = new IntersectionObserver(([entry]) => {
    if (!disposed && !contextUnavailable) renderer.setAnimationLoop(entry.isIntersecting ? draw : null)
  })
  visibility.observe(container)
  const firstFrame = requestAnimationFrame(draw)
  const contextLost = (event: Event) => {
    event.preventDefault()
    if (!disposed) { contextUnavailable = true; renderer.setAnimationLoop(null); callbacks.onContextLost() }
  }
  renderer.domElement.addEventListener('webglcontextlost', contextLost)
  const axis = new Vector3(0, 1, 0)
  function focus(position: Position, distance = 6) {
    const [x, z] = projectPosition(position, projection)
    const target = new Vector3(x, heightAt(x, z) + .2, z)
    const positionVector = target.clone().add(new Vector3(1, 1.1, 1.2).normalize().multiplyScalar(distance))
    restore({ position: [positionVector.x, positionVector.y, positionVector.z], target: [target.x, target.y, target.z] })
  }

  return {
    setPoints(points: MapPoint[]) {
      markers.forEach(({ group, button }) => { scene.remove(group); button.remove() })
      markers = points.map((point) => {
        const button = document.createElement('button')
        button.type = 'button'
        button.className = 'miniature-marker'
        button.textContent = point.name
        button.setAttribute('aria-label', point.name)
        button.addEventListener('click', () => callbacks.onSelect(point.slug))
        return { group: pin(point.position, button, pinMaterial), button, slug: point.slug }
      })
    },
    setSelected(slug: string | null) {
      markers.forEach(({ button, slug: markerSlug }) => {
        button.classList.toggle('active', markerSlug === slug)
        button.setAttribute('aria-pressed', String(markerSlug === slug))
      })
    },
    setUserPosition(position: Position | null, label: string) {
      if (userMarker) { scene.remove(userMarker.group); userMarker.label.remove(); userMarker = null }
      if (position) {
        const caption = document.createElement('span')
        caption.className = 'miniature-user-label'
        caption.textContent = label
        userMarker = { group: pin(position, caption, userMaterial), label: caption }
      }
    },
    setRegionLabel(label: string) { areaButton.textContent = label; areaButton.setAttribute('aria-label', label) },
    setTheme(theme: 'light' | 'dark') {
      const dark = theme === 'dark'
      seaMaterial.color.set(dark ? '#123c49' : '#59b3ba')
      sand.color.set(dark ? '#a88e68' : '#ecd397')
      grass.color.set(dark ? '#628368' : '#83a866')
      ambient.intensity = dark ? 1.1 : 1.7
      sun.intensity = dark ? 1.3 : 2.7
      sun.color.set(dark ? '#cbe9f5' : '#fff0ce')
      renderer.shadowMap.needsUpdate = true
    },
    setAutoRotate(enabled: boolean) { controls.autoRotate = enabled },
    rotate() { camera.position.sub(controls.target).applyAxisAngle(axis, Math.PI / 4).add(controls.target); controls.update() },
    zoom(factor: number) { camera.position.sub(controls.target).multiplyScalar(factor).add(controls.target); controls.update() },
    focus,
    focusArea() { focus(geometryCenter(geography.village.geometry), 5) },
    showIslands() {
      const bounds = geometryBounds(geography.archipelago.geometry)
      const distance = Math.max(bounds.east - bounds.west, bounds.north - bounds.south) * projection.scale * 1.8
      focus(geometryCenter(geography.archipelago.geometry), Math.min(150, distance))
    },
    reset() { restore(home) },
    getCameraState(): CameraPose {
      return { position: [camera.position.x, camera.position.y, camera.position.z], target: [controls.target.x, controls.target.y, controls.target.z] }
    },
    dispose() {
      disposed = true
      cancelAnimationFrame(firstFrame)
      renderer.setAnimationLoop(null)
      resizeObserver.disconnect()
      visibility.disconnect()
      renderer.domElement.removeEventListener('webglcontextlost', contextLost)
      areaButton.removeEventListener('click', callbacks.onArea)
      controls.dispose()
      scene.clear()
      instances.forEach((mesh) => mesh.dispose())
      geometries.forEach((value) => value.dispose())
      materials.forEach((value) => value.dispose())
      seaTexture.dispose()
      sun.shadow.dispose()
      renderer.dispose()
      renderer.forceContextLoss()
      renderer.domElement.remove()
      labels.domElement.remove()
    },
  }
}
