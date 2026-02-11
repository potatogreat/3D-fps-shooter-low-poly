import * as THREE from 'three';

export interface MapObject {
  mesh: THREE.Mesh;
  collider: THREE.Box3;
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

function createSandTexture(): THREE.MeshLambertMaterial {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;

  for (let y = 0; y < 64; y++) {
    for (let x = 0; x < 64; x++) {
      const v = 0.8 + Math.random() * 0.2;
      const r = Math.floor(210 * v);
      const g = Math.floor(180 * v);
      const b = Math.floor(120 * v);
      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.fillRect(x, y, 1, 1);
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.magFilter = THREE.NearestFilter;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(10, 10);
  return new THREE.MeshLambertMaterial({ map: texture });
}

function createSandstoneBrickTexture(): THREE.MeshLambertMaterial {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#C4A265';
  ctx.fillRect(0, 0, 128, 128);

  const brickH = 16;
  const brickW = 32;
  for (let row = 0; row < 8; row++) {
    const offset = row % 2 === 0 ? 0 : brickW / 2;
    for (let col = -1; col < 5; col++) {
      const x = col * brickW + offset;
      const y = row * brickH;
      const v = 0.85 + Math.random() * 0.3;
      const r = Math.floor(196 * v);
      const g = Math.floor(162 * v);
      const b = Math.floor(101 * v);
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

function createDarkMetalTexture(): THREE.MeshLambertMaterial {
  return createTexture(0x555566, 0.06);
}

function createRustyMetalTexture(): THREE.MeshLambertMaterial {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;

  for (let y = 0; y < 64; y++) {
    for (let x = 0; x < 64; x++) {
      const v = 0.7 + Math.random() * 0.3;
      const isRust = Math.random() > 0.5;
      const r = Math.floor((isRust ? 160 : 100) * v);
      const g = Math.floor((isRust ? 90 : 90) * v);
      const b = Math.floor((isRust ? 50 : 80) * v);
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

function createWoodTexture(): THREE.MeshLambertMaterial {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;

  for (let y = 0; y < 64; y++) {
    const v = 0.7 + Math.sin(y * 0.5) * 0.15 + Math.random() * 0.1;
    for (let x = 0; x < 64; x++) {
      ctx.fillStyle = `rgb(${Math.floor(140 * v)},${Math.floor(95 * v)},${Math.floor(50 * v)})`;
      ctx.fillRect(x, y, 1, 1);
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.magFilter = THREE.NearestFilter;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return new THREE.MeshLambertMaterial({ map: texture });
}

export function buildDesertOutpost(scene: THREE.Scene): MapObject[] {
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

  // Materials
  const sandMat = createSandTexture();
  const brickMat = createSandstoneBrickTexture();
  const metalMat = createDarkMetalTexture();
  const rustyMat = createRustyMetalTexture();
  const woodMat = createWoodTexture();
  const sandBagMat = createTexture(0xB5A270, 0.15);
  const concreteMat = createTexture(0xAA9977, 0.08);

  // ===== GROUND =====
  const groundGeo = new THREE.PlaneGeometry(220, 220);
  const ground = new THREE.Mesh(groundGeo, sandMat);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  // Dirt paths (darker sand)
  const pathMat = createTexture(0xA08050, 0.12);
  const path1 = new THREE.Mesh(new THREE.PlaneGeometry(8, 120), pathMat);
  path1.rotation.x = -Math.PI / 2;
  path1.position.set(0, 0.02, 0);
  path1.receiveShadow = true;
  scene.add(path1);
  const path2 = new THREE.Mesh(new THREE.PlaneGeometry(120, 8), pathMat);
  path2.rotation.x = -Math.PI / 2;
  path2.position.set(0, 0.02, 0);
  path2.receiveShadow = true;
  scene.add(path2);

  // ===== SKY / FOG set by scene config =====
  // (fog and sky are set in the main engine, but we configure desert colors)
  scene.fog = new THREE.Fog(0xE8C88A, 50, 160);
  scene.background = new THREE.Color(0xE8C88A);

  // Desert sun
  const sunGeo = new THREE.SphereGeometry(6, 8, 8);
  const sunMat = new THREE.MeshBasicMaterial({ color: 0xFFDD44 });
  const sun = new THREE.Mesh(sunGeo, sunMat);
  sun.position.set(60, 80, -60);
  scene.add(sun);

  // Heat haze clouds (low opacity)
  for (let i = 0; i < 8; i++) {
    const cloudGroup = new THREE.Group();
    for (let j = 0; j < 2 + Math.floor(Math.random() * 3); j++) {
      const geo = new THREE.SphereGeometry(4 + Math.random() * 5, 6, 4);
      const mat = new THREE.MeshLambertMaterial({ color: 0xFFEECC, transparent: true, opacity: 0.4 });
      const cloud = new THREE.Mesh(geo, mat);
      cloud.position.set((Math.random() - 0.5) * 10, (Math.random() - 0.5) * 1, (Math.random() - 0.5) * 10);
      cloud.scale.y = 0.3;
      cloudGroup.add(cloud);
    }
    cloudGroup.position.set((Math.random() - 0.5) * 200, 45 + Math.random() * 15, (Math.random() - 0.5) * 200);
    scene.add(cloudGroup);
  }

  // ===== OUTER WALLS (sand/stone perimeter) =====
  const wallH = 6;
  const mapSize = 90;
  addBox(0, wallH / 2, -mapSize, mapSize * 2, wallH, 2, brickMat);
  addBox(0, wallH / 2, mapSize, mapSize * 2, wallH, 2, brickMat);
  addBox(mapSize, wallH / 2, 0, 2, wallH, mapSize * 2, brickMat);
  addBox(-mapSize, wallH / 2, 0, 2, wallH, mapSize * 2, brickMat);

  // ===== CENTRAL FORTRESS =====
  // Main compound walls (open-top fortress)
  const fx = 0, fz = -10;
  const fSize = 18;

  // 4 fortress walls with gate openings
  // North wall (full)
  addBox(fx, 3, fz - fSize, fSize * 2 + 2, 6, 1.5, brickMat);
  // South wall (gate in center)
  addBox(fx - 10, 3, fz + fSize, 8, 6, 1.5, brickMat);
  addBox(fx + 10, 3, fz + fSize, 8, 6, 1.5, brickMat);
  // East wall (gate in center)
  addBox(fx + fSize, 3, fz - 10, 1.5, 6, 8, brickMat);
  addBox(fx + fSize, 3, fz + 10, 1.5, 6, 8, brickMat);
  // West wall (full)
  addBox(fx - fSize, 3, fz, 1.5, 6, fSize * 2, brickMat);

  // Corner watchtowers (4 elevated platforms)
  const corners = [
    [fx - fSize, fz - fSize],
    [fx + fSize, fz - fSize],
    [fx - fSize, fz + fSize],
    [fx + fSize, fz + fSize],
  ];
  corners.forEach(([cx, cz]) => {
    // Tower pillars
    addBox(cx - 1.5, 4, cz - 1.5, 0.8, 8, 0.8, brickMat);
    addBox(cx + 1.5, 4, cz - 1.5, 0.8, 8, 0.8, brickMat);
    addBox(cx - 1.5, 4, cz + 1.5, 0.8, 8, 0.8, brickMat);
    addBox(cx + 1.5, 4, cz + 1.5, 0.8, 8, 0.8, brickMat);
    // Platform
    addBox(cx, 8, cz, 5, 0.4, 5, woodMat);
    // Railings
    addBox(cx, 9, cz - 2.25, 5, 1.5, 0.3, woodMat);
    addBox(cx, 9, cz + 2.25, 5, 1.5, 0.3, woodMat);
    addBox(cx - 2.25, 9, cz, 0.3, 1.5, 5, woodMat);
    addBox(cx + 2.25, 9, cz, 0.3, 1.5, 5, woodMat);
  });

  // Inner compound walls for cover
  addBox(fx - 6, 1.5, fz - 4, 6, 3, 0.8, brickMat);
  addBox(fx + 6, 1.5, fz + 4, 6, 3, 0.8, brickMat);
  addBox(fx, 1.5, fz - 8, 0.8, 3, 6, brickMat);

  // ===== SNIPER TOWERS (2 at far corners) =====
  const towerPositions = [[-60, -60], [60, 60]];
  towerPositions.forEach(([tx, tz]) => {
    // 4 legs
    addBox(tx - 2.5, 5, tz - 2.5, 0.6, 10, 0.6, metalMat);
    addBox(tx + 2.5, 5, tz - 2.5, 0.6, 10, 0.6, metalMat);
    addBox(tx - 2.5, 5, tz + 2.5, 0.6, 10, 0.6, metalMat);
    addBox(tx + 2.5, 5, tz + 2.5, 0.6, 10, 0.6, metalMat);
    // Platform
    addBox(tx, 10, tz, 7, 0.4, 7, woodMat);
    // Railings
    addBox(tx, 11.2, tz - 3.25, 7, 2, 0.3, woodMat);
    addBox(tx, 11.2, tz + 3.25, 7, 2, 0.3, woodMat);
    addBox(tx - 3.25, 11.2, tz, 0.3, 2, 7, woodMat);
    addBox(tx + 3.25, 11.2, tz, 0.3, 2, 7, woodMat);
    // Ramp
    const rampGeo = new THREE.BoxGeometry(3, 0.3, 10);
    const ramp = new THREE.Mesh(rampGeo, woodMat);
    ramp.position.set(tx + 5, 5, tz);
    ramp.rotation.z = 0.45;
    ramp.castShadow = true;
    ramp.receiveShadow = true;
    scene.add(ramp);
  });

  // ===== BUNKER COMPLEX (south-west) =====
  const bx = -45, bz = 30;
  addBox(bx, 2, bz, 14, 4, 1, brickMat);
  addBox(bx - 7, 2, bz + 5, 1, 4, 10, brickMat);
  addBox(bx + 7, 2, bz + 5, 1, 4, 10, brickMat);
  addBox(bx, 2, bz + 10, 14, 4, 1, brickMat);
  // Roof with opening
  addBox(bx - 4, 4.5, bz + 5, 6, 0.5, 12, concreteMat);
  addBox(bx + 4, 4.5, bz + 5, 6, 0.5, 12, concreteMat);

  // ===== RUINED BUILDING (north-east) =====
  const rx = 50, rz = -45;
  // Partial walls (destroyed look)
  addBox(rx - 6, 2.5, rz, 1, 5, 12, brickMat);
  addBox(rx, 2.5, rz - 6, 12, 5, 1, brickMat);
  addBox(rx + 6, 1.5, rz + 2, 1, 3, 8, brickMat); // shorter = damaged
  // Rubble
  addBox(rx + 3, 0.5, rz + 5, 2, 1, 2, brickMat);
  addBox(rx + 5, 0.4, rz + 4, 1.5, 0.8, 1.5, brickMat);
  addBox(rx + 2, 0.3, rz + 6, 1, 0.6, 1, brickMat);

  // ===== WAREHOUSE (east side) =====
  const wx = 55, wz = 15;
  addBox(wx - 8, 3.5, wz, 1, 7, 16, rustyMat);
  addBox(wx + 8, 3.5, wz, 1, 7, 16, rustyMat);
  addBox(wx, 3.5, wz - 8, 16, 7, 1, rustyMat);
  // Front wall with large door opening
  addBox(wx - 5, 3.5, wz + 8, 6, 7, 1, rustyMat);
  addBox(wx + 5, 3.5, wz + 8, 6, 7, 1, rustyMat);
  // Roof
  addBox(wx, 7.5, wz, 18, 0.5, 18, rustyMat);
  // Interior crates
  addBox(wx - 4, 1, wz - 3, 2, 2, 2, woodMat);
  addBox(wx - 4, 1, wz + 2, 2, 2, 2, woodMat);
  addBox(wx + 4, 1.5, wz, 3, 3, 3, woodMat);

  // ===== SANDBAG POSITIONS =====
  const sandbagPositions = [
    [-25, 20], [25, -30], [-15, 55], [15, -65],
    [-50, -30], [50, 45], [0, 40], [0, -50],
    [-35, -5], [35, 5], [-70, 0], [70, 0],
  ];
  sandbagPositions.forEach(([sx, sz]) => {
    addBox(sx, 0.6, sz - 1.5, 4, 1.2, 0.8, sandBagMat);
    addBox(sx, 0.6, sz + 1.5, 4, 1.2, 0.8, sandBagMat);
    addBox(sx - 2, 0.6, sz, 0.8, 1.2, 3, sandBagMat);
  });

  // ===== OIL BARRELS =====
  const barrelPositions = [
    [-20, -40], [20, 50], [-55, 55], [55, -55],
    [-10, -20], [10, 20], [-40, -50], [40, 50],
    [30, -15], [-30, 15], [65, -10], [-65, 10],
    [-50, -65], [50, 65], [0, 70], [0, -70],
  ];
  barrelPositions.forEach(([barrelX, barrelZ]) => {
    const geo = new THREE.CylinderGeometry(0.7, 0.7, 1.8, 8);
    const barrel = new THREE.Mesh(geo, rustyMat);
    barrel.position.set(barrelX, 0.9, barrelZ);
    barrel.castShadow = true;
    barrel.receiveShadow = true;
    scene.add(barrel);
    const box = new THREE.Box3().setFromObject(barrel);
    objects.push({ mesh: barrel, collider: box });
  });

  // ===== SUPPLY CRATES =====
  const cratePositions = [
    [-30, -55], [30, 55], [-60, 40], [60, -40],
    [-20, 35], [20, -35], [-45, -20], [45, 20],
    [-10, 65], [10, -65], [-70, -40], [70, 40],
    [0, 25], [0, -35], [-35, 60], [35, -60],
  ];
  cratePositions.forEach(([cx, cz]) => {
    const numCrates = 1 + Math.floor(Math.random() * 2);
    for (let i = 0; i < numCrates; i++) {
      const size = 1.2 + Math.random() * 1.2;
      const ox = (Math.random() - 0.5) * 2;
      const oz = (Math.random() - 0.5) * 2;
      addBox(cx + ox, size / 2, cz + oz, size, size, size, woodMat);
    }
  });

  // ===== COVER WALLS (scattered) =====
  addBox(-30, 2, -35, 10, 4, 1, brickMat);
  addBox(-24, 2, -30, 1, 4, 10, brickMat);
  addBox(30, 2, 35, 10, 4, 1, brickMat);
  addBox(24, 2, 40, 1, 4, 10, brickMat);
  addBox(-55, 1.5, -55, 8, 3, 1, brickMat);
  addBox(55, 1.5, 55, 8, 3, 1, brickMat);
  addBox(-10, 2, -70, 1, 4, 8, brickMat);
  addBox(10, 2, 70, 1, 4, 8, brickMat);

  // ===== DESERT ROCKS =====
  const rockMat = createTexture(0x8B7355, 0.2);
  const rockPositions = [
    [-70, -70], [70, 70], [-75, 30], [75, -30],
    [-40, -70], [40, 70], [-70, 50], [70, -50],
    [-20, -75], [20, 75], [-60, -15], [60, 15],
    [-80, -20], [80, 20], [-35, 75], [35, -75],
  ];
  rockPositions.forEach(([rx, rz]) => {
    const size = 1 + Math.random() * 2.5;
    const geo = new THREE.DodecahedronGeometry(size, 0);
    const rock = new THREE.Mesh(geo, rockMat);
    rock.position.set(rx, size * 0.4, rz);
    rock.rotation.set(Math.random() * 0.5, Math.random() * Math.PI, Math.random() * 0.3);
    rock.castShadow = true;
    rock.receiveShadow = true;
    scene.add(rock);
    const box = new THREE.Box3().setFromObject(rock);
    objects.push({ mesh: rock, collider: box });
  });

  // ===== CACTI =====
  const cactusMat = new THREE.MeshLambertMaterial({ color: 0x2D6B30 });
  const cactusPositions = [
    [-75, -50], [75, 50], [-50, 75], [50, -75],
    [-80, 10], [80, -10], [-15, -80], [15, 80],
    [-65, -75], [65, 75], [-80, 60], [80, -60],
    [-45, -80], [45, 80], [-80, -45], [80, 45],
  ];
  cactusPositions.forEach(([cx, cz]) => {
    const height = 2 + Math.random() * 2;
    // Main trunk
    const trunkGeo = new THREE.CylinderGeometry(0.3, 0.4, height, 6);
    const trunk = new THREE.Mesh(trunkGeo, cactusMat);
    trunk.position.set(cx, height / 2, cz);
    trunk.castShadow = true;
    scene.add(trunk);

    // Arms
    if (Math.random() > 0.3) {
      const armGeo = new THREE.CylinderGeometry(0.2, 0.25, 1.2, 5);
      const arm1 = new THREE.Mesh(armGeo, cactusMat);
      arm1.position.set(cx + 0.6, height * 0.5, cz);
      arm1.rotation.z = -Math.PI / 4;
      arm1.castShadow = true;
      scene.add(arm1);

      const armUp = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.2, 1, 5), cactusMat);
      armUp.position.set(cx + 1, height * 0.5 + 0.7, cz);
      armUp.castShadow = true;
      scene.add(armUp);
    }
    if (Math.random() > 0.5) {
      const armGeo2 = new THREE.CylinderGeometry(0.2, 0.25, 1, 5);
      const arm2 = new THREE.Mesh(armGeo2, cactusMat);
      arm2.position.set(cx - 0.5, height * 0.6, cz);
      arm2.rotation.z = Math.PI / 4;
      arm2.castShadow = true;
      scene.add(arm2);
    }

    const box = new THREE.Box3();
    box.setFromCenterAndSize(
      new THREE.Vector3(cx, height / 2, cz),
      new THREE.Vector3(0.8, height, 0.8)
    );
    objects.push({ mesh: trunk, collider: box });
  });

  // ===== ABANDONED VEHICLES =====
  // Truck 1
  const t1x = -60, t1z = -40;
  addBox(t1x, 1.5, t1z, 4, 3, 8, rustyMat);     // body
  addBox(t1x, 3.5, t1z - 4, 3.5, 2, 3, rustyMat); // cab
  // wheels
  const wheelMat = new THREE.MeshLambertMaterial({ color: 0x222222 });
  [[-2.2, -2.5], [-2.2, 2.5], [2.2, -2.5], [2.2, 2.5]].forEach(([wx, wz]) => {
    const wheelGeo = new THREE.CylinderGeometry(0.7, 0.7, 0.4, 8);
    const wheel = new THREE.Mesh(wheelGeo, wheelMat);
    wheel.position.set(t1x + wx, 0.7, t1z + wz);
    wheel.rotation.z = Math.PI / 2;
    scene.add(wheel);
  });

  // Truck 2 (flipped on side)
  const t2x = 45, t2z = -65;
  const truck2Body = addBox(t2x, 2.5, t2z, 3, 4, 7, rustyMat);
  truck2Body.rotation.z = Math.PI / 6; // tilted

  // ===== ELEVATED SNIPER PERCH =====
  const px = -25, pz = -60;
  addBox(px, 3, pz, 8, 0.5, 6, woodMat); // platform
  // Ramp
  addBox(px + 6, 1.5, pz, 4, 0.3, 3, woodMat);
  // Support
  addBox(px - 3, 1.5, pz - 2.5, 0.5, 3, 0.5, metalMat);
  addBox(px - 3, 1.5, pz + 2.5, 0.5, 3, 0.5, metalMat);
  addBox(px + 3, 1.5, pz - 2.5, 0.5, 3, 0.5, metalMat);
  addBox(px + 3, 1.5, pz + 2.5, 0.5, 3, 0.5, metalMat);
  // Front cover
  addBox(px, 4, pz - 2.75, 8, 1.5, 0.3, woodMat);

  // ===== RADIO TOWER (center decoration) =====
  const rtx = 0, rtz = -10;
  const towerMat = new THREE.MeshLambertMaterial({ color: 0x888888 });
  // Main pole
  const poleGeo = new THREE.CylinderGeometry(0.15, 0.25, 18, 6);
  const pole = new THREE.Mesh(poleGeo, towerMat);
  pole.position.set(rtx, 9, rtz);
  pole.castShadow = true;
  scene.add(pole);
  // Cross bars
  for (let h = 4; h <= 16; h += 4) {
    const crossGeo = new THREE.BoxGeometry(3 - h * 0.1, 0.1, 0.1);
    const cross = new THREE.Mesh(crossGeo, towerMat);
    cross.position.set(rtx, h, rtz);
    scene.add(cross);
  }

  return objects;
}

// Player spawn point for desert map
export function getDesertPlayerSpawn(): THREE.Vector3 {
  return new THREE.Vector3(50, 1.6, 60);
}

// Enemy spawn points for desert map
export function getDesertSpawnPoints(): THREE.Vector3[] {
  return [
    new THREE.Vector3(-60, 0, -65),
    new THREE.Vector3(60, 0, -65),
    new THREE.Vector3(-65, 0, 0),
    new THREE.Vector3(65, 0, 0),
    new THREE.Vector3(-70, 0, -35),
    new THREE.Vector3(70, 0, -35),
    new THREE.Vector3(-35, 0, -70),
    new THREE.Vector3(35, 0, -70),
    new THREE.Vector3(-65, 0, 45),
    new THREE.Vector3(65, 0, 45),
    new THREE.Vector3(0, 0, -70),
    new THREE.Vector3(-45, 0, 65),
    new THREE.Vector3(45, 0, -60),
    new THREE.Vector3(-60, 0, 60),
  ];
}
