const fs = require("fs");
const path = require("path");

// SneakUp running shoe generator.
// Geometry is authored in X(length) / Y(width) / Z(height), then converted
// to glTF's Y-up coordinates at the root node.
const meshes = [];
const bufferParts = [];
const accessors = [];
const bufferViews = [];
let byteOffset = 0;

const materials = [
  { name: "Rubber outsole", color: [0.012, 0.014, 0.016, 1], metallic: 0.02, roughness: 0.56 },
  { name: "Black knit upper", color: [0.028, 0.032, 0.038, 1], metallic: 0.01, roughness: 0.78 },
  { name: "Graphite overlays", color: [0.11, 0.13, 0.15, 1], metallic: 0.06, roughness: 0.52 },
  { name: "White foam midsole", color: [0.86, 0.87, 0.86, 1], metallic: 0.02, roughness: 0.66 },
  { name: "Reflective silver", color: [0.62, 0.67, 0.7, 1], metallic: 0.58, roughness: 0.3 },
  { name: "Collar lining", color: [0.07, 0.055, 0.06, 1], metallic: 0.02, roughness: 0.9 }
];

function align4(value) { return (value + 3) & ~3; }

function addAccessor(data, componentType, type, target) {
  const bytes = Buffer.from(data.buffer, data.byteOffset, data.byteLength);
  const start = align4(byteOffset);
  if (start > byteOffset) bufferParts.push(Buffer.alloc(start - byteOffset));
  bufferParts.push(bytes);
  byteOffset = start + bytes.byteLength;
  const viewIndex = bufferViews.push({ buffer: 0, byteOffset: start, byteLength: bytes.byteLength, target }) - 1;
  const count = data.length / ({ SCALAR: 1, VEC3: 3 }[type]);
  const accessor = { bufferView: viewIndex, componentType, count, type };
  if (type === "VEC3") {
    const min = [Infinity, Infinity, Infinity]; const max = [-Infinity, -Infinity, -Infinity];
    for (let i = 0; i < data.length; i += 3) for (let axis = 0; axis < 3; axis += 1) {
      min[axis] = Math.min(min[axis], data[i + axis]); max[axis] = Math.max(max[axis], data[i + axis]);
    }
    accessor.min = min; accessor.max = max;
  }
  return accessors.push(accessor) - 1;
}

function getNormal(a, b, c) {
  const ab = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const ac = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
  const normal = [ab[1] * ac[2] - ab[2] * ac[1], ab[2] * ac[0] - ab[0] * ac[2], ab[0] * ac[1] - ab[1] * ac[0]];
  const length = Math.hypot(...normal) || 1;
  return normal.map((value) => value / length);
}

function addMesh(name, vertices, indices, material) {
  const normals = Array.from({ length: vertices.length }, () => [0, 0, 0]);
  for (let i = 0; i < indices.length; i += 3) {
    const a = indices[i]; const b = indices[i + 1]; const c = indices[i + 2]; const normal = getNormal(vertices[a], vertices[b], vertices[c]);
    for (const index of [a, b, c]) for (let axis = 0; axis < 3; axis += 1) normals[index][axis] += normal[axis];
  }
  for (const normal of normals) { const length = Math.hypot(...normal) || 1; normal[0] /= length; normal[1] /= length; normal[2] /= length; }
  const positionAccessor = addAccessor(new Float32Array(vertices.flat()), 5126, "VEC3", 34962);
  const normalAccessor = addAccessor(new Float32Array(normals.flat()), 5126, "VEC3", 34962);
  const indexAccessor = addAccessor(new Uint32Array(indices), 5125, "SCALAR", 34963);
  meshes.push({ name, primitives: [{ attributes: { POSITION: positionAccessor, NORMAL: normalAccessor }, indices: indexAccessor, material }] });
}

function addBox(name, min, max, material) {
  const [x0, y0, z0] = min; const [x1, y1, z1] = max;
  const vertices = [[x0,y0,z0],[x1,y0,z0],[x1,y1,z0],[x0,y1,z0],[x0,y0,z1],[x1,y0,z1],[x1,y1,z1],[x0,y1,z1]];
  const indices = [0,2,1,0,3,2,4,5,6,4,6,7,0,1,5,0,5,4,1,2,6,1,6,5,2,3,7,2,7,6,3,0,4,3,4,7];
  addMesh(name, vertices, indices, material);
}

function addExtrudedPolygon(name, points, bottom, top, material) {
  const vertices = points.map(([x, y]) => [x, y, bottom]).concat(points.map(([x, y]) => [x, y, top]));
  const count = points.length; const indices = [];
  for (let i = 1; i < count - 1; i += 1) { indices.push(0, i + 1, i); indices.push(count, count + i, count + i + 1); }
  for (let i = 0; i < count; i += 1) { const next = (i + 1) % count; indices.push(i, next, count + next, i, count + next, count + i); }
  addMesh(name, vertices, indices, material);
}

