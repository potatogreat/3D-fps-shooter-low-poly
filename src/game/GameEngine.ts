import * as THREE from 'three';
// @ts-ignore
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { buildMapByName, getPlayerSpawnByMap, getSpawnPointsByMap, getMapBound, type MapObject, type MapName } from './MapBuilder';
import { createEnemy, type Enemy } from './Enemy';
import { WEAPONS, type WeaponDef } from './weapons';
import { audioManager } from './AudioManager';

export interface GameState {
  health: number;
  maxHealth: number;
  ammo: number;
  maxAmmo: number;
  weapon: WeaponDef;
  weaponIndex: number;
  score: number;
  kills: number;
  wave: number;
  enemiesAlive: number;
  reloading: boolean;
  reloadProgress: number;
  gameOver: boolean;
  paused: boolean;
  hitMarker: boolean;
  damageFlash: boolean;
  killFeed: string[];
  killFeedTimes: number[];
  waveTransitioning: boolean;
  scoped: boolean;
  map: string;
}

export type GameStateCallback = (state: GameState) => void;

export class GameEngine {
  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private clock = new THREE.Clock();
  private map: MapName = 'bootcamp';
  private mapObjects: MapObject[] = [];
  private enemies: Enemy[] = [];
  private muzzleFlashes: { mesh: THREE.Mesh; time: number }[] = [];
  private tracers: { mesh: THREE.Mesh; time: number }[] = [];
  private particles: { mesh: THREE.Mesh; velocity: THREE.Vector3; time: number }[] = [];

  // Animations
  private mixers: THREE.AnimationMixer[] = [];
  private weaponActions: Map<string, Record<string, THREE.AnimationAction>> = new Map();
  private currentWeaponAction: THREE.AnimationAction | null = null;

  // Player state
  private playerSpawn = new THREE.Vector3();
  private playerPos = new THREE.Vector3();
  private playerVel = new THREE.Vector3();
  private yaw = Math.PI; // Face toward center of map
  private pitch = 0;
  private health = 100;
  private maxHealth = 100;
  private score = 0;
  private kills = 0;
  private wave = 1;
  private waveTransitioning = false; // CRITICAL: prevents wave-clear from firing every frame

  // Weapon state
  private weaponIndex = 0;
  private ammo: number[] = [];
  private lastFireTime = 0;
  private reloading = false;
  private reloadStartTime = 0;
  private weaponMesh!: THREE.Group;
  private weaponModels: Map<string, THREE.Group> = new Map();
  private weaponBobPhase = 0;
  private recoilOffset = 0;
  private recoilTarget = 0;
  private recoilRotation = 0;
  private recoilRotationTarget = 0;

  // Input
  private keys: Record<string, boolean> = {};
  private mouseDown = false;
  private gameOver = false;
  private paused = false;
  private hitMarker = false;
  private hitMarkerTime = 0;
  private damageFlash = false;
  private damageFlashTime = 0;
  private killFeed: string[] = [];
  private killFeedTimes: number[] = [];
  private footstepTimer = 0;
  private lastDamageTime = 0;
  private scoped = false;

  // Mobile
  private moveJoystick = { active: false, startX: 0, startY: 0, dx: 0, dy: 0, id: -1 };
  private lookJoystick = { active: false, startX: 0, startY: 0, dx: 0, dy: 0, id: -1 };
  private isMobile = false;
  private mobileShoot = false;

  private stateCallback: GameStateCallback | null = null;
  private animFrameId = 0;
  private container: HTMLElement | null = null;
  private pointerLocked = false;
  private _shotFired = false;

  // Health bar sprites for enemies
  private healthBars: Map<Enemy, THREE.Sprite> = new Map();

