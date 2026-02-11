export interface WeaponDef {
  name: string;
  type: 'pistol' | 'shotgun' | 'rifle' | 'sniper';
  damage: number;
  fireRate: number; // shots per second
  magSize: number;
  reloadTime: number; // seconds
  spread: number; // radians
  pellets: number;
  range: number;
  recoil: number;
  auto: boolean;
  color: number;
}

export const WEAPONS: WeaponDef[] = [
  {
    name: 'Pistol',
    type: 'pistol',
    damage: 25,
    fireRate: 4,
    magSize: 12,
    reloadTime: 1.2,
    spread: 0.02,
    pellets: 1,
    range: 100,
    recoil: 0.05,
    auto: false,
    color: 0x888888,
  },
  {
    name: 'Shotgun',
    type: 'shotgun',
    damage: 15,
    fireRate: 1.2,
    magSize: 6,
    reloadTime: 2.0,
    spread: 0.13,
    pellets: 8,
    range: 30,
    recoil: 0.15,
    auto: false,
    color: 0x8B4513,
  },
  {
    name: 'Rifle',
    type: 'rifle',
    damage: 20,
    fireRate: 10,
    magSize: 30,
    reloadTime: 1.8,
    spread: 0.03,
    pellets: 1,
    range: 120,
    recoil: 0.03,
    auto: true,
    color: 0x2F4F4F,
  },
  {
    name: 'Sniper',
    type: 'sniper',
    damage: 100,
    fireRate: 0.8,
    magSize: 5,
    reloadTime: 2.5,
    spread: 0.005,
    pellets: 1,
    range: 300,
    recoil: 0.2,
    auto: false,
    color: 0x333333,
  },
];
