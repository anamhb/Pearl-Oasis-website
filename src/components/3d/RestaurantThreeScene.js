import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import {
  createMarbleTileTexture,
  createWoodGrainTexture,
  createCeilingCofferedTexture,
  createFeatureWallSignTexture,
} from './textures.js';

export class RestaurantThreeScene {
  constructor(config) {
    this.canvas = config.canvas;

    // 1. Renderer Setup
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.25;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(this.canvas.clientWidth, this.canvas.clientHeight, false);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // 2. Scene & Fog Setup
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0b0d);
    this.scene.fog = new THREE.FogExp2(0x0a0b0d, 0.045);

    // 3. Studio Environment Map (PMREM + RoomEnvironment)
    const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    // 4. Camera Setup (Human eye level ~1.65m)
    this.camera = new THREE.PerspectiveCamera(
      46,
      this.canvas.clientWidth / this.canvas.clientHeight,
      0.1,
      60
    );
    this.camera.position.set(0, 1.65, 5.8);
    this.camera.lookAt(0, 1.65, 0);

    // 5. Initialize Groups
    this.leftDoorHinge = new THREE.Group();
    this.rightDoorHinge = new THREE.Group();
    this.interiorLightGroup = new THREE.Group();
    this.thresholdLight = new THREE.PointLight(0xffbe6b, 1.0, 10, 1.2);
    this.exteriorLight = new THREE.DirectionalLight(0xd4e2ff, 1.2);

    // Interactive state
    this.scrollProgress = 0;
    this.targetScrollProgress = 0;
    this.mouseX = 0;
    this.mouseY = 0;
    this.targetMouseX = 0;
    this.targetMouseY = 0;
    this.animationFrameId = null;
    this.clock = new THREE.Clock();
    this.isDisposed = false;

    // 6. Build the 3D World
    this.setupLighting();
    this.buildEntrancePortal();
    this.buildDoors();
    this.buildGrandCorridor();

    // 7. Event Handlers
    this.handleResize = this.handleResize.bind(this);
    this.handlePointerMove = this.handlePointerMove.bind(this);
    window.addEventListener('resize', this.handleResize);
    window.addEventListener('pointermove', this.handlePointerMove);

    // 8. Start Render Loop
    this.tick = this.tick.bind(this);
    this.animationFrameId = requestAnimationFrame(this.tick);

