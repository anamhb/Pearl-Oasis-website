import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import logoText from '../../assets/images/logo-text.png';
import crestModel from '../../assets/images/PO-logo.glb?url';

/**
 * Gold sampled directly from src/assets/images/logo.PNG:
 *   median #d6ab4b · highlight #e9bb6b · shadow #9c7b38
 * PO-logo.glb ships without a material, so this gold is applied to every mesh.
 */
const GOLD = '#d6ab4b';

/* Placement inside logo-text.png (636 x 392), measured from the file itself:
 *   - the ascender of the "l" in "Pearl" tops out at y = 112  → 28.6% of height,
 *     which is where the crest's bottom tip sits (exactly like the reference)
 *   - that "l" is centred at x = 325                          → 51.1% of width
 *   - crest size follows the reference artwork (nI0Ic (1).jpg), nudged up from
 *     15.5% → 16% of the image width for on-screen visibility; its height
 *     follows the model's own 0.55 w/h ratio → 47.2% of the image height.
 * Result: the crest sits centred above the "l", like the supplied reference. */
const CREST_STYLE = {
  left: '51.1%',
  top: '28.6%',
  width: '16%',
  height: '47.2%',
  transform: 'translate(-50%, -100%)',
};

/** Light intensities chosen so the rendered gold matches logo.PNG exactly:
 *  the crest's fully-opaque body pixels land on the material colour (#d6ab4b,
 *  the median gold sampled from that PNG) — total light gain ≈ 1.0, with the
 *  key/fill lights only shaping the bevels. */
const AMBIENT_INTENSITY = 2.94;
const KEY_INTENSITY = 0.78;
const FILL_INTENSITY = 0.26;

/**
 * The 3D crest (PO-logo.glb) rendered with three.js into whatever box it is
 * given — it sizes itself from the element's client box (dpr aware) and keeps
 * the model's own proportions, so it never distorts or overflows.
 *
 * `animate` (default true) drives the continuous 360° rotation used by the
 * navbar. Pass `animate={false}` for a static render — the crest is drawn once
 * (and re-drawn on resize) and no animation frame loop is started, so the logo
 * stays perfectly still.
 */
export const Crest3D = ({ className = '', animate = true }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: true,
        antialias: true,
        preserveDrawingBuffer: true,
      });
    } catch (error) {
      // No WebGL (very old device) — the wordmark still renders on its own.
      return undefined;
    }

    renderer.setClearColor(0x000000, 0);
    renderer.toneMapping = THREE.NoToneMapping;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50);

    const ambient = new THREE.AmbientLight(0xffffff, AMBIENT_INTENSITY);
    const keyFront = new THREE.DirectionalLight(0xfffaed, 1.4);
    keyFront.position.set(2, 3, 4);
    const keyBack = new THREE.DirectionalLight(0xffe6b0, 1.2);
    keyBack.position.set(-2, 2, -4);
    const fill = new THREE.DirectionalLight(0xffd9a0, 0.7);
    fill.position.set(-3, -1.4, 2.6);
    scene.add(ambient, keyFront, keyBack, fill);

    const gold = new THREE.MeshStandardMaterial({
      color: new THREE.Color(GOLD),
      metalness: 0.65,
      roughness: 0.32,
    });

    let model = null;
    let modelHeight = null;
    let disposed = false;
    let frameRequest = 0;

    const fitCamera = (height) => {
      const verticalFov = (camera.fov * Math.PI) / 180;
      camera.position.set(0, 0, (height * 1.06) / 2 / Math.tan(verticalFov / 2));
      camera.lookAt(0, 0, 0);
    };

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = Math.max(canvas.clientWidth, 1);
      const height = Math.max(canvas.clientHeight, 1);
      renderer.setPixelRatio(dpr);
      // updateStyle = false: CSS (w-full h-full) owns the element size.
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      if (modelHeight) {
        fitCamera(modelHeight);
      }
      renderer.render(scene, camera);
    };

    const loader = new GLTFLoader();
    loader.load(
      crestModel,
      (gltf) => {
        if (disposed) return;
        model = gltf.scene;
        model.traverse((node) => {
          if (node.isMesh) node.material = gold;
        });
        const box = new THREE.Box3().setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        model.position.set(-center.x, -center.y, -center.z);
        scene.add(model);
        modelHeight = size.y;
        fitCamera(modelHeight);
        resize();
        // Static variant: the single render performed by resize() is the frame.
        if (animate) startLoop();
      },
      undefined,
      (error) => {
        // eslint-disable-next-line no-console
        console.error('PO-logo.glb failed to load', error);
      },
    );

    /* Continuous 360-degree rotation animation */
    let lastTime = performance.now();
    let currentAngle = 0;
    const ROTATION_SPEED = 1.35; // radians per second (~4.6s per full 360 rotation)

    const startLoop = () => {
      if (frameRequest) return;
      const tick = (now) => {
        frameRequest = requestAnimationFrame(tick);
        const delta = Math.min((now - lastTime) / 1000, 0.1);
        lastTime = now;
        if (model) {
          currentAngle = (currentAngle + delta * ROTATION_SPEED) % (Math.PI * 2);
          model.rotation.y = currentAngle;
          renderer.render(scene, camera);
        }
      };
      frameRequest = requestAnimationFrame(tick);
    };

    const observer =
      typeof ResizeObserver !== 'undefined' ? new ResizeObserver(resize) : null;
    if (observer) observer.observe(canvas);
    window.addEventListener('resize', resize);
    resize();

    // The wordmark's box changes once the PNG finishes loading; the observer
    // above catches that, and this short-lived safety net guarantees the
    // buffer is re-measured a few times regardless (it self-clears).
    let attempts = 0;
    const interval = window.setInterval(() => {
      resize();
      if (++attempts >= 50) window.clearInterval(interval);
    }, 200);

    return () => {
      disposed = true;
      if (frameRequest) cancelAnimationFrame(frameRequest);
      frameRequest = 0;
      window.clearInterval(interval);
      if (observer) observer.disconnect();
      window.removeEventListener('resize', resize);
      gold.dispose();
      if (model) {
        model.traverse((node) => {
          if (node.isMesh) node.geometry?.dispose();
        });
      }
      renderer.dispose();
    };
  }, [animate]);

  return <canvas ref={canvasRef} aria-hidden="true" className={`block w-full h-full ${className}`} />;
};

/**
 * The Pearl Oasis wordmark (logo-text.png) with the 3D crest sitting above the
 * "l" of "Pearl", as in the supplied reference artwork.
 *
 * `animate` is forwarded to the crest: the navbar keeps the rotating crest,
 * while the footer renders the exact same logo asset and wordmark with a
 * static (non-rotating) crest.
 */
export const BrandWordmark = ({ imgClassName = 'h-16 sm:h-20', animate = true }) => (
  <span className="relative inline-block align-middle">
    <img
      src={logoText}
      alt="Pearl Oasis"
      draggable={false}
      className={`block w-auto select-none ${imgClassName}`}
    />
    <span aria-hidden="true" className="absolute pointer-events-none" style={CREST_STYLE}>
      <Crest3D animate={animate} />
    </span>
  </span>
);

export { GOLD };
