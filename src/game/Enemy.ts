import * as THREE from 'three';

export interface Enemy {
  mesh: THREE.Group;
  health: number;
  maxHealth: number;
  speed: number;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  targetPoint: THREE.Vector3;
  lastShot: number;
  fireRate: number;
  damage: number;
  state: 'patrol' | 'chase' | 'attack' | 'cover';
  sightRange: number;
  attackRange: number;
  dead: boolean;
  deathTime: number;
  type: 'grunt' | 'heavy' | 'fast';
  bodyColor: number;
  accuracy: number; // base accuracy 0-1
  burstCount: number; // how many shots in current burst
  burstMax: number; // max shots per burst
  burstCooldown: number; // time between bursts
  lastBurstEnd: number; // when last burst ended
  inBurst: boolean; // currently bursting
  reactionTime: number; // delay before first shot after spotting player
  spottedTime: number; // when they first spotted the player
  hasReacted: boolean; // whether they've finished reacting
  strafeDir: number; // 1 or -1
  strafeTimer: number; // time until strafe direction changes
}

function createEnemyMesh(type: 'grunt' | 'heavy' | 'fast'): THREE.Group {
  const group = new THREE.Group();

  let bodyColor: number;
  let headColor: number;
  let scale = 1;

  switch (type) {
    case 'grunt':
      bodyColor = 0xcc3333;
      headColor = 0xffcc99;
      break;
    case 'heavy':
      bodyColor = 0x663399;
      headColor = 0xddaa77;
      scale = 1.3;
      break;
    case 'fast':
      bodyColor = 0x33aa33;
      headColor = 0xffcc99;
      scale = 0.8;
      break;
  }

  // Body (torso)
  const bodyGeo = new THREE.BoxGeometry(1 * scale, 1.4 * scale, 0.6 * scale);
  const bodyMat = new THREE.MeshLambertMaterial({ color: bodyColor });
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.position.y = 1.2;
  body.castShadow = true;
  group.add(body);

  // Head
  const headGeo = new THREE.BoxGeometry(0.5 * scale, 0.5 * scale, 0.5 * scale);
  const headMat = new THREE.MeshLambertMaterial({ color: headColor });
  const head = new THREE.Mesh(headGeo, headMat);
  head.position.y = 2.1;
  head.castShadow = true;
  group.add(head);

  // Eyes
  const eyeGeo = new THREE.BoxGeometry(0.08, 0.08, 0.1);
  const eyeMat = new THREE.MeshLambertMaterial({ color: 0x000000 });
  const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
  leftEye.position.set(-0.12 * scale, 2.15, 0.26 * scale);
  group.add(leftEye);
  const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
  rightEye.position.set(0.12 * scale, 2.15, 0.26 * scale);
  group.add(rightEye);

  // Legs
  const legGeo = new THREE.BoxGeometry(0.3 * scale, 1 * scale, 0.3 * scale);
  const legMat = new THREE.MeshLambertMaterial({ color: 0x444444 });
  const leftLeg = new THREE.Mesh(legGeo, legMat);
  leftLeg.position.set(-0.25 * scale, 0.5, 0);
  leftLeg.castShadow = true;
  group.add(leftLeg);
  const rightLeg = new THREE.Mesh(legGeo, legMat);
  rightLeg.position.set(0.25 * scale, 0.5, 0);
  rightLeg.castShadow = true;
  group.add(rightLeg);

  // Arms
  const armGeo = new THREE.BoxGeometry(0.25 * scale, 1 * scale, 0.25 * scale);
  const armMat = new THREE.MeshLambertMaterial({ color: bodyColor });
  const leftArm = new THREE.Mesh(armGeo, armMat);
  leftArm.position.set(-0.65 * scale, 1.2, 0);
  leftArm.castShadow = true;
  group.add(leftArm);
  const rightArm = new THREE.Mesh(armGeo, armMat);
  rightArm.position.set(0.65 * scale, 1.2, 0);
  rightArm.castShadow = true;
  group.add(rightArm);

  // Weapon (simple gun)
  const gunGeo = new THREE.BoxGeometry(0.15, 0.15, 0.8);
  const gunMat = new THREE.MeshLambertMaterial({ color: 0x222222 });
  const gun = new THREE.Mesh(gunGeo, gunMat);
  gun.position.set(0.65 * scale, 1.0, 0.4);
  group.add(gun);

  return group;
}

export function createEnemy(
  position: THREE.Vector3,
  type: 'grunt' | 'heavy' | 'fast' = 'grunt'
): Enemy {
  const mesh = createEnemyMesh(type);
  // Position on the ground - feet at y=0
  const groundPos = position.clone();
  groundPos.y = 0;
  mesh.position.copy(groundPos);

  let health: number, speed: number, fireRate: number, damage: number;
  let sightRange: number, attackRange: number;
  let accuracy: number, burstMax: number, burstCooldown: number, reactionTime: number;

  switch (type) {
    case 'grunt':
      health = 80;
      speed = 4;
      fireRate = 1.5; // shots per second during burst
      damage = 8;
      sightRange = 45;
      attackRange = 35;
      accuracy = 0.75; // 75% base accuracy
      burstMax = 4;
      burstCooldown = 1.2; // shorter cooldown between bursts
      reactionTime = 0.4;
      break;
    case 'heavy':
      health = 200;
      speed = 2.5;
      fireRate = 0.8;
      damage = 15;
      sightRange = 40;
      attackRange = 30;
      accuracy = 0.85; // high accuracy, slow and deadly
      burstMax = 3;
      burstCooldown = 1.8;
      reactionTime = 0.6;
      break;
    case 'fast':
      health = 50;
      speed = 7;
      fireRate = 2.5;
      damage = 5;
      sightRange = 50;
      attackRange = 40;
      accuracy = 0.60; // lower accuracy, compensated by volume of fire
      burstMax = 6;
      burstCooldown = 0.8;
      reactionTime = 0.3;
      break;
  }

  return {
    mesh,
    health,
    maxHealth: health,
    speed,
    position: groundPos.clone(),
    velocity: new THREE.Vector3(),
    targetPoint: groundPos.clone().add(new THREE.Vector3(
      (Math.random() - 0.5) * 30,
      0,
      (Math.random() - 0.5) * 30
    )),
    lastShot: 0,
    fireRate,
    damage,
    state: 'patrol',
    sightRange,
    attackRange,
    dead: false,
    deathTime: 0,
    type,
    bodyColor: type === 'grunt' ? 0xcc3333 : type === 'heavy' ? 0x663399 : 0x33aa33,
    accuracy,
    burstCount: 0,
    burstMax,
    burstCooldown,
    lastBurstEnd: 0,
    inBurst: false,
    reactionTime,
    spottedTime: 0,
    hasReacted: false,
    strafeDir: Math.random() > 0.5 ? 1 : -1,
    strafeTimer: 1 + Math.random() * 2,
  };
}