function addUpperShell() {
  const base = 0.31;
  const sections = [
    [-1.63, .34, .53], [-1.52, .43, .65], [-1.32, .49, .79], [-1.08, .53, .84],
    [-.78, .56, .88], [-.42, .58, .91], [-.06, .59, .87], [.34, .59, .79],
    [.72, .57, .69], [1.08, .52, .58], [1.38, .42, .46], [1.62, .25, .34], [1.7, .04, .3]
  ];
  const vertices = [];
  for (const [x, width, height] of sections) {
    vertices.push([x, -width, base + .03], [x, -width * .96, base + height * .52], [x, -width * .56, base + height * .88],
      [x, 0, base + height], [x, width * .56, base + height * .88], [x, width * .96, base + height * .52], [x, width, base + .03]);
  }
  const ringSize = 7; const indices = [];
  for (let section = 0; section < sections.length - 1; section += 1) for (let side = 0; side < ringSize - 1; side += 1) {
    const a = section * ringSize + side; const b = (section + 1) * ringSize + side; const c = (section + 1) * ringSize + side + 1; const d = section * ringSize + side + 1;
    indices.push(a, b, c, a, c, d);
  }
  const last = (sections.length - 1) * ringSize; indices.push(0, 6, 3, 0, 3, 1, 1, 3, 5, 5, 3, 6);
  indices.push(last, last + 3, last + 6, last, last + 1, last + 3, last + 3, last + 5, last + 6);
  addMesh("Continuous black knit upper", vertices, indices, 1);
}

function upperTopAt(x) {
  const samples = [[-1.63,.84],[-1.32,1.1],[-.78,1.19],[-.42,1.22],[-.06,1.18],[.34,1.1],[.72,1.0],[1.08,.89],[1.38,.77],[1.62,.65],[1.7,.61]];
  for (let i = 0; i < samples.length - 1; i += 1) if (x >= samples[i][0] && x <= samples[i + 1][0]) {
    const ratio = (x - samples[i][0]) / (samples[i + 1][0] - samples[i][0]); return samples[i][1] + (samples[i + 1][1] - samples[i][1]) * ratio;
  }
  return x < samples[0][0] ? samples[0][1] : samples[samples.length - 1][1];
}

function addTongue() {
  const xValues = [-.62, -.44, -.26, -.08, .1, .28, .45]; const vertices = [];
  for (const x of xValues) { const z = upperTopAt(x) + .025; vertices.push([x, -.23, z], [x, .23, z]); }
  const indices = []; for (let i = 0; i < xValues.length - 1; i += 1) indices.push(i * 2, i * 2 + 2, i * 2 + 3, i * 2, i * 2 + 3, i * 2 + 1);
  addMesh("Padded tongue", vertices, indices, 2);
}

function addCylinderAlongY(name, x, y, z, radius, depth, material, segments = 12) {
  const vertices = []; const indices = [];
  for (const offset of [-depth / 2, depth / 2]) for (let i = 0; i < segments; i += 1) { const angle = (i / segments) * Math.PI * 2; vertices.push([x + Math.cos(angle) * radius, y + offset, z + Math.sin(angle) * radius]); }
  for (let i = 0; i < segments; i += 1) { const next = (i + 1) % segments; indices.push(i, segments + i, segments + next, i, segments + next, next); }
  const nearCenter = vertices.push([x, y - depth / 2, z]) - 1; const farCenter = vertices.push([x, y + depth / 2, z]) - 1;
  for (let i = 0; i < segments; i += 1) { const next = (i + 1) % segments; indices.push(nearCenter, next, i, farCenter, segments + i, segments + next); }
  addMesh(name, vertices, indices, material);
}

function addSidePolygon(name, points, yNear, yFar, material) {
  const vertices = points.map(([x, z]) => [x, yNear, z]).concat(points.map(([x, z]) => [x, yFar, z]));
  const count = points.length; const indices = [];
  for (let i = 1; i < count - 1; i += 1) { indices.push(0, i, i + 1); indices.push(count, count + i + 1, count + i); }
  for (let i = 0; i < count; i += 1) { const next = (i + 1) % count; indices.push(i, count + i, count + next, i, count + next, next); }
  addMesh(name, vertices, indices, material);
}

