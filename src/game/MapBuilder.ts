import * as THREE from 'three';
import { buildDesertOutpost, getDesertPlayerSpawn, getDesertSpawnPoints } from './DesertMap';

export interface MapObject {
  mesh: THREE.Mesh;
  collider: THREE.Box3;
}

export type MapName = 'bootcamp' | 'desert';

// Route to the correct map builder based on map name
export function buildMapByName(scene: THREE.Scene, mapName: MapName): MapObject[] {
  switch (mapName) {
    case 'desert':
      return buildDesertOutpost(scene);
    case 'bootcamp':
    default:
      return buildMap(scene);
  }
}

// Get player spawn for any map
export function getPlayerSpawnByMap(mapName: MapName): THREE.Vector3 {
  switch (mapName) {
    case 'desert':
      return getDesertPlayerSpawn();
    case 'bootcamp':
    default:
      return getPlayerSpawn();
  }
}

// Get enemy spawn points for any map
export function getSpawnPointsByMap(mapName: MapName): THREE.Vector3[] {
  switch (mapName) {
    case 'desert':
      return getDesertSpawnPoints();
    case 'bootcamp':
    default:
      return getSpawnPoints();
  }
}

// Get map boundary size
export function getMapBound(mapName: MapName): number {
  switch (mapName) {
    case 'desert':
      return 88;
    case 'bootcamp':
    default:
      return 78;
  }
}

