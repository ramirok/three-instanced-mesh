import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { getRandomInt } from "./main";

const initialBoundary = 30;
const lineMaterial = new THREE.LineBasicMaterial({
  color: 0xffffff,
  linewidth: 2,
  transparent: true,
  opacity: 0.5,
});

const geometry = new THREE.BufferGeometry().setFromPoints([
  new THREE.Vector3(-initialBoundary, -initialBoundary, -initialBoundary),
  new THREE.Vector3(initialBoundary, -initialBoundary, -initialBoundary),
  new THREE.Vector3(initialBoundary, -initialBoundary, initialBoundary),
  new THREE.Vector3(-initialBoundary, -initialBoundary, initialBoundary),
  new THREE.Vector3(-initialBoundary, -initialBoundary, -initialBoundary),
]);

const lowerLine = new THREE.Line(geometry, lineMaterial);
const upperLine = lowerLine.clone();
upperLine.position.y = initialBoundary * 2;

const material = new THREE.MeshBasicMaterial();
const baseGeomtry = new THREE.BoxGeometry();
const placeholderObject = new THREE.Object3D();

const colorPink = new THREE.Color(0xdb2777);
const colorBlack = new THREE.Color(0x0a0a0a);

const axis = ["x", "y", "z"] as const;

type CubeUserData = {
  dir: (typeof axis)[number];
  sign: number;
  remainingDistance: number;
  speed: number;
  isWaiting: boolean;
  currentWaitTime: number;
  waitTime: number;
  totalDistance: number;
};

class Scene {
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  renderer = new THREE.WebGLRenderer({ alpha: true });
  clock = new THREE.Clock(true);
  mesh: THREE.InstancedMesh | undefined;
  boundaryLines = new THREE.Group().add(lowerLine, upperLine);
  boundary = initialBoundary;
  cubeStates: CubeUserData[] = [];
  constructor() {
    this.scene.background = null;
    this.camera.position.z = 70;
    this.camera.position.x = -70;
    this.renderer.setPixelRatio(2);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(this.renderer.domElement);
    const observer = new ResizeObserver((entries) => {
      this.renderer.setSize(
        entries[0].target.clientWidth,
        entries[0].target.clientHeight
      );
      this.camera.aspect =
        entries[0].target.clientWidth / entries[0].target.clientHeight;
      this.camera.updateProjectionMatrix();
    });
    observer.observe(document.body);
    new OrbitControls(this.camera, this.renderer.domElement);
    this.scene.add(this.boundaryLines);
  }
  setCubes(size: number) {
    const totalCubes = this.cubeStates.length;
    if (size > totalCubes) {
      if (this.mesh) {
        this.scene.remove(this.mesh);
        this.cubeStates = [];
      }
      this.mesh = new THREE.InstancedMesh(baseGeomtry, material, size);
      this.scene.add(this.mesh);

      for (let i = 0; i < size; i++) {
        placeholderObject.position.x = getRandomInt(
          -this.boundary,
          this.boundary
        );
        placeholderObject.position.y = getRandomInt(
          -this.boundary,
          this.boundary
        );
        placeholderObject.position.z = getRandomInt(
          -this.boundary,
          this.boundary
        );

        placeholderObject.updateMatrix();
        this.mesh.setMatrixAt(i, placeholderObject.matrix);
        this.mesh.setColorAt(i, Math.random() > 0.5 ? colorBlack : colorPink);

        this.cubeStates.push({
          dir: axis[getRandomInt(0, 2)],
          sign: Math.random() > 0.5 ? 1 : -1,
          remainingDistance: 1,
          speed: getRandomInt(1, 5),
          isWaiting: true,
          currentWaitTime: 0,
          waitTime: 0.5,
          totalDistance: 1,
        });
      }

      this.mesh.instanceMatrix.needsUpdate = true;
      if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
    } else {
      if (this.mesh) {
        this.mesh.count = size;
        this.cubeStates.splice(size);
      }
    }
  }

  setBoundary(newBounds: number) {
    const newYScale = newBounds / initialBoundary;
    this.boundary = newBounds;
    this.boundaryLines.scale.set(newYScale, newYScale, newYScale);
  }

  update() {
    if (!this.mesh) {
      return;
    }
    const delta = this.clock.getDelta();
    for (let i = 0; i < this.mesh.count; i++) {
      const cubeState = this.cubeStates[i];
      this.mesh.getMatrixAt(i, placeholderObject.matrix);
      placeholderObject.position.setFromMatrixPosition(
        placeholderObject.matrix
      );
      if (cubeState.isWaiting) {
        cubeState.currentWaitTime += delta;
        if (cubeState.currentWaitTime >= cubeState.waitTime) {
          cubeState.isWaiting = false;
          cubeState.currentWaitTime = 0;

          cubeState.dir = axis[getRandomInt(0, 2)];

          const negativeSpace = Math.round(
            this.boundary - placeholderObject.position[cubeState.dir]
          );
          const positiveSpace = Math.round(
            this.boundary + placeholderObject.position[cubeState.dir]
          );

          if (negativeSpace < cubeState.totalDistance) {
            cubeState.sign = -1;
          } else if (positiveSpace < cubeState.totalDistance) {
            cubeState.sign = 1;
          } else {
            cubeState.sign = Math.random() > 0.5 ? 1 : -1;
          }

          cubeState.remainingDistance = cubeState.totalDistance;
        }
      } else {
        const move = Math.min(
          delta * cubeState.speed,
          cubeState.remainingDistance
        );

        placeholderObject.position[cubeState.dir] += move * cubeState.sign;
        placeholderObject.updateMatrix();
        this.mesh.setMatrixAt(i, placeholderObject.matrix);
        cubeState.remainingDistance -= move;
        if (cubeState.remainingDistance <= 0) {
          cubeState.isWaiting = true;
        }
      }
    }
    this.mesh.instanceMatrix.needsUpdate = true;
  }

  start() {
    this.setCubes(10_000);

    this.renderer.setAnimationLoop(() => {
      this.renderer.render(this.scene, this.camera);
      this.update();
    });
  }
}

export { Scene };