  async init(container: HTMLElement, onState: GameStateCallback, map: MapName = 'bootcamp') {
    this.container = container;
    this.stateCallback = onState;
    this.map = map;
    this.isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

    // Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: false });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.BasicShadowMap;
    this.renderer.setClearColor(0x87CEEB);
    this.renderer.domElement.style.touchAction = 'none';
    container.appendChild(this.renderer.domElement);

    // Scene
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(0x87CEEB, 60, 150);

    // Camera
    this.camera = new THREE.PerspectiveCamera(
      75,
      container.clientWidth / container.clientHeight,
      0.1,
      300
    );
    this.scene.add(this.camera);

    // Lighting
    const ambient = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(ambient);

    const sun = new THREE.DirectionalLight(0xffeedd, 1.2);
    sun.position.set(50, 80, 30);
    sun.castShadow = true;
    sun.shadow.bias = -0.0005; // Fixes "black triangles" / shadow acne
    sun.shadow.normalBias = 0.05;
    sun.shadow.mapSize.width = 2048;
    sun.shadow.mapSize.height = 2048;
    sun.shadow.camera.near = 0.5;
    sun.shadow.camera.far = 200;
    sun.shadow.camera.left = -100;
    sun.shadow.camera.right = 100;
    sun.shadow.camera.top = 100;
    sun.shadow.camera.bottom = -100;
    this.scene.add(sun);

    const hemi = new THREE.HemisphereLight(0x87CEEB, 0x556B2F, 0.3);
    this.scene.add(hemi);

    // Sky
    const skyGeo = new THREE.SphereGeometry(140, 16, 16);
    const skyMat = new THREE.MeshBasicMaterial({
      color: 0x87CEEB,
      side: THREE.BackSide,
    });
    const sky = new THREE.Mesh(skyGeo, skyMat);
    this.scene.add(sky);

    // Clouds
    for (let i = 0; i < 15; i++) {
      const cloudGroup = new THREE.Group();
      for (let j = 0; j < 3 + Math.floor(Math.random() * 4); j++) {
        const geo = new THREE.SphereGeometry(3 + Math.random() * 4, 6, 4);
        const mat = new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 0.8 });
        const cloud = new THREE.Mesh(geo, mat);
        cloud.position.set(
          (Math.random() - 0.5) * 8,
          (Math.random() - 0.5) * 2,
          (Math.random() - 0.5) * 8
        );
        cloud.scale.y = 0.4;
        cloudGroup.add(cloud);
      }
      cloudGroup.position.set(
        (Math.random() - 0.5) * 200,
        40 + Math.random() * 20,
        (Math.random() - 0.5) * 200
      );
      this.scene.add(cloudGroup);
    }

    // Build map
    this.mapObjects = await Promise.resolve(buildMapByName(this.scene, this.map));

    // Set player spawn for selected map
    this.playerSpawn = getPlayerSpawnByMap(this.map);
    this.playerPos.copy(this.playerSpawn);
    this.yaw = Math.PI;

    // Init weapons
    WEAPONS.forEach(w => this.ammo.push(w.magSize));
    await this.loadWeapons();
    this.createWeaponModel();

    // Spawn first wave
    this.spawnWave();

    // Input listeners
    this.setupInput();

    // Start loop
    this.clock.start();
    this.loop();

    // Resize
    window.addEventListener('resize', this.onResize);
  }

  private async loadWeapons() {
    const loader = new GLTFLoader();
    const loadModel = (path: string, name: string) => {
      return new Promise<void>((resolve) => {
        loader.load(path, (gltf: any) => {
          const model = gltf.scene;
          model.traverse((c: any) => {
            if ((c as THREE.Mesh).isMesh) {
              c.castShadow = true;
              c.receiveShadow = false; // Disable to fix "black triangles" on viewmodels
              // Prevent culling issues for viewmodels
              c.frustumCulled = false;
              // Ensure viewmodels render on top of world geometry
              c.renderOrder = 10;
            }
          });

          this.weaponModels.set(name, model);

          // Setup animations if present
          if (gltf.animations.length > 0) {
            const mixer = new THREE.AnimationMixer(model);
            this.mixers.push(mixer);
            const actions: Record<string, THREE.AnimationAction> = {};

            gltf.animations.forEach((clip: any) => {
              const action = mixer.clipAction(clip);
              // Normalize names: 'reload', 'shoot', 'idle'
              const lowerName = clip.name.toLowerCase();
              if (lowerName.includes('reload')) actions['reload'] = action;
              else if (lowerName.includes('shoot') || lowerName.includes('fire')) actions['shoot'] = action;
              else if (lowerName.includes('idle')) actions['idle'] = action;
              else actions[clip.name] = action; // Fallback
            });
            this.weaponActions.set(name, actions);
          }
          resolve();
        }, undefined, (e: any) => {
          console.error(`Failed to load weapon ${name}:`, e);
          resolve(); // Resolve anyway to not block
        });
      });
    };

    console.log("Loading weapons...");
    await Promise.all([
      loadModel('/models/weapons/pistol.glb', 'Pistol'),
      loadModel('/models/weapons/shotgun.glb', 'Shotgun'),
      loadModel('/models/weapons/akm.glb', 'Rifle'),
      loadModel('/models/weapons/sniper.glb', 'Sniper'),
    ]);
    console.log("Weapons loaded");
  }

  private onResize = () => {
    if (!this.container) return;
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  };

  private setupInput() {
    window.addEventListener('keydown', (e) => {
      this.keys[e.code] = true;
      if (e.code === 'KeyR') this.startReload();
      if (e.code === 'Digit1') this.switchWeapon(0);
      if (e.code === 'Digit2') this.switchWeapon(1);
      if (e.code === 'Digit3') this.switchWeapon(2);
      if (e.code === 'Digit4') this.switchWeapon(3);
      if (e.code === 'KeyQ') this.switchWeapon((this.weaponIndex + WEAPONS.length - 1) % WEAPONS.length);
      if (e.code === 'KeyE') this.switchWeapon((this.weaponIndex + 1) % WEAPONS.length);
      if (e.code === 'KeyV') this.toggleScope();
    });
    window.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
    });

    const canvas = this.renderer.domElement;

    // Disable right-click context menu
    window.addEventListener("contextmenu", (e) => e.preventDefault());

    if (!this.isMobile) {
      canvas.addEventListener('click', () => {
        audioManager.init();
        if (!this.pointerLocked) {
          canvas.requestPointerLock();
        }
      });

      document.addEventListener('pointerlockchange', () => {
        this.pointerLocked = document.pointerLockElement === canvas;
      });

      document.addEventListener('mousemove', (e) => {
        if (!this.pointerLocked) return;
        this.yaw -= e.movementX * 0.002;
        this.pitch -= e.movementY * 0.002;
        this.pitch = Math.max(-Math.PI / 2 + 0.1, Math.min(Math.PI / 2 - 0.1, this.pitch));
      });

      canvas.addEventListener('mousedown', (e) => {
        if (e.button === 0) this.mouseDown = true;
        if (e.button === 2) this.toggleScope();
      });
      canvas.addEventListener('mouseup', (e) => {
        if (e.button === 0) this.mouseDown = false;
      });

      canvas.addEventListener('wheel', (e) => {
        if (e.deltaY > 0) {
          this.switchWeapon((this.weaponIndex + 1) % WEAPONS.length);
        } else {
          this.switchWeapon((this.weaponIndex + WEAPONS.length - 1) % WEAPONS.length);
        }
      });
    }
  }

  // Mobile controls
  setMoveJoystick(active: boolean, dx: number, dy: number, id: number, startX: number, startY: number) {
    this.moveJoystick = { active, dx, dy, id, startX, startY };
  }

  setLookJoystick(active: boolean, dx: number, dy: number, id: number, startX: number, startY: number) {
    this.lookJoystick = { active, dx, dy, id, startX, startY };
  }

  setMobileShoot(shooting: boolean) {
    this.mobileShoot = shooting;
    audioManager.init();
  }

  initAudio() {
    audioManager.init();
  }

  mobileSwitchWeapon(index: number) {
    this.switchWeapon(index);
  }

  mobileReload() {
    this.startReload();
  }

  mobileJump() {
    this.keys['Space'] = true;
    setTimeout(() => { this.keys['Space'] = false; }, 100);
  }

  toggleScope() {
    if (true) { // Enabled for all weapons
      this.scoped = !this.scoped;
      let zoomFOV = 65; if(this.weapon.type === 'sniper') zoomFOV = 25; if(this.weapon.type === 'rifle') zoomFOV = 55; this.camera.fov = this.scoped ? zoomFOV : 75;
      this.camera.updateProjectionMatrix();
      if (this.scoped && this.weaponMesh) {
        if(this.weapon.type === 'sniper') this.weaponMesh.visible = false; else this.weaponMesh.visible = true;
      } else if (this.weaponMesh) {
        this.weaponMesh.visible = true;
      }
      this.emitState();
    }
  }

  private switchWeapon(index: number) {
    if (index === this.weaponIndex) return;
    this.weaponIndex = index;
    this.reloading = false;
    this.scoped = false;
    this.camera.fov = 75;
    this.camera.updateProjectionMatrix();
    this.createWeaponModel();
    this.emitState();
  }

  private get weapon(): WeaponDef {
    return WEAPONS[this.weaponIndex];
  }

  private createWeaponModel() {
    if (this.weaponMesh) {
      this.camera.remove(this.weaponMesh);
    }

    const w = this.weapon;
    const modelGroup = this.weaponModels.get(w.name);

    if (modelGroup) {
      this.weaponMesh = modelGroup;

      // Position and scale based on type
      switch (w.type) {
        case 'pistol':
          this.weaponMesh.scale.set(0.08, 0.08, 0.08);
          this.weaponMesh.position.set(0.25, -0.3, -0.4);
          this.weaponMesh.rotation.set(0, 1.45, 0); // Points slightly right
          break;
        case 'rifle':
          this.weaponMesh.scale.set(0.08, 0.08, 0.08);
          this.weaponMesh.position.set(0.3, -0.35, -0.5);
          this.weaponMesh.rotation.set(0, 1.45, 0); // Points slightly right
          break;
        case 'shotgun':
          this.weaponMesh.scale.set(0.3, 0.3, 0.3);
          this.weaponMesh.position.set(0.45, -0.3, -0.4); // Furthest right
          this.weaponMesh.rotation.set(0, 1.45, 0); // Points slightly right
          break;
        case 'sniper':
          this.weaponMesh.scale.set(0.4, 0.4, 0.4);
          this.weaponMesh.position.set(0.48, -0.35, -0.6); // Furthest right (long barrel)
          this.weaponMesh.rotation.set(0, 1.45, 0); // Points slightly right
          break;
      }

      // Play idle animation if rigged
      this.playAction(w.name, 'idle', true);
    } else {
      // Fallback to blocky gun if model not loaded
      const group = new THREE.Group();
      const mat = new THREE.MeshLambertMaterial({ color: w.color });
      const barrel = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.3), mat);
      group.add(barrel);
      this.weaponMesh = group;
    }

    this.weaponMesh.visible = !this.scoped;
    this.camera.add(this.weaponMesh);
  }

  private playAction(weaponName: string, actionName: string, loop: boolean = false) {
    const actions = this.weaponActions.get(weaponName);
    if (!actions) return;

    const action = actions[actionName];
    if (action) {
      if (this.currentWeaponAction && this.currentWeaponAction !== action) {
        this.currentWeaponAction.fadeOut(0.2);
      }

      action.reset();
      action.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, loop ? Infinity : 1);
      action.clampWhenFinished = !loop;
      action.fadeIn(0.2);
      action.play();
      this.currentWeaponAction = action;
    }
  }

  private updateAnimations(dt: number) {
    this.mixers.forEach(mixer => mixer.update(dt));

    // Procedural recoil decay
    this.recoilOffset *= 0.85;
    this.recoilRotation *= 0.8;

    if (this.weaponMesh) {
      this.weaponMesh.visible = !this.scoped;

      if (!this.scoped) {
        // Apply bobbing
        const bobX = Math.cos(this.weaponBobPhase) * 0.01;
        const bobY = Math.sin(this.weaponBobPhase * 2) * 0.01;

        // Base position depends on weapon type
        const w = this.weapon;
        let baseX = 0.25, baseY = -0.22, baseZ = -0.45;
        let rotX = 0, rotY = 1.45, rotZ = 0;

        if (w.name === 'Pistol') {
          baseX = 0.25; baseY = -0.3; baseZ = -0.45;
          rotX = 0; rotY = 1.45; rotZ = 0;
        } else if (w.name === 'Rifle') {
          baseX = 0.3; baseY = -0.35; baseZ = -0.55;
          rotX = 0; rotY = 1.45; rotZ = 0;
        } else if (w.name === 'Shotgun') {
          baseX = 0.45; baseY = -0.3; baseZ = -0.4;
          rotX = 0; rotY = 1.45; rotZ = 0;
        } else if (w.name === 'Sniper') {
          baseX = 0.48; baseY = -0.35; baseZ = -0.6;
          rotX = 0; rotY = 1.45; rotZ = 0;
        }

        // Apply procedural position (bob + recoil)
        this.weaponMesh.position.set(
          baseX + bobX,
          baseY + bobY + this.recoilOffset * 0.5,
          baseZ + this.recoilOffset
        );

        // Apply rotation (base + recoil + procedural reload for static)
        let totalRotX = rotX + this.recoilRotation;

        // Add reload animation for non-rigged weapons
        if (this.reloading && (w.type === 'shotgun' || w.type === 'sniper')) {
          const elapsed = this.clock.getElapsedTime() - this.reloadStartTime;
          totalRotX += Math.sin(elapsed * 6) * 0.2; // Tilt up/down
          this.weaponMesh.position.y += Math.sin(elapsed * 12) * 0.02; // Small vertical wobble
        }

        this.weaponMesh.rotation.set(
          totalRotX,
          rotY,
          rotZ
        );
      }
    }
  }

  private spawnWave() {
    const spawns = getSpawnPointsByMap(this.map);
    const enemyCount = 3 + this.wave * 2;
    const types: ('grunt' | 'heavy' | 'fast')[] = ['grunt', 'heavy', 'fast'];

    for (let i = 0; i < enemyCount; i++) {
      const spawn = spawns[Math.floor(Math.random() * spawns.length)].clone();
      spawn.x += (Math.random() - 0.5) * 10;
      spawn.z += (Math.random() - 0.5) * 10;
      // Clamp to map bounds
      spawn.x = Math.max(-75, Math.min(75, spawn.x));
      spawn.z = Math.max(-75, Math.min(75, spawn.z));
      spawn.y = 0; // On the ground

      const typeIndex = this.wave <= 2 ? 0 : Math.floor(Math.random() * Math.min(types.length, this.wave));
      const enemy = createEnemy(spawn, types[typeIndex]);

      // Scale difficulty with waves
      if (this.wave > 3) {
        enemy.health = Math.floor(enemy.health * (1 + (this.wave - 3) * 0.1));
        enemy.maxHealth = enemy.health;
      }

      this.enemies.push(enemy);
      this.scene.add(enemy.mesh);
    }
  }

  private startReload() {
    if (this.reloading) return;
    if (this.ammo[this.weaponIndex] === this.weapon.magSize) return;
    this.reloading = true;
    this.reloadStartTime = this.clock.getElapsedTime();
    audioManager.playReload();
    this.playAction(this.weapon.name, 'reload');
  }

  private fire() {
    const now = this.clock.getElapsedTime();
    const w = this.weapon;

    if (this.reloading) return;
    if (now - this.lastFireTime < 1 / w.fireRate) return;

    if (this.ammo[this.weaponIndex] <= 0) {
      audioManager.playEmpty();
      this.startReload();
      return;
    }

    this.lastFireTime = now;
    this.ammo[this.weaponIndex]--;
    this.recoilOffset = w.recoil;
    if (w.type === 'shotgun' || w.type === 'sniper') {
      this.recoilRotation = -0.15;
    }
    audioManager.playShoot(w.type);
    this.playAction(w.name, 'shoot');

    // 1. Get weapon muzzle position in world space
    const muzzlePos = new THREE.Vector3();
    if (this.weaponMesh) {
      this.weaponMesh.updateMatrixWorld(true);
      this.weaponMesh.getWorldPosition(muzzlePos);

      const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
      const up = new THREE.Vector3(0, 1, 0).applyQuaternion(this.camera.quaternion);

      // Fine-tuned BORE ALIGNMENT (Up and Back as requested)
      let muzzleHeight = 0.18;
      let forwardReach = 0.35;

      if (w.name === 'Shotgun') { muzzleHeight = 0.22; forwardReach = 0.45; }
      if (w.name === 'Sniper') { muzzleHeight = 0.25; forwardReach = 0.65; }

      muzzlePos.add(forward.multiplyScalar(forwardReach));
      muzzlePos.add(up.multiplyScalar(muzzleHeight));
    } else {
      muzzlePos.copy(this.playerPos);
    }

    // Micro Muzzle flash (Extremely small, professional spark)
    const flashGeo = new THREE.SphereGeometry(0.01, 8, 8);
    const flashMat = new THREE.MeshBasicMaterial({ color: 0xffff00 });
    const flash = new THREE.Mesh(flashGeo, flashMat);
    flash.position.copy(muzzlePos);
    this.scene.add(flash);
    this.muzzleFlashes.push({ mesh: flash, time: now });

    // Raycasting for each pellet
    for (let p = 0; p < w.pellets; p++) {
      // 2. Find where the player is aiming (crosshair target)
      const aimDir = new THREE.Vector3(0, 0, -1);
      aimDir.applyAxisAngle(new THREE.Vector3(1, 0, 0), this.pitch + (Math.random() - 0.5) * w.spread);
      aimDir.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.yaw + (Math.random() - 0.5) * w.spread);

      // Ghost raycast from camera to find target point
      const aimRay = new THREE.Raycaster(this.playerPos.clone(), aimDir, 0, w.range);

      let targetPoint = this.playerPos.clone().add(aimDir.clone().multiplyScalar(w.range));
      let hitSomething = false;

      // Check for closest world/enemy hit to determine target point
      const worldHits = [];
      for (const obj of this.mapObjects) {
        const intersections = aimRay.intersectObject(obj.mesh);
        if (intersections.length > 0) worldHits.push(intersections[0]);
      }
      worldHits.sort((a, b) => a.distance - b.distance);

      if (worldHits.length > 0) {
        targetPoint = worldHits[0].point;
        hitSomething = true;
      }

      // Check enemies for aim targeting
      let closestEnemyDist = hitSomething ? worldHits[0].distance : Infinity;
      let targetEnemy: Enemy | null = null;

      for (const enemy of this.enemies) {
        if (enemy.dead) continue;
        const enemyBox = new THREE.Box3();
        const halfWidth = enemy.type === 'heavy' ? 0.8 : enemy.type === 'fast' ? 0.5 : 0.6;
        const height = enemy.type === 'heavy' ? 3.0 : enemy.type === 'fast' ? 2.0 : 2.5;
        enemyBox.setFromCenterAndSize(
          new THREE.Vector3(enemy.position.x, enemy.position.y + height / 2, enemy.position.z),
          new THREE.Vector3(halfWidth * 2, height, halfWidth * 2)
        );
        const intersect = aimRay.ray.intersectBox(enemyBox, new THREE.Vector3());
        if (intersect) {
          const dist = intersect.distanceTo(this.playerPos);
          if (dist < closestEnemyDist) {
            closestEnemyDist = dist;
            targetPoint = intersect;
            targetEnemy = enemy;
            hitSomething = true;
          }
        }
      }

      // 3. Final Raycast from Barrel
      const finalDir = new THREE.Vector3().subVectors(targetPoint, muzzlePos).normalize();
      const bulletRay = new THREE.Raycaster(muzzlePos, finalDir, 0, w.range);

      let finalHitEnemy = false;
      let finalClosestDist = Infinity;
      let finalEnemy: Enemy | null = null;

      // Check enemies again from the barrel's perspective
      for (const enemy of this.enemies) {
        if (enemy.dead) continue;
        const enemyBox = new THREE.Box3();
        const halfWidth = enemy.type === 'heavy' ? 0.8 : enemy.type === 'fast' ? 0.5 : 0.6;
        const height = enemy.type === 'heavy' ? 3.0 : enemy.type === 'fast' ? 2.0 : 2.5;
        enemyBox.setFromCenterAndSize(
          new THREE.Vector3(enemy.position.x, enemy.position.y + height / 2, enemy.position.z),
          new THREE.Vector3(halfWidth * 2, height, halfWidth * 2)
        );
        const intersect = bulletRay.ray.intersectBox(enemyBox, new THREE.Vector3());
        if (intersect) {
          const dist = intersect.distanceTo(muzzlePos);
          if (dist < finalClosestDist) {
            finalClosestDist = dist;
            finalEnemy = enemy;
            finalHitEnemy = true;
          }
        }
      }

      // Handle damage
      if (finalHitEnemy && finalEnemy) {
        finalEnemy.health -= w.damage;
        this.hitMarker = true;
        this.hitMarkerTime = now;
        audioManager.playHit();

        // Blood particles at hit point
        this.spawnParticles(targetPoint, 0xff0000, 5);

        if (finalEnemy.health <= 0 && !finalEnemy.dead) {
          finalEnemy.dead = true;
          finalEnemy.deathTime = now;
          this.kills++;
          this.score += finalEnemy.type === 'heavy' ? 200 : finalEnemy.type === 'fast' ? 150 : 100;
          audioManager.playKill();
          this.killFeed.unshift(`Eliminated ${finalEnemy.type}!`);
          this.killFeedTimes.unshift(now);
          if (this.killFeed.length > 3) { this.killFeed.pop(); this.killFeedTimes.pop(); }
        }
      }

      // Tracer from muzzle to hit point
      const tracerEnd = muzzlePos.clone().add(finalDir.clone().multiplyScalar(finalHitEnemy ? finalClosestDist : w.range));
      const tracerGeo = new THREE.BufferGeometry().setFromPoints([muzzlePos, tracerEnd]);
      const tracerMat = new THREE.LineBasicMaterial({ color: 0xffff88, transparent: true, opacity: 0.3 });
      const tracerLine = new THREE.Line(tracerGeo, tracerMat) as unknown as THREE.Mesh;
      this.scene.add(tracerLine);
      this.tracers.push({ mesh: tracerLine, time: now });

      // Impact sparks on world
      if (!finalHitEnemy) {
        const worldHitsAgain = [];
        for (const obj of this.mapObjects) {
          const intersections = bulletRay.intersectObject(obj.mesh);
          if (intersections.length > 0) worldHitsAgain.push(intersections[0]);
        }
        if (worldHitsAgain.length > 0) {
          worldHitsAgain.sort((a, b) => a.distance - b.distance);
          this.spawnParticles(worldHitsAgain[0].point, 0xffcc00, 3);
        }
      }
    }

    // Apply recoil
    this.pitch += w.recoil * (0.5 + Math.random() * 0.5);
    this.pitch = Math.min(this.pitch, Math.PI / 2 - 0.1);

    if (this.ammo[this.weaponIndex] <= 0) {
      this.startReload();
    }

    this.emitState();
  }

  private spawnParticles(pos: THREE.Vector3, color: number, count: number) {
    const now = this.clock.getElapsedTime();
    for (let i = 0; i < count; i++) {
      const geo = new THREE.BoxGeometry(0.1, 0.1, 0.1);
      const mat = new THREE.MeshBasicMaterial({ color });
      const particle = new THREE.Mesh(geo, mat);
      particle.position.copy(pos);
      this.scene.add(particle);
      this.particles.push({
        mesh: particle,
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 5,
          Math.random() * 5,
          (Math.random() - 0.5) * 5
        ),
        time: now,
      });
    }
  }

  private updatePlayer(dt: number) {
    if (this.gameOver) return;

    // Mobile look
    if (this.isMobile && this.lookJoystick.active) {
      this.yaw -= this.lookJoystick.dx * 0.003;
      this.pitch -= this.lookJoystick.dy * 0.003;
      this.pitch = Math.max(-Math.PI / 2 + 0.1, Math.min(Math.PI / 2 - 0.1, this.pitch));
      this.lookJoystick.dx = 0;
      this.lookJoystick.dy = 0;
    }

    // Movement
    const forward = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    const right = new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw));

    const moveSpeed = 12;
    const moveDir = new THREE.Vector3();

    if (this.isMobile && this.moveJoystick.active) {
      const joyX = this.moveJoystick.dx / 50;
      const joyY = this.moveJoystick.dy / 50;
      moveDir.add(forward.clone().multiplyScalar(-joyY));
      moveDir.add(right.clone().multiplyScalar(joyX));
      if (moveDir.length() > 1) moveDir.normalize();
    } else {
      if (this.keys['KeyW'] || this.keys['ArrowUp']) moveDir.add(forward);
      if (this.keys['KeyS'] || this.keys['ArrowDown']) moveDir.sub(forward);
      if (this.keys['KeyA'] || this.keys['ArrowLeft']) moveDir.sub(right);
      if (this.keys['KeyD'] || this.keys['ArrowRight']) moveDir.add(right);
    }

    if (moveDir.length() > 0) {
      moveDir.normalize().multiplyScalar(moveSpeed);
      this.footstepTimer += dt;
      if (this.footstepTimer > 0.4) {
        this.footstepTimer = 0;
        audioManager.playFootstep();
      }
    }

    // Jump
    if (this.keys['Space'] && this.playerPos.y <= 1.7) {
      this.playerVel.y = 7;
    }

    // Gravity
    this.playerVel.y -= 18 * dt;

    const newPos = this.playerPos.clone();
    newPos.x += moveDir.x * dt;
    newPos.z += moveDir.z * dt;
    newPos.y += this.playerVel.y * dt;

    // Ground
    if (newPos.y < 1.6) {
      newPos.y = 1.6;
      this.playerVel.y = 0;
    }

    // Wall collision - X axis
    const playerSize = new THREE.Vector3(0.6, 1.6, 0.6);
    const testBoxX = new THREE.Box3();
    testBoxX.setFromCenterAndSize(
      new THREE.Vector3(newPos.x, this.playerPos.y, this.playerPos.z),
      playerSize
    );
    let colX = false;
    for (const obj of this.mapObjects) {
      if (testBoxX.intersectsBox(obj.collider)) {
        colX = true;
        break;
      }
    }
    if (colX) newPos.x = this.playerPos.x;

    // Wall collision - Z axis
    const testBoxZ = new THREE.Box3();
    testBoxZ.setFromCenterAndSize(
      new THREE.Vector3(newPos.x, this.playerPos.y, newPos.z),
      playerSize
    );
    let colZ = false;
    for (const obj of this.mapObjects) {
      if (testBoxZ.intersectsBox(obj.collider)) {
        colZ = true;
        break;
      }
    }
    if (colZ) newPos.z = this.playerPos.z;

    // Boundary
    const bound = getMapBound(this.map);
    newPos.x = Math.max(-bound, Math.min(bound, newPos.x));
    newPos.z = Math.max(-bound, Math.min(bound, newPos.z));

    this.playerPos.copy(newPos);

    // Camera
    this.camera.position.copy(this.playerPos);
    this.camera.rotation.order = 'YXZ';
    this.camera.rotation.y = this.yaw;
    this.camera.rotation.x = this.pitch;

    // Weapon bob phase
    if (moveDir.length() > 0) {
      this.weaponBobPhase += dt * 10;
    }

    // Sync weapon visuals (bob + recoil) BEFORE shooting logic
    this.updateAnimations(dt);

    // Reload logic
    if (this.reloading) {
      const elapsed = this.clock.getElapsedTime() - this.reloadStartTime;
      if (elapsed >= this.weapon.reloadTime) {
        this.ammo[this.weaponIndex] = this.weapon.magSize;
        this.reloading = false;
      }
    }

    // Shooting
    const shooting = this.isMobile ? this.mobileShoot : this.mouseDown;
    if (shooting && !this.gameOver) {
      if (this.weapon.auto || !this._shotFired) {
        this.fire();
        if (!this.weapon.auto) this._shotFired = true;
      }
    } else {
      this._shotFired = false;
    }
  }

  private updateEnemies(dt: number) {
    const now = this.clock.getElapsedTime();

    for (const enemy of this.enemies) {
      if (enemy.dead) {
        // Death animation
        const timeSinceDeath = now - enemy.deathTime;
        if (timeSinceDeath < 3) {
          // Fall over sideways
          enemy.mesh.rotation.z = Math.min(Math.PI / 2, timeSinceDeath * 4);
          // Sink slightly
          enemy.mesh.position.y = Math.max(-0.5, enemy.position.y - timeSinceDeath * 0.3);
        } else {
          this.scene.remove(enemy.mesh);
          // Remove health bar
          const bar = this.healthBars.get(enemy);
          if (bar) {
            this.scene.remove(bar);
            this.healthBars.delete(enemy);
          }
        }
        continue;
      }

      const toPlayer = this.playerPos.clone().sub(enemy.position);
      toPlayer.y = 0;
      const dist = toPlayer.length();

      // Previous state for reaction tracking
      const prevState = enemy.state;

      // State machine
      if (dist < enemy.attackRange) {
        enemy.state = 'attack';
      } else if (dist < enemy.sightRange) {
        enemy.state = 'chase';
      } else {
        enemy.state = 'patrol';
      }

      // Track when enemy first spots the player
      if (prevState === 'patrol' && (enemy.state === 'chase' || enemy.state === 'attack')) {
        enemy.spottedTime = now;
        enemy.hasReacted = false;
        enemy.burstCount = 0;
        enemy.inBurst = false;
      }

      // Check if reaction time has passed
      if (!enemy.hasReacted && (enemy.state === 'chase' || enemy.state === 'attack')) {
        if (now - enemy.spottedTime >= enemy.reactionTime) {
          enemy.hasReacted = true;
        }
      }

      // Reset reaction when losing sight
      if (enemy.state === 'patrol') {
        enemy.hasReacted = false;
        enemy.spottedTime = 0;
      }

      // Face player when chasing/attacking
      if (enemy.state !== 'patrol') {
        const angle = Math.atan2(toPlayer.x, toPlayer.z);
        // Smooth rotation
        let angleDiff = angle - enemy.mesh.rotation.y;
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
        enemy.mesh.rotation.y += angleDiff * Math.min(1, dt * 5);
      }

      // Update strafe timer
      enemy.strafeTimer -= dt;
      if (enemy.strafeTimer <= 0) {
        enemy.strafeDir *= -1;
        enemy.strafeTimer = 1.5 + Math.random() * 2;
      }

      switch (enemy.state) {
        case 'patrol': {
          const toTarget = enemy.targetPoint.clone().sub(enemy.position);
          toTarget.y = 0;
          if (toTarget.length() < 2) {
            enemy.targetPoint = enemy.position.clone().add(
              new THREE.Vector3(
                (Math.random() - 0.5) * 40,
                0,
                (Math.random() - 0.5) * 40
              )
            );
            enemy.targetPoint.x = Math.max(-75, Math.min(75, enemy.targetPoint.x));
            enemy.targetPoint.z = Math.max(-75, Math.min(75, enemy.targetPoint.z));
          }
          toTarget.normalize().multiplyScalar(enemy.speed * 0.4 * dt);
          enemy.position.add(toTarget);
          const angle = Math.atan2(toTarget.x, toTarget.z);
          enemy.mesh.rotation.y = angle;
          break;
        }
        case 'chase': {
          const dir = toPlayer.normalize().multiplyScalar(enemy.speed * dt);
          enemy.position.add(dir);
          break;
        }
        case 'attack': {
          // Strafe while attacking - more dynamic movement
          const strafeDir = new THREE.Vector3(-toPlayer.z, 0, toPlayer.x).normalize();
          const strafeAmount = enemy.strafeDir * enemy.speed * 0.6 * dt;
          enemy.position.add(strafeDir.multiplyScalar(strafeAmount));

          // Move towards or away from player based on distance
          if (dist > enemy.attackRange * 0.7) {
            // Close in
            const dir = toPlayer.normalize().multiplyScalar(enemy.speed * 0.3 * dt);
            enemy.position.add(dir);
          } else if (dist < enemy.attackRange * 0.3) {
            // Back away if too close
            const dir = toPlayer.normalize().multiplyScalar(-enemy.speed * 0.4 * dt);
            enemy.position.add(dir);
          }

          // Shooting with burst fire and accuracy system
          if (enemy.hasReacted) {
            this.enemyShoot(enemy, now, dist, toPlayer);
          }
          break;
        }
      }

      // Keep on ground and in bounds
      enemy.position.y = 0;
      enemy.position.x = Math.max(-75, Math.min(75, enemy.position.x));
      enemy.position.z = Math.max(-75, Math.min(75, enemy.position.z));

      // Enemy collision with map objects
      const enemyBox = new THREE.Box3();
      enemyBox.setFromCenterAndSize(
        new THREE.Vector3(enemy.position.x, enemy.position.y + 1, enemy.position.z),
        new THREE.Vector3(1, 2, 1)
      );
      for (const obj of this.mapObjects) {
        if (enemyBox.intersectsBox(obj.collider)) {
          const center = new THREE.Vector3();
          obj.collider.getCenter(center);
          const pushDir = enemy.position.clone().sub(center);
          pushDir.y = 0;
          if (pushDir.length() > 0.01) {
            pushDir.normalize().multiplyScalar(dt * 5);
            enemy.position.add(pushDir);
          }
        }
      }

      // Update mesh position
      enemy.mesh.position.set(enemy.position.x, enemy.position.y, enemy.position.z);

      // Leg animation
      const isMoving = enemy.state !== 'attack' || dist > enemy.attackRange * 0.5;
      if (isMoving) {
        const legAngle = Math.sin(now * 8) * 0.4;
        if (enemy.mesh.children[4]) enemy.mesh.children[4].rotation.x = legAngle;
        if (enemy.mesh.children[5]) enemy.mesh.children[5].rotation.x = -legAngle;
      } else {
        if (enemy.mesh.children[4]) enemy.mesh.children[4].rotation.x = 0;
        if (enemy.mesh.children[5]) enemy.mesh.children[5].rotation.x = 0;
      }

      // Arm aiming when attacking
      if (enemy.state === 'attack' && enemy.hasReacted) {
        // Right arm aims forward
        if (enemy.mesh.children[7]) {
          enemy.mesh.children[7].rotation.x = -Math.PI / 4;
        }
      } else {
        if (enemy.mesh.children[7]) {
          enemy.mesh.children[7].rotation.x = 0;
        }
      }
    }

    // Check wave clear — only if NOT already transitioning to next wave
    if (!this.waveTransitioning) {
      const alive = this.enemies.filter(e => !e.dead).length;
      if (alive === 0 && this.enemies.length > 0) {
        // Mark transitioning IMMEDIATELY to prevent re-entry on next frame
        this.waveTransitioning = true;

        // Clean up dead enemy meshes after a delay so death anims can play
        const enemiesToClean = [...this.enemies];
        setTimeout(() => {
          enemiesToClean.forEach(e => {
            this.scene.remove(e.mesh);
            const bar = this.healthBars.get(e);
            if (bar) this.scene.remove(bar);
          });
          this.healthBars.clear();
        }, 500);

        this.enemies = [];
        this.wave++;
        this.score += this.wave * 50;

        // Heal between waves
        this.health = Math.min(this.maxHealth, this.health + 30);

        // Refill ammo
        WEAPONS.forEach((w, i) => this.ammo[i] = w.magSize);

        audioManager.playPickup();
        this.killFeed.unshift(`🏆 Wave ${this.wave - 1} cleared!`);
        this.killFeedTimes.unshift(now);
        if (this.killFeed.length > 3) { this.killFeed.pop(); this.killFeedTimes.pop(); }

        // Spawn next wave after delay, then clear the flag
        setTimeout(() => {
          this.killFeed.unshift(`⚠️ Wave ${this.wave} incoming!`);
          this.killFeedTimes.unshift(this.clock.getElapsedTime());
          if (this.killFeed.length > 3) { this.killFeed.pop(); this.killFeedTimes.pop(); }
          this.spawnWave();
          this.waveTransitioning = false;
          this.emitState();
        }, 2500);
      }
    }
  }

  private enemyShoot(enemy: Enemy, now: number, dist: number, toPlayer: THREE.Vector3) {
    // Burst fire system
    if (!enemy.inBurst) {
      // Check if cooldown has passed
      if (now - enemy.lastBurstEnd < enemy.burstCooldown) return;
      // Start new burst
      enemy.inBurst = true;
      enemy.burstCount = 0;
    }

    // Fire rate within burst
    if (now - enemy.lastShot < 1 / enemy.fireRate) return;

    // Check if burst is done
    if (enemy.burstCount >= enemy.burstMax) {
      enemy.inBurst = false;
      enemy.lastBurstEnd = now;
      enemy.burstCount = 0;
      return;
    }

    enemy.lastShot = now;
    enemy.burstCount++;

    // Check line of sight
    const enemyEyePos = enemy.position.clone().add(new THREE.Vector3(0, 1.8, 0));
    const shootDir = this.playerPos.clone().sub(enemyEyePos).normalize();
    const ray = new THREE.Raycaster(enemyEyePos, shootDir, 0, dist + 1);

    let blocked = false;
    for (const obj of this.mapObjects) {
      const hits = ray.intersectObject(obj.mesh);
      if (hits.length > 0 && hits[0].distance < dist - 0.5) {
        blocked = true;
        break;
      }
    }

    if (blocked) {
      // Can't see player - cancel burst and try to reposition
      enemy.inBurst = false;
      enemy.lastBurstEnd = now;
      return;
    }

    // Calculate hit chance
    let hitChance = enemy.accuracy;

    // Distance falloff: lose up to 25% accuracy at max range
    const distRatio = Math.min(1, dist / enemy.attackRange);
    hitChance *= (1 - distRatio * 0.25);

    // Penalty if player is moving (20% reduction)
    const playerMoving = (this.keys['KeyW'] || this.keys['KeyS'] || this.keys['KeyA'] || this.keys['KeyD'] ||
      (this.moveJoystick.active && (Math.abs(this.moveJoystick.dx) > 10 || Math.abs(this.moveJoystick.dy) > 10)));
    if (playerMoving) {
      hitChance *= 0.80;
    }

    // Clamp final accuracy between 30% and 90%
    hitChance = Math.max(0.30, Math.min(0.90, hitChance));

    // Roll for hit
    const didHit = Math.random() < hitChance;

    // Enemy muzzle flash (always show this regardless of hit)
    const muzzlePos = enemyEyePos.add(shootDir.clone().multiplyScalar(0.8));
    const flashGeo = new THREE.SphereGeometry(0.05, 4, 4);
    const flashMat = new THREE.MeshBasicMaterial({ color: 0xff8800 });
    const flash = new THREE.Mesh(flashGeo, flashMat);
    flash.position.copy(muzzlePos);
    this.scene.add(flash);
    this.muzzleFlashes.push({ mesh: flash, time: now });

    if (didHit) {
      this.health -= enemy.damage;
      this.lastDamageTime = now;
      this.damageFlash = true;
      this.damageFlashTime = now;
      audioManager.playDamage();

      if (this.health <= 0) {
        this.health = 0;
        this.gameOver = true;
        this.scoped = false;
        this.camera.fov = 75;
        this.camera.updateProjectionMatrix();
        if (this.weaponMesh) this.weaponMesh.visible = true;
      }
    }
  }

  private updateEffects(dt: number) {
    const now = this.clock.getElapsedTime();

    this.muzzleFlashes = this.muzzleFlashes.filter(f => {
      if (now - f.time > 0.05) {
        this.scene.remove(f.mesh);
        return false;
      }
      return true;
    });

    this.tracers = this.tracers.filter(t => {
      if (now - t.time > 0.1) {
        this.scene.remove(t.mesh);
        return false;
      }
      return true;
    });

    this.particles = this.particles.filter(p => {
      if (now - p.time > 0.5) {
        this.scene.remove(p.mesh);
        return false;
      }
      p.velocity.y -= 15 * dt;
      p.mesh.position.add(p.velocity.clone().multiplyScalar(dt));
      p.mesh.scale.multiplyScalar(0.95);
      return true;
    });

    if (this.hitMarker && now - this.hitMarkerTime > 0.15) {
      this.hitMarker = false;
    }

    if (this.damageFlash && now - this.damageFlashTime > 0.2) {
      this.damageFlash = false;
    }

    // Auto-expire kill feed entries after 1.5 seconds
    while (this.killFeedTimes.length > 0 && now - this.killFeedTimes[this.killFeedTimes.length - 1] > 1.5) {
      this.killFeed.pop();
      this.killFeedTimes.pop();
    }
  }

  private emitState() {
    if (!this.stateCallback) return;
    const w = this.weapon;
    const reloadProgress = this.reloading
      ? Math.min(1, (this.clock.getElapsedTime() - this.reloadStartTime) / w.reloadTime)
      : 0;

    this.stateCallback({
      health: this.health,
      maxHealth: this.maxHealth,
      ammo: this.ammo[this.weaponIndex],
      maxAmmo: w.magSize,
      weapon: w,
      weaponIndex: this.weaponIndex,
      score: this.score,
      kills: this.kills,
      wave: this.wave,
      enemiesAlive: this.enemies.filter(e => !e.dead).length,
      reloading: this.reloading,
      reloadProgress,
      gameOver: this.gameOver,
      paused: this.paused,
      hitMarker: this.hitMarker,
      damageFlash: this.damageFlash,
      killFeed: [...this.killFeed],
      killFeedTimes: [...this.killFeedTimes],
      waveTransitioning: this.waveTransitioning,
      scoped: this.scoped,
      map: this.map,
    });
  }

  private loop = () => {
    this.animFrameId = requestAnimationFrame(this.loop);

    const dt = Math.min(this.clock.getDelta(), 0.05);

    if (!this.paused && !this.gameOver) {
      this.updatePlayer(dt);
      this.updateEnemies(dt);
      this.updateEffects(dt);

      // Health regeneration: 1 HP/s after 6 seconds without damage
      const now = this.clock.getElapsedTime();
      if (now - this.lastDamageTime > 6 && this.health < this.maxHealth) {
        this.health = Math.min(this.maxHealth, this.health + 1 * dt);
      }
    }

    this.renderer.render(this.scene, this.camera);
    this.emitState();
  };

  restart() {
    // Clean up
    this.enemies.forEach(e => {
      this.scene.remove(e.mesh);
      const bar = this.healthBars.get(e);
      if (bar) this.scene.remove(bar);
    });
    this.healthBars.clear();
    this.enemies = [];

    // Clean up effects
    this.muzzleFlashes.forEach(f => this.scene.remove(f.mesh));
    this.muzzleFlashes = [];
    this.tracers.forEach(t => this.scene.remove(t.mesh));
    this.tracers = [];
    this.particles.forEach(p => this.scene.remove(p.mesh));
    this.particles = [];

    // Reset state
    this.playerSpawn = getPlayerSpawnByMap(this.map);
    this.playerPos.copy(this.playerSpawn);
    this.playerVel.set(0, 0, 0);
    this.yaw = Math.PI;
    this.pitch = 0;
    this.health = 100;
    this.score = 0;
    this.kills = 0;
    this.wave = 1;
    this.waveTransitioning = false;
    this.scoped = false;
    this.camera.fov = 75;
    this.camera.updateProjectionMatrix();
    this.gameOver = false;
    this.reloading = false;
    this.killFeed = [];
    this.killFeedTimes = [];
    this.lastDamageTime = 0;

    WEAPONS.forEach((w, i) => this.ammo[i] = w.magSize);

    this.spawnWave();
    this.emitState();
  }

  dispose() {
    cancelAnimationFrame(this.animFrameId);
    window.removeEventListener('resize', this.onResize);
    this.renderer.dispose();
    if (this.container && this.renderer.domElement.parentElement === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