function createTexture(color: number, variation: number = 0.1): THREE.MeshLambertMaterial {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  const r = (color >> 16) & 0xff;
  const g = (color >> 8) & 0xff;
  const b = color & 0xff;

  for (let y = 0; y < 64; y++) {
    for (let x = 0; x < 64; x++) {
      const v = 1 - variation + Math.random() * variation * 2;
      ctx.fillStyle = `rgb(${Math.floor(r * v)},${Math.floor(g * v)},${Math.floor(b * v)})`;
      ctx.fillRect(x, y, 1, 1);
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return new THREE.MeshLambertMaterial({ map: texture });
}

function createBrickTexture(): THREE.MeshLambertMaterial {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#8B6F5C';
  ctx.fillRect(0, 0, 128, 128);

  const brickH = 16;
  const brickW = 32;
  for (let row = 0; row < 8; row++) {
    const offset = row % 2 === 0 ? 0 : brickW / 2;
    for (let col = -1; col < 5; col++) {
      const x = col * brickW + offset;
      const y = row * brickH;
      const v = 0.8 + Math.random() * 0.4;
      const r = Math.floor(139 * v);
      const g = Math.floor(90 * v);
      const b = Math.floor(60 * v);
      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.fillRect(x + 1, y + 1, brickW - 2, brickH - 2);
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.magFilter = THREE.NearestFilter;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return new THREE.MeshLambertMaterial({ map: texture });
}

function createConcreteTexture(): THREE.MeshLambertMaterial {
  return createTexture(0x999999, 0.08);
}

function createGrassTexture(): THREE.MeshLambertMaterial {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;

  for (let y = 0; y < 64; y++) {
    for (let x = 0; x < 64; x++) {
      const v = 0.7 + Math.random() * 0.3;
      const r = Math.floor(60 * v);
      const g = Math.floor(120 * v);
      const b = Math.floor(40 * v);
      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.fillRect(x, y, 1, 1);
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.magFilter = THREE.NearestFilter;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(8, 8);
  return new THREE.MeshLambertMaterial({ map: texture });
}

function createWoodTexture(): THREE.MeshLambertMaterial {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;

  for (let y = 0; y < 64; y++) {
    const v = 0.8 + Math.sin(y * 0.5) * 0.1 + Math.random() * 0.1;
    for (let x = 0; x < 64; x++) {
      const r = Math.floor(160 * v);
      const g = Math.floor(110 * v);
      const b = Math.floor(60 * v);
      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.fillRect(x, y, 1, 1);
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.magFilter = THREE.NearestFilter;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return new THREE.MeshLambertMaterial({ map: texture });
}

function createMetalTexture(): THREE.MeshLambertMaterial {
  return createTexture(0x777788, 0.05);
}

export function buildMap(scene: THREE.Scene): MapObject[] {
  const objects: MapObject[] = [];

  const addBox = (
    x: number, y: number, z: number,
    w: number, h: number, d: number,
    mat: THREE.MeshLambertMaterial,
    castShadow = true
  ) => {
    const geo = new THREE.BoxGeometry(w, h, d);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y, z);
    mesh.castShadow = castShadow;
    mesh.receiveShadow = true;
    scene.add(mesh);
    const box = new THREE.Box3().setFromObject(mesh);
    objects.push({ mesh, collider: box });
    return mesh;
  };

  // Ground
  const groundGeo = new THREE.PlaneGeometry(200, 200);
  const groundMat = createGrassTexture();
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  // Concrete floor areas
  const concreteMat = createConcreteTexture();
  const concreteFloor = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), concreteMat);
  concreteFloor.rotation.x = -Math.PI / 2;
  concreteFloor.position.set(0, 0.01, 0);
  concreteFloor.receiveShadow = true;
  scene.add(concreteFloor);

  // Second concrete area
  const concreteFloor2 = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), concreteMat);
  concreteFloor2.rotation.x = -Math.PI / 2;
  concreteFloor2.position.set(-50, 0.01, -40);
  concreteFloor2.receiveShadow = true;
  scene.add(concreteFloor2);

  const brickMat = createBrickTexture();
  const woodMat = createWoodTexture();
  const metalMat = createMetalTexture();

  // === OUTER WALLS ===
  const wallH = 8;
  const mapSize = 80;
  addBox(0, wallH / 2, -mapSize, mapSize * 2, wallH, 2, brickMat);
  addBox(0, wallH / 2, mapSize, mapSize * 2, wallH, 2, brickMat);
  addBox(mapSize, wallH / 2, 0, 2, wallH, mapSize * 2, brickMat);
  addBox(-mapSize, wallH / 2, 0, 2, wallH, mapSize * 2, brickMat);

  // === CENTRAL BUILDING (positioned away from spawn) ===
  // Building is centered at (0, 0, -25) - away from player spawn at (30, 0, 50)
  const bx = 0, bz = -25;
  addBox(bx - 8, 3, bz, 1, 6, 20, brickMat);  // Left wall
  addBox(bx + 8, 3, bz, 1, 6, 20, brickMat);  // Right wall
  addBox(bx, 3, bz - 10, 16, 6, 1, brickMat);  // Back wall
  // Front wall with door gap
  addBox(bx - 5, 3, bz + 10, 6, 6, 1, brickMat);
  addBox(bx + 5, 3, bz + 10, 6, 6, 1, brickMat);
  // Side door (left wall gap - cut a hole)
  // Roof
  addBox(bx, 6.5, bz, 18, 1, 22, concreteMat);

  // === SECOND SMALL BUILDING ===
  const b2x = 40, b2z = -40;
  addBox(b2x - 5, 2.5, b2z, 1, 5, 12, brickMat);
  addBox(b2x + 5, 2.5, b2z, 1, 5, 12, brickMat);
  addBox(b2x, 2.5, b2z - 6, 10, 5, 1, brickMat);
  addBox(b2x - 3, 2.5, b2z + 6, 4, 5, 1, brickMat);
  addBox(b2x + 3, 2.5, b2z + 6, 4, 5, 1, brickMat);
  addBox(b2x, 5.5, b2z, 12, 1, 14, concreteMat);

  // === WATCH TOWERS (4 corners) ===
  const towerPositions = [
    [-35, -50], [35, -50], [-35, 35], [35, 35]
  ];
  towerPositions.forEach(([tx, tz]) => {
    addBox(tx - 3, 4, tz - 3, 1, 8, 1, metalMat);
    addBox(tx + 3, 4, tz - 3, 1, 8, 1, metalMat);
    addBox(tx - 3, 4, tz + 3, 1, 8, 1, metalMat);
    addBox(tx + 3, 4, tz + 3, 1, 8, 1, metalMat);
    addBox(tx, 8, tz, 8, 0.5, 8, woodMat);
    addBox(tx, 9, tz - 3.75, 8, 1.5, 0.5, woodMat);
    addBox(tx, 9, tz + 3.75, 8, 1.5, 0.5, woodMat);
    addBox(tx - 3.75, 9, tz, 0.5, 1.5, 8, woodMat);
    addBox(tx + 3.75, 9, tz, 0.5, 1.5, 8, woodMat);
  });

  // === CRATE CLUSTERS ===
  const cratePositions = [
    [-15, -10], [15, -10], [-15, 15], [15, 15],
    [-25, -35], [25, -35], [0, -45], [0, 20],
    [-40, -15], [40, -15], [-40, 15], [40, 15],
    [-20, -55], [20, -55], [-20, 55], [20, 55],
  ];
  cratePositions.forEach(([cx, cz]) => {
    const numCrates = 1 + Math.floor(Math.random() * 3);
    for (let i = 0; i < numCrates; i++) {
      const size = 1.5 + Math.random() * 1.5;
      const ox = (Math.random() - 0.5) * 3;
      const oz = (Math.random() - 0.5) * 3;
      addBox(cx + ox, size / 2, cz + oz, size, size, size, woodMat);
    }
  });

  // === LONG WALLS / CORRIDORS ===
  addBox(-25, 2, -40, 12, 4, 1, brickMat);
  addBox(-19, 2, -45, 1, 4, 10, brickMat);

  addBox(25, 2, 25, 12, 4, 1, brickMat);
  addBox(19, 2, 30, 1, 4, 10, brickMat);

  // Mid walls
  addBox(-45, 2.5, -30, 1, 5, 15, brickMat);
  addBox(45, 2.5, 30, 1, 5, 15, brickMat);
  addBox(-50, 2.5, -22.5, 10, 5, 1, brickMat);
  addBox(50, 2.5, 22.5, 10, 5, 1, brickMat);

  // Additional cover walls
  addBox(-10, 1.5, 40, 8, 3, 1, brickMat);
  addBox(10, 1.5, -55, 8, 3, 1, brickMat);
  addBox(-55, 1.5, 10, 1, 3, 8, brickMat);
  addBox(55, 1.5, -10, 1, 3, 8, brickMat);

  // === VEHICLE / PROPS ===
  addBox(-50, 2, -50, 6, 4, 12, metalMat);
  addBox(-50, 5, -55, 5, 2, 4, metalMat);

  // Second vehicle
  addBox(55, 1.5, 50, 4, 3, 8, metalMat);
  addBox(55, 3.5, 53, 3.5, 1.5, 3, metalMat);

  // Barrels
  const barrelPositions = [
    [-12, -35], [12, -35], [-30, -10], [30, 10],
    [-55, 20], [55, -20], [-10, 50], [10, -60],
    [25, 50], [-25, -60], [60, 0], [-60, 0],
  ];
  barrelPositions.forEach(([barrelX, barrelZ]) => {
    const geo = new THREE.CylinderGeometry(0.8, 0.8, 2, 8);
    const barrel = new THREE.Mesh(geo, metalMat);
    barrel.position.set(barrelX, 1, barrelZ);
    barrel.castShadow = true;
    barrel.receiveShadow = true;
    scene.add(barrel);
    const box = new THREE.Box3().setFromObject(barrel);
    objects.push({ mesh: barrel, collider: box });
  });

  // === RAMPS ===
  const rampGeo = new THREE.BoxGeometry(4, 0.5, 8);
  const ramp1 = new THREE.Mesh(rampGeo, concreteMat);
  ramp1.position.set(-35, 4, -46);
  ramp1.rotation.x = -0.3;
  ramp1.castShadow = true;
  scene.add(ramp1);

  const ramp2 = new THREE.Mesh(rampGeo.clone(), concreteMat);
  ramp2.position.set(35, 4, 31);
  ramp2.rotation.x = 0.3;
  ramp2.castShadow = true;
  scene.add(ramp2);

  // === SANDBAG BUNKERS ===
  const sandMat = createTexture(0xC2B280, 0.15);
  const bunkerPositions = [[-55, -5], [55, 5], [0, -65], [0, 60]];
  bunkerPositions.forEach(([bunkerX, bunkerZ]) => {
    addBox(bunkerX, 0.75, bunkerZ - 2, 6, 1.5, 1, sandMat);
    addBox(bunkerX, 0.75, bunkerZ + 2, 6, 1.5, 1, sandMat);
    addBox(bunkerX - 3, 0.75, bunkerZ, 1, 1.5, 4, sandMat);
  });

  // === TREES (low poly) ===
  const treeMat = new THREE.MeshLambertMaterial({ color: 0x2d5a1e });
  const trunkMat = createTexture(0x6B4226, 0.2);
  const treePositions = [
    [-65, -65], [-60, -40], [-70, 20], [-55, 60],
    [65, -65], [60, 50], [70, -20], [55, 60],
    [-70, -10], [70, 10], [-30, -70], [30, 70],
    [-65, 50], [65, -55],
    [-72, 40], [72, -40], [-68, -30], [68, 30],
  ];
  treePositions.forEach(([tx, tz]) => {
    const trunkGeo = new THREE.CylinderGeometry(0.4, 0.6, 4, 6);
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.set(tx, 2, tz);
    trunk.castShadow = true;
    scene.add(trunk);

    const foliage1 = new THREE.Mesh(new THREE.ConeGeometry(3, 4, 6), treeMat);
    foliage1.position.set(tx, 6, tz);
    foliage1.castShadow = true;
    scene.add(foliage1);

    const foliage2 = new THREE.Mesh(new THREE.ConeGeometry(2.2, 3, 6), treeMat);
    foliage2.position.set(tx, 8.5, tz);
    foliage2.castShadow = true;
    scene.add(foliage2);

    const box = new THREE.Box3();
    box.setFromCenterAndSize(
      new THREE.Vector3(tx, 2, tz),
      new THREE.Vector3(1.2, 4, 1.2)
    );
    objects.push({ mesh: trunk, collider: box });
  });

  // === ROCKS ===
  const rockMat = createTexture(0x808080, 0.15);
  const rockPositions = [
    [-45, -55], [45, 55], [-55, 45], [55, -45],
    [-20, -65], [20, 65], [-65, -20], [65, 20],
  ];
  rockPositions.forEach(([rx, rz]) => {
    const geo = new THREE.DodecahedronGeometry(1.5 + Math.random() * 1.5, 0);
    const rock = new THREE.Mesh(geo, rockMat);
    rock.position.set(rx, 1, rz);
    rock.rotation.set(Math.random(), Math.random(), Math.random());
    rock.castShadow = true;
    rock.receiveShadow = true;
    scene.add(rock);
    const box = new THREE.Box3().setFromObject(rock);
    objects.push({ mesh: rock, collider: box });
  });

  return objects;
}

// Player spawn point - in an open area, far from buildings
export function getPlayerSpawn(): THREE.Vector3 {
  return new THREE.Vector3(30, 1.6, 55);
}

// Enemy spawn points - all in open areas, away from player spawn
export function getSpawnPoints(): THREE.Vector3[] {
  return [
    new THREE.Vector3(-50, 0, -55),
    new THREE.Vector3(50, 0, -55),
    new THREE.Vector3(-50, 0, 0),
    new THREE.Vector3(50, 0, 0),
    new THREE.Vector3(-60, 0, -30),
    new THREE.Vector3(60, 0, -30),
    new THREE.Vector3(-30, 0, -60),
    new THREE.Vector3(30, 0, -60),
    new THREE.Vector3(-60, 0, 40),
    new THREE.Vector3(60, 0, 40),
    new THREE.Vector3(0, 0, -60),
    new THREE.Vector3(-40, 0, 60),
  ];
}
