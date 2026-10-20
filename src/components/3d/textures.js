import * as THREE from 'three';

/**
 * Procedural texture utilities for Pearl Oasis 3D scene
 * Zero external 404 dependencies - all generated via Canvas 2D
 */

export function createMarbleTileTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    ctx.fillStyle = '#141416';
    ctx.fillRect(0, 0, 1024, 1024);

    ctx.lineWidth = 1.5;
    ctx.strokeStyle = 'rgba(212, 175, 55, 0.06)';
    for (let i = 0; i < 35; i++) {
      ctx.beginPath();
      let x = Math.random() * 1024;
      let y = Math.random() * 1024;
      ctx.moveTo(x, y);
      for (let j = 0; j < 6; j++) {
        x += (Math.random() - 0.5) * 180;
        y += Math.random() * 140;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    ctx.strokeStyle = 'rgba(40, 36, 30, 0.6)';
    ctx.lineWidth = 3;
    const tileSize = 256;
    for (let x = 0; x <= 1024; x += tileSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 1024);
      ctx.stroke();
    }
    for (let y = 0; y <= 1024; y += tileSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(1024, y);
      ctx.stroke();
    }

    for (let x = 0; x < 1024; x += tileSize) {
      for (let y = 0; y < 1024; y += tileSize) {
        const rad = ctx.createRadialGradient(
          x + tileSize / 2,
          y + tileSize / 2,
          10,
          x + tileSize / 2,
          y + tileSize / 2,
          tileSize / 2
        );
        rad.addColorStop(0, 'rgba(255, 240, 200, 0.03)');
        rad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = rad;
        ctx.fillRect(x, y, tileSize, tileSize);
      }
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(4, 12);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function createWoodGrainTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    ctx.fillStyle = '#221914';
    ctx.fillRect(0, 0, 512, 512);

    for (let i = 0; i < 500; i++) {
      const y = Math.random() * 512;
      const alpha = 0.05 + Math.random() * 0.12;
      ctx.fillStyle = `rgba(15, 10, 7, ${alpha})`;
      ctx.fillRect(0, y, 512, 1 + Math.random() * 2);
    }

    for (let i = 0; i < 150; i++) {
      const y = Math.random() * 512;
      ctx.fillStyle = `rgba(110, 75, 42, ${0.04 + Math.random() * 0.06})`;
      ctx.fillRect(0, y, 512, 1);
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1, 4);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function createCeilingCofferedTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    ctx.fillStyle = '#111214';
    ctx.fillRect(0, 0, 512, 512);

    const size = 128;
    for (let x = 0; x < 512; x += size) {
      for (let y = 0; y < 512; y += size) {
        ctx.strokeStyle = '#241c15';
        ctx.lineWidth = 10;
        ctx.strokeRect(x + 5, y + 5, size - 10, size - 10);

        ctx.fillStyle = '#0a0a0c';
        ctx.fillRect(x + 10, y + 10, size - 20, size - 20);

        const glow = ctx.createRadialGradient(
          x + size / 2,
          y + size / 2,
          4,
          x + size / 2,
          y + size / 2,
          36
        );
        glow.addColorStop(0, 'rgba(255, 215, 120, 0.8)');
        glow.addColorStop(0.3, 'rgba(255, 180, 70, 0.35)');
        glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(x + size / 2, y + size / 2, 36, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 6);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function createFeatureWallSignTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    ctx.fillStyle = '#0d0e11';
    ctx.fillRect(0, 0, 1024, 512);

    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(212, 175, 55, 0.2)';
    for (let i = 0; i < 20; i++) {
      ctx.beginPath();
      let x = Math.random() * 1024;
      let y = Math.random() * 512;
      ctx.moveTo(x, y);
      for (let j = 0; j < 5; j++) {
        x += (Math.random() - 0.5) * 200;
        y += Math.random() * 120;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.shadowColor = 'rgba(212, 175, 55, 0.6)';
    ctx.shadowBlur = 24;

    ctx.font = 'italic 72px "Alex Brush", cursive, serif';
    ctx.fillStyle = '#fae08c';
    ctx.fillText('Pearl Oasis', 512, 220);

    ctx.font = '600 24px "Cinzel", Georgia, serif';
    ctx.fillStyle = '#e5c158';
    ctx.letterSpacing = '12px';
    ctx.fillText('RESTAURANT', 512, 310);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