    if (config.onReady) {
      config.onReady();
    }
  }

  setupLighting() {
    this.exteriorLight.position.set(3, 7, 7);
    this.exteriorLight.castShadow = true;
    this.exteriorLight.shadow.mapSize.width = 1024;
    this.exteriorLight.shadow.mapSize.height = 1024;
    this.exteriorLight.shadow.bias = -0.0004;
    this.scene.add(this.exteriorLight);

    const hemiLight = new THREE.HemisphereLight(0x232936, 0x14100c, 0.9);
    this.scene.add(hemiLight);

    this.thresholdLight.position.set(0, 2.5, 0.4);
    this.thresholdLight.castShadow = false;
    this.scene.add(this.thresholdLight);

    this.scene.add(this.interiorLightGroup);
    const interiorAmbient = new THREE.AmbientLight(0xffe2b3, 0.4);
    this.interiorLightGroup.add(interiorAmbient);
  }

  buildEntrancePortal() {
    const portalGroup = new THREE.Group();

    const darkStoneMat = new THREE.MeshStandardMaterial({
      color: 0x181a1f,
      roughness: 0.85,
      metalness: 0.15,
    });

    const bronzeFrameMat = new THREE.MeshPhysicalMaterial({
      color: 0x362c1e,
      roughness: 0.35,
      metalness: 0.85,
      clearcoat: 0.3,
    });

    const goldAccentMat = new THREE.MeshPhysicalMaterial({
      color: 0xd4af37,
      roughness: 0.25,
      metalness: 0.95,
      clearcoat: 0.6,
    });

    const facadeLeft = new THREE.Mesh(new THREE.BoxGeometry(4, 6, 0.6), darkStoneMat);
    facadeLeft.position.set(-3.4, 2.5, 0);
    facadeLeft.castShadow = true;
    facadeLeft.receiveShadow = true;
    portalGroup.add(facadeLeft);

    const facadeRight = new THREE.Mesh(new THREE.BoxGeometry(4, 6, 0.6), darkStoneMat);
    facadeRight.position.set(3.4, 2.5, 0);
    facadeRight.castShadow = true;
    facadeRight.receiveShadow = true;
    portalGroup.add(facadeRight);

    const lintel = new THREE.Mesh(new THREE.BoxGeometry(3.6, 2.2, 0.65), darkStoneMat);
    lintel.position.set(0, 4.3, 0);
    portalGroup.add(lintel);

    const jambGeo = new THREE.BoxGeometry(0.18, 3.3, 0.5);
    const leftJamb = new THREE.Mesh(jambGeo, bronzeFrameMat);
    leftJamb.position.set(-1.49, 1.65, 0);
    portalGroup.add(leftJamb);

    const rightJamb = new THREE.Mesh(jambGeo, bronzeFrameMat);
    rightJamb.position.set(1.49, 1.65, 0);
    portalGroup.add(rightJamb);

    const topHeader = new THREE.Mesh(new THREE.BoxGeometry(3.16, 0.18, 0.5), bronzeFrameMat);
    topHeader.position.set(0, 3.29, 0);
    portalGroup.add(topHeader);

    const threshold = new THREE.Mesh(
      new THREE.BoxGeometry(3.4, 0.12, 1.2),
      new THREE.MeshStandardMaterial({ color: 0x1f1b17, roughness: 0.4, metalness: 0.3 })
    );
    threshold.position.set(0, 0.06, 0);
    threshold.receiveShadow = true;
    portalGroup.add(threshold);

    const signBox = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.72, 0.25), darkStoneMat);
    signBox.position.set(0, 3.8, 0.38);
    portalGroup.add(signBox);

    const signTrimTop = new THREE.Mesh(new THREE.BoxGeometry(3.25, 0.04, 0.28), goldAccentMat);
    signTrimTop.position.set(0, 4.16, 0.38);
    portalGroup.add(signTrimTop);

    const signTrimBot = new THREE.Mesh(new THREE.BoxGeometry(3.25, 0.04, 0.28), goldAccentMat);
    signTrimBot.position.set(0, 3.44, 0.38);
    portalGroup.add(signTrimBot);

    const signCanvas = document.createElement('canvas');
    signCanvas.width = 1024;
    signCanvas.height = 256;
    const sctx = signCanvas.getContext('2d');
    if (sctx) {
      sctx.fillStyle = '#141418';
      sctx.fillRect(0, 0, 1024, 256);

      sctx.textAlign = 'center';
      sctx.fillStyle = '#e8c468';
      sctx.font = 'bold 36px "Cinzel", Georgia, serif';
      sctx.letterSpacing = '8px';
      sctx.fillText('PEARL OASIS', 512, 85);

      sctx.fillStyle = '#fff4d4';
      sctx.font = '900 84px "Plus Jakarta Sans", sans-serif';
      sctx.letterSpacing = '14px';
      sctx.shadowColor = 'rgba(255, 218, 120, 0.9)';
      sctx.shadowBlur = 20;
      sctx.fillText('ENTRANCE', 512, 195);
    }
    const signTex = new THREE.CanvasTexture(signCanvas);
    signTex.colorSpace = THREE.SRGBColorSpace;

    const signFace = new THREE.Mesh(
      new THREE.PlaneGeometry(3.1, 0.65),
      new THREE.MeshStandardMaterial({
        map: signTex,
        emissiveMap: signTex,
        emissive: new THREE.Color(0xfff1cf),
        emissiveIntensity: 0.65,
        roughness: 0.3,
      })
    );
    signFace.position.set(0, 3.8, 0.51);
    portalGroup.add(signFace);

    const signLightBar = new THREE.PointLight(0xffd580, 1.5, 4, 1.5);
    signLightBar.position.set(0, 3.4, 0.6);
    portalGroup.add(signLightBar);

    const sconceMat = new THREE.MeshStandardMaterial({
      color: 0x241d13,
      metalness: 0.9,
      roughness: 0.3,
    });

    [-1.9, 1.9].forEach((xPos) => {
      const sconceBody = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.35, 0.1), sconceMat);
      sconceBody.position.set(xPos, 2.0, 0.32);
      portalGroup.add(sconceBody);

      const sconceLight = new THREE.PointLight(0xffbe6b, 0.8, 3, 2);
      sconceLight.position.set(xPos, 2.0, 0.4);
      portalGroup.add(sconceLight);
    });

    this.scene.add(portalGroup);
  }

  buildDoors() {
    const doorWidth = 1.38;
    const doorHeight = 3.18;
    const doorThickness = 0.08;

    const woodTexture = createWoodGrainTexture();
    const walnutDoorMat = new THREE.MeshPhysicalMaterial({
      color: 0x221710,
      map: woodTexture,
      roughness: 0.5,
      metalness: 0.15,
      clearcoat: 0.25,
    });

    const brassMat = new THREE.MeshPhysicalMaterial({
      color: 0xd4af37,
      roughness: 0.2,
      metalness: 0.95,
      clearcoat: 0.8,
    });

    const darkBronzeHandleMat = new THREE.MeshPhysicalMaterial({
      color: 0x251c14,
      roughness: 0.25,
      metalness: 0.9,
      clearcoat: 0.5,
    });

    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      transmission: 0.88,
      opacity: 1,
      transparent: true,
      roughness: 0.1,
      ior: 1.52,
      thickness: 0.05,
      attenuationColor: new THREE.Color(0xffeedd),
      attenuationDistance: 2.0,
    });

    const createDoorLeaf = (isLeft) => {
      const leaf = new THREE.Group();
      const centerOffsetX = isLeft ? doorWidth / 2 : -doorWidth / 2;

      const stileWidth = 0.14;
      const railHeight = 0.18;

      const outerStile = new THREE.Mesh(
        new THREE.BoxGeometry(stileWidth, doorHeight, doorThickness),
        walnutDoorMat
      );
      outerStile.position.set(isLeft ? stileWidth / 2 : -stileWidth / 2, 0, 0);
      outerStile.castShadow = true;
      leaf.add(outerStile);

      const innerStile = new THREE.Mesh(
        new THREE.BoxGeometry(stileWidth, doorHeight, doorThickness),
        walnutDoorMat
      );
      innerStile.position.set(isLeft ? doorWidth - stileWidth / 2 : -(doorWidth - stileWidth / 2), 0, 0);
      innerStile.castShadow = true;
      leaf.add(innerStile);

      const topRail = new THREE.Mesh(
        new THREE.BoxGeometry(doorWidth - stileWidth * 2, railHeight, doorThickness),
        walnutDoorMat
      );
      topRail.position.set(centerOffsetX, doorHeight / 2 - railHeight / 2, 0);
      topRail.castShadow = true;
      leaf.add(topRail);

      const botRailHeight = 0.32;
      const botRail = new THREE.Mesh(
        new THREE.BoxGeometry(doorWidth - stileWidth * 2, botRailHeight, doorThickness),
        walnutDoorMat
      );
      botRail.position.set(centerOffsetX, -doorHeight / 2 + botRailHeight / 2, 0);
      botRail.castShadow = true;
      leaf.add(botRail);

      const midRailHeight = 0.12;
      const midRail = new THREE.Mesh(
        new THREE.BoxGeometry(doorWidth - stileWidth * 2, midRailHeight, doorThickness),
        walnutDoorMat
      );
      midRail.position.set(centerOffsetX, -0.15, 0);
      leaf.add(midRail);

      const glassUpperHeight = doorHeight / 2 - railHeight - midRailHeight / 2 - 0.08;
      const glassUpper = new THREE.Mesh(
        new THREE.BoxGeometry(doorWidth - stileWidth * 2, glassUpperHeight, 0.02),
        glassMat
      );
      glassUpper.position.set(centerOffsetX, (doorHeight / 2 + midRail.position.y) / 2, 0);
      leaf.add(glassUpper);

      const glassLower = new THREE.Mesh(
        new THREE.BoxGeometry(doorWidth - stileWidth * 2, 0.8, 0.02),
        glassMat
      );
      glassLower.position.set(centerOffsetX, -0.65, 0);
      leaf.add(glassLower);

      const vertMullion = new THREE.Mesh(
        new THREE.BoxGeometry(0.02, glassUpperHeight, 0.03),
        brassMat
      );
      vertMullion.position.set(centerOffsetX, glassUpper.position.y, 0);
      leaf.add(vertMullion);

      const handleInnerX = isLeft ? doorWidth - 0.22 : -(doorWidth - 0.22);
      const handleBarGeo = new THREE.CylinderGeometry(0.022, 0.022, 1.4, 16);
      const handleBar = new THREE.Mesh(handleBarGeo, darkBronzeHandleMat);
      handleBar.position.set(handleInnerX, 0, 0.09);
      leaf.add(handleBar);

      const standoffGeo = new THREE.CylinderGeometry(0.018, 0.018, 0.08, 12);
      standoffGeo.rotateX(Math.PI / 2);

      const standoffTop = new THREE.Mesh(standoffGeo, brassMat);
      standoffTop.position.set(handleInnerX, 0.55, 0.05);
      leaf.add(standoffTop);

      const standoffBot = new THREE.Mesh(standoffGeo, brassMat);
      standoffBot.position.set(handleInnerX, -0.55, 0.05);
      leaf.add(standoffBot);

      const pushPlate = new THREE.Mesh(
        new THREE.BoxGeometry(0.12, 0.5, 0.005),
        brassMat
      );
      pushPlate.position.set(handleInnerX, 0, 0.045);
      leaf.add(pushPlate);

      [-1.2, 0, 1.2].forEach((yPos) => {
        const hingeKnuckle = new THREE.Mesh(
          new THREE.CylinderGeometry(0.018, 0.018, 0.12, 12),
          brassMat
        );
        hingeKnuckle.position.set(0, yPos, 0);
        leaf.add(hingeKnuckle);
      });

      return leaf;
    };

    this.leftDoorHinge.position.set(-1.4, 1.65, 0);
    const leftLeaf = createDoorLeaf(true);
    this.leftDoorHinge.add(leftLeaf);
    this.scene.add(this.leftDoorHinge);

    this.rightDoorHinge.position.set(1.4, 1.65, 0);
    const rightLeaf = createDoorLeaf(false);
    this.rightDoorHinge.add(rightLeaf);
    this.scene.add(this.rightDoorHinge);
  }

  buildGrandCorridor() {
    const corridorGroup = new THREE.Group();

    const floorTexture = createMarbleTileTexture();
    const floorGeo = new THREE.PlaneGeometry(5.2, 32);
    const floorMat = new THREE.MeshPhysicalMaterial({
      color: 0x1f1b16,
      map: floorTexture,
      roughness: 0.12,
      metalness: 0.22,
      clearcoat: 0.95,
      clearcoatRoughness: 0.08,
      reflectivity: 0.85,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(0, 0, -10);
    floor.receiveShadow = true;
    corridorGroup.add(floor);

    const ceilingTexture = createCeilingCofferedTexture();
    const ceilingGeo = new THREE.PlaneGeometry(5.2, 32);
    const ceilingMat = new THREE.MeshStandardMaterial({
      color: 0x141416,
      map: ceilingTexture,
      roughness: 0.8,
      metalness: 0.2,
    });
    const ceiling = new THREE.Mesh(ceilingGeo, ceilingMat);
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.set(0, 3.4, -10);
    corridorGroup.add(ceiling);

    for (let z = -2; z >= -22; z -= 3.5) {
      const downLight = new THREE.SpotLight(0xffdf99, 1.2, 8, Math.PI / 4, 0.45, 1.2);
      downLight.position.set(0, 3.35, z);
      downLight.target.position.set(0, 0, z);
      downLight.castShadow = false;
      this.interiorLightGroup.add(downLight);
      this.interiorLightGroup.add(downLight.target);

      const bezel = new THREE.Mesh(
        new THREE.CylinderGeometry(0.12, 0.12, 0.04, 16),
        new THREE.MeshStandardMaterial({ color: 0x221c15, metalness: 0.8, roughness: 0.3 })
      );
      bezel.position.set(0, 3.38, z);
      corridorGroup.add(bezel);
    }

    const woodTexture = createWoodGrainTexture();
    const walnutColumnMat = new THREE.MeshPhysicalMaterial({
      color: 0x261910,
      map: woodTexture,
      roughness: 0.45,
      metalness: 0.15,
      clearcoat: 0.3,
    });

    const brassCapMat = new THREE.MeshPhysicalMaterial({
      color: 0xd4af37,
      roughness: 0.2,
      metalness: 0.95,
      clearcoat: 0.7,
    });

    const lightBarGlowMat = new THREE.MeshBasicMaterial({
      color: 0xffd37a,
    });

    const columnZPositions = [-2.8, -6.8, -10.8, -14.8, -18.8];

    columnZPositions.forEach((zPos) => {
      [-2.1, 2.1].forEach((xPos) => {
        const columnGroup = new THREE.Group();
        columnGroup.position.set(xPos, 1.7, zPos);

        const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.55, 3.4, 0.55), walnutColumnMat);
        pillar.castShadow = true;
        pillar.receiveShadow = true;
        columnGroup.add(pillar);

        const baseCap = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.08, 0.62), brassCapMat);
        baseCap.position.y = -1.66;
        columnGroup.add(baseCap);

        const topCap = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.08, 0.62), brassCapMat);
        topCap.position.y = 1.66;
        columnGroup.add(topCap);

        const inwardFaceX = xPos < 0 ? 0.28 : -0.28;
        const lightBar = new THREE.Mesh(
          new THREE.BoxGeometry(0.06, 2.2, 0.02),
          lightBarGlowMat
        );
        lightBar.position.set(inwardFaceX, 0, 0);
        columnGroup.add(lightBar);

        const columnLight = new THREE.PointLight(0xffbe6b, 0.9, 4.5, 1.8);
        columnLight.position.set(xPos + (xPos < 0 ? 0.35 : -0.35), 1.7, zPos);
        this.interiorLightGroup.add(columnLight);

        corridorGroup.add(columnGroup);

        const planterGroup = this.createPottedPlanter();
        planterGroup.position.set(xPos < 0 ? -1.65 : 1.65, 0, zPos + 0.9);
        corridorGroup.add(planterGroup);
      });
    });

    const wallMat = new THREE.MeshStandardMaterial({
      color: 0x171513,
      roughness: 0.8,
      metalness: 0.1,
    });

    const leftWall = new THREE.Mesh(new THREE.BoxGeometry(0.2, 3.4, 24), wallMat);
    leftWall.position.set(-2.5, 1.7, -10);
    corridorGroup.add(leftWall);

    const rightWall = new THREE.Mesh(new THREE.BoxGeometry(0.2, 3.4, 24), wallMat);
    rightWall.position.set(2.5, 1.7, -10);
    corridorGroup.add(rightWall);

    const backWallGroup = new THREE.Group();
    backWallGroup.position.set(0, 1.7, -22.5);

    const featureWallTex = createFeatureWallSignTexture();
    const backWallMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(5.2, 3.4),
      new THREE.MeshStandardMaterial({
        map: featureWallTex,
        roughness: 0.3,
        metalness: 0.4,
        emissive: new THREE.Color(0x3a2e14),
        emissiveIntensity: 0.45,
      })
    );
    backWallGroup.add(backWallMesh);

    const backWallLight = new THREE.PointLight(0xffd578, 2.2, 8, 1.5);
    backWallLight.position.set(0, 2.2, -21.8);
    this.interiorLightGroup.add(backWallLight);

    const counterGeo = new THREE.BoxGeometry(3.2, 1.05, 0.75);
    const counterMat = new THREE.MeshPhysicalMaterial({
      color: 0x161311,
      roughness: 0.25,
      metalness: 0.4,
      clearcoat: 0.6,
    });
    const counter = new THREE.Mesh(counterGeo, counterMat);
    counter.position.set(0, -1.15, 1.2);
    backWallGroup.add(counter);

    const counterTrim = new THREE.Mesh(new THREE.BoxGeometry(3.24, 0.04, 0.77), brassCapMat);
    counterTrim.position.set(0, -0.61, 1.2);
    backWallGroup.add(counterTrim);

    corridorGroup.add(backWallGroup);

    this.buildDiningTables(corridorGroup);

    this.scene.add(corridorGroup);
  }

  createPottedPlanter() {
    const group = new THREE.Group();

    const potGeo = new THREE.CylinderGeometry(0.18, 0.14, 0.55, 16);
    const potMat = new THREE.MeshStandardMaterial({
      color: 0x111214,
      roughness: 0.4,
      metalness: 0.3,
    });
    const pot = new THREE.Mesh(potGeo, potMat);
    pot.position.y = 0.275;
    pot.castShadow = true;
    group.add(pot);

    const goldBand = new THREE.Mesh(
      new THREE.CylinderGeometry(0.185, 0.185, 0.05, 16),
      new THREE.MeshPhysicalMaterial({ color: 0xd4af37, metalness: 0.9, roughness: 0.2 })
    );
    goldBand.position.y = 0.52;
    group.add(goldBand);

    const leafMat = new THREE.MeshStandardMaterial({
      color: 0x193b22,
      roughness: 0.6,
      metalness: 0.1,
    });

    for (let i = 0; i < 7; i++) {
      const angle = (i / 7) * Math.PI * 2;
      const leafGeo = new THREE.SphereGeometry(0.18, 8, 8);
      leafGeo.scale(0.35, 1.4, 0.15);
      const leaf = new THREE.Mesh(leafGeo, leafMat);
      leaf.position.set(Math.cos(angle) * 0.14, 0.85 + (i % 3) * 0.1, Math.sin(angle) * 0.14);
      leaf.rotation.set((Math.random() - 0.5) * 0.4, angle, 0.35);
      group.add(leaf);
    }

    return group;
  }

  buildDiningTables(parent) {
    const tableGroup = new THREE.Group();
    const woodTexture = createWoodGrainTexture();

    const tableMat = new THREE.MeshStandardMaterial({
      color: 0x1c1712,
      map: woodTexture,
      roughness: 0.35,
    });

    const linenMat = new THREE.MeshStandardMaterial({
      color: 0xf5f2ec,
      roughness: 0.8,
    });

    const candleGlowMat = new THREE.MeshBasicMaterial({ color: 0xffd985 });

    const tableZ = [-8, -14];
    tableZ.forEach((z) => {
      [-3.2, 3.2].forEach((x) => {
        const table = new THREE.Group();
        table.position.set(x, 0, z);

        const top = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.65, 0.05, 24), tableMat);
        top.position.y = 0.74;
        table.add(top);

        const runner = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.055, 24), linenMat);
        runner.position.y = 0.745;
        table.add(runner);

        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.18, 0.74, 16), tableMat);
        leg.position.y = 0.37;
        table.add(leg);

        const candleBase = new THREE.Mesh(
          new THREE.CylinderGeometry(0.04, 0.04, 0.08, 12),
          new THREE.MeshPhysicalMaterial({ color: 0xd4af37, metalness: 0.9, roughness: 0.2 })
        );
        candleBase.position.y = 0.81;
        table.add(candleBase);

        const flame = new THREE.Mesh(new THREE.SphereGeometry(0.018, 8, 8), candleGlowMat);
        flame.position.y = 0.88;
        table.add(flame);

        const candleLight = new THREE.PointLight(0xffb74d, 0.6, 2.5, 2);
        candleLight.position.set(x, 0.9, z);
        this.interiorLightGroup.add(candleLight);

        tableGroup.add(table);
      });
    });

    parent.add(tableGroup);
  }

  setScrollProgress(progress) {
    this.targetScrollProgress = Math.min(Math.max(progress, 0), 1);
  }

  setPointer(x, y) {
    this.targetMouseX = x;
    this.targetMouseY = y;
  }

  handlePointerMove(e) {
    const ndcX = (e.clientX / window.innerWidth) * 2 - 1;
    const ndcY = -(e.clientY / window.innerHeight) * 2 + 1;
    this.setPointer(ndcX, ndcY);
  }

  handleResize() {
    if (!this.canvas || this.isDisposed) return;
    const width = this.canvas.clientWidth;
    const height = this.canvas.clientHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(width, height, false);
  }

  tick() {
    if (this.isDisposed) return;

    const delta = this.clock.getDelta();

    this.scrollProgress = THREE.MathUtils.damp(
      this.scrollProgress,
      this.targetScrollProgress,
      9.0,
      delta
    );

    this.mouseX = THREE.MathUtils.damp(this.mouseX, this.targetMouseX, 4.0, delta);
    this.mouseY = THREE.MathUtils.damp(this.mouseY, this.targetMouseY, 4.0, delta);

    const p = this.scrollProgress;

    const doorT = THREE.MathUtils.smoothstep(p, 0.12, 0.48);
    const maxDoorAngle = Math.PI * 0.58;

    this.leftDoorHinge.rotation.y = -doorT * maxDoorAngle;
    this.rightDoorHinge.rotation.y = doorT * maxDoorAngle;

    const lightReveal = THREE.MathUtils.smoothstep(p, 0.1, 0.55);
    this.thresholdLight.intensity = THREE.MathUtils.lerp(0.8, 2.4, lightReveal);
    this.thresholdLight.position.z = THREE.MathUtils.lerp(0.5, -1.0, lightReveal);

    let camZ;
    if (p <= 0.3) {
      const subT = THREE.MathUtils.smoothstep(p, 0, 0.3);
      camZ = THREE.MathUtils.lerp(5.8, 4.2, subT);
    } else if (p <= 0.6) {
      const subT = THREE.MathUtils.smoothstep(p, 0.3, 0.6);
      camZ = THREE.MathUtils.lerp(4.2, 0.0, subT);
    } else {
      const subT = THREE.MathUtils.smoothstep(p, 0.6, 1.0);
      camZ = THREE.MathUtils.lerp(0.0, -9.2, subT);
    }

    const camY = 1.65 + Math.sin(this.clock.elapsedTime * 1.2) * 0.008;
    const parallaxX = this.mouseX * 0.28;
    const parallaxY = this.mouseY * 0.14;

    this.camera.position.set(parallaxX, camY + parallaxY, camZ);

    const lookAheadZ = Math.min(camZ - 4.5, -20.0);
    this.camera.lookAt(parallaxX * 0.3, 1.65, lookAheadZ);

    this.renderer.render(this.scene, this.camera);

    this.animationFrameId = requestAnimationFrame(this.tick);
  }

  dispose() {
    this.isDisposed = true;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }

    window.removeEventListener('resize', this.handleResize);
    window.removeEventListener('pointermove', this.handlePointerMove);

    this.scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry?.dispose();
        if (Array.isArray(obj.material)) {
          obj.material.forEach((m) => m.dispose());
        } else {
          obj.material?.dispose();
        }
      }
    });

    this.renderer.dispose();
  }
}
