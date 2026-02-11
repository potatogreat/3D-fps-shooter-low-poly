const fs = require('fs');
const path = require('path');

const filePath = 'c:\\Users\\harsh\\Downloads\\low-poly-3d-fps\\src\\game\\GameEngine.ts';
let content = fs.readFileSync(filePath, 'utf8');

// 1. Disable context menu
if (!content.includes('"contextmenu"')) {
    content = content.replace(
        'const canvas = this.renderer.domElement;',
        'const canvas = this.renderer.domElement;\n\n    // Disable right-click context menu\n    window.addEventListener("contextmenu", (e) => e.preventDefault());'
    );
}

// 2. Add right-click toggleScope
content = content.replace(
    /if \(e.button === 0\) this.mouseDown = true;/g,
    'if (e.button === 0) this.mouseDown = true;\n        if (e.button === 2) this.toggleScope();'
);

// 3. Update toggleScope to be enabled for all weapons and handle zoom
// Find the toggleScope method and expand it
const oldScopeRegex = /toggleScope\(\) \{[\s\S]*?if \(this\.weapon\.type === 'sniper'\) \{([\s\S]*?)\n[ \t]*\}\n[ \t]*\}/;
const newScopeBody = `toggleScope() {
    this.scoped = !this.scoped;
    
    // Zoom levels: Sniper (25), Rifle (55), Others (65), None (75)
    let zoomFOV = 65;
    if (this.weapon.type === 'sniper') zoomFOV = 25;
    else if (this.weapon.type === 'rifle') zoomFOV = 55;
    
    this.camera.fov = this.scoped ? zoomFOV : 75;
    this.camera.updateProjectionMatrix();
    
    if (this.weaponMesh) {
      // Sniper goes invisible for cleaner scope view
      if (this.weapon.type === 'sniper') {
        this.weaponMesh.visible = !this.scoped;
      } else {
        this.weaponMesh.visible = true;
      }
    }
    this.emitState();
  }`;

// Simpler bulletproof string replacements if regex fails
content = content.replace(
    "if (this.weapon.type === 'sniper') {",
    "if (true) { // Enabled for all weapons"
);
content = content.replace(
    "this.camera.fov = this.scoped ? 25 : 75;",
    "let zoomFOV = 65; if(this.weapon.type === 'sniper') zoomFOV = 25; if(this.weapon.type === 'rifle') zoomFOV = 55; this.camera.fov = this.scoped ? zoomFOV : 75;"
);
content = content.replace(
    "this.weaponMesh.visible = false;",
    "if(this.weapon.type === 'sniper') this.weaponMesh.visible = false; else this.weaponMesh.visible = true;"
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Replacement complete via Node');