function addCollarRing() {
  const segments = 24; const vertices = []; const indices = [];
  const cx = -1.12; const cz = 1.08; const outerX = .38; const outerY = .31; const innerX = .25; const innerY = .19;
  for (let i = 0; i < segments; i += 1) { const angle = (i / segments) * Math.PI * 2; vertices.push([cx + Math.cos(angle) * outerX, Math.sin(angle) * outerY, cz], [cx + Math.cos(angle) * innerX, Math.sin(angle) * innerY, cz + .025]); }
  for (let i = 0; i < segments; i += 1) { const next = (i + 1) % segments; indices.push(i * 2, next * 2, next * 2 + 1, i * 2, next * 2 + 1, i * 2 + 1); }
  addMesh("Padded collar", vertices, indices, 5);
  const inner = []; for (let i = 0; i < segments; i += 1) { const angle = (i / segments) * Math.PI * 2; inner.push([cx + Math.cos(angle) * innerX, Math.sin(angle) * innerY, cz - .005]); }
  const innerIndices = []; for (let i = 1; i < segments - 1; i += 1) innerIndices.push(0, i + 1, i);
  addMesh("Collar opening", [[cx, 0, cz - .008], ...inner], innerIndices.map((index) => index + 1), 0);
}

const footprint = [[-1.68,-.34],[-1.66,-.43],[-1.35,-.52],[-.65,-.6],[.18,-.62],[.86,-.57],[1.35,-.45],[1.62,-.25],[1.7,0],[1.62,.25],[1.35,.45],[.86,.57],[.18,.62],[-.65,.6],[-1.35,.52],[-1.66,.43]];
const outsoleFootprint = footprint.map(([x, y]) => [x * .99, y * .97]);
const midsoleFootprint = footprint.map(([x, y]) => [x * .985, y * .96]);
addExtrudedPolygon("Black rubber outsole", outsoleFootprint, .04, .15, 0);
addExtrudedPolygon("White sculpted foam midsole", midsoleFootprint, .15, .33, 3);
addUpperShell();
addTongue();
addCollarRing();

addSidePolygon("Heel support", [[-1.57,.4],[-1.42,.78],[-1.18,.9],[-.91,.88],[-.82,.46]], -.505, -.46, 2);
addSidePolygon("Lateral support panel", [[-1.0,.49],[-.77,.94],[-.33,1.08],[.34,.96],[.72,.62],[.45,.5],[-.22,.53]], -.585, -.54, 2);

for (let i = 0; i < 3; i += 1) {
  const shift = i * .23;
  addSidePolygon(`Reflective performance stripe ${i + 1}`, [[-.72 + shift,.58],[-.54 + shift,.94],[-.42 + shift,.96],[-.6 + shift,.58]], -.605, -.575, 4);
}

for (let i = 0; i < 6; i += 1) {
  const x = -.43 + i * .16; const z = upperTopAt(x) + .045;
  addBox(`Lace ${i + 1}`, [x - .045,-.255,z], [x + .045,.255,z + .035], 0);
  addCylinderAlongY(`Near eyelet ${i + 1}`, x, -.285, z + .002, .035, .035, 4);
  addCylinderAlongY(`Far eyelet ${i + 1}`, x, .285, z + .002, .035, .035, 4);
}
addBox("Reflective heel tab", [-1.47,-.04,.72], [-1.38,.04,1.08], 4);

const meshNodes = meshes.map((mesh, index) => ({ name: mesh.name, mesh: index }));
const rootNode = meshNodes.length;
const gltf = {
  asset: { version: "2.0", generator: "SneakUp Studio" }, scene: 0,
  scenes: [{ nodes: [rootNode] }],
  // glTF is Y-up; rotate the Z-up construction so model-viewer displays the shoe upright.
  nodes: [...meshNodes, { name: "SneakUp Obsidian Runner", rotation: [-0.7071068, 0, 0, 0.7071068], children: meshNodes.map((_, index) => index) }],
  meshes,
  materials: materials.map((material) => ({ name: material.name, pbrMetallicRoughness: { baseColorFactor: material.color, metallicFactor: material.metallic, roughnessFactor: material.roughness } })),
  accessors, bufferViews, buffers: [{ byteLength: align4(byteOffset) }]
};

const json = Buffer.from(JSON.stringify(gltf)); const jsonPadded = Buffer.concat([json, Buffer.alloc((4 - json.length % 4) % 4, 0x20)]);
const bin = Buffer.concat(bufferParts); const binPadded = Buffer.concat([bin, Buffer.alloc((4 - bin.length % 4) % 4)]);
const header = Buffer.alloc(12); header.writeUInt32LE(0x46546c67, 0); header.writeUInt32LE(2, 4); header.writeUInt32LE(12 + 8 + jsonPadded.length + 8 + binPadded.length, 8);
const jsonHeader = Buffer.alloc(8); jsonHeader.writeUInt32LE(jsonPadded.length, 0); jsonHeader.writeUInt32LE(0x4e4f534a, 4);
const binHeader = Buffer.alloc(8); binHeader.writeUInt32LE(binPadded.length, 0); binHeader.writeUInt32LE(0x004e4942, 4);
const output = path.join(__dirname, "..", "assets", "sneakup-sneaker.glb");
fs.writeFileSync(output, Buffer.concat([header, jsonHeader, jsonPadded, binHeader, binPadded]));
console.log(`Wrote ${output} (${fs.statSync(output).size} bytes, ${meshes.length} meshes)`);
