import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';

// Scene setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

// Controls
const orbitControls = new OrbitControls(camera, renderer.domElement);
const walkControls = new PointerLockControls(camera, document.body);

// Lighting
const ambientLight = new THREE.AmbientLight(0x404040);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(5, 5, 5);
directionalLight.castShadow = true;
scene.add(directionalLight);

// Ground
const groundGeometry = new THREE.PlaneGeometry(100, 100);
const groundMaterial = new THREE.MeshStandardMaterial({ color: 0x808080 });
const ground = new THREE.Mesh(groundGeometry, groundMaterial);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

// Initialize camera position
camera.position.set(5, 5, 5);
camera.lookAt(0, 0, 0);

// Store all objects for interaction
const objects = [];

// Building parts creation functions
window.addBuildingPart = function(type) {
    let object;
    
    switch(type) {
        case 'wall':
            const wallGeometry = new THREE.BoxGeometry(2, 3, 0.2);
            const wallMaterial = new THREE.MeshStandardMaterial({ color: 0xcccccc });
            object = new THREE.Mesh(wallGeometry, wallMaterial);
            break;
            
        case 'floor':
            const floorGeometry = new THREE.BoxGeometry(4, 0.2, 4);
            const floorMaterial = new THREE.MeshStandardMaterial({ color: 0x808080 });
            object = new THREE.Mesh(floorGeometry, floorMaterial);
            break;
            
        case 'roof':
            const roofGeometry = new THREE.ConeGeometry(3, 2, 4);
            const roofMaterial = new THREE.MeshStandardMaterial({ color: 0x8b4513 });
            object = new THREE.Mesh(roofGeometry, roofMaterial);
            break;
            
        case 'door':
            const doorGeometry = new THREE.BoxGeometry(1, 2, 0.1);
            const doorMaterial = new THREE.MeshStandardMaterial({ color: 0x4a3c2b });
            object = new THREE.Mesh(doorGeometry, doorMaterial);
            break;
            
        case 'window':
            const windowGeometry = new THREE.BoxGeometry(1, 1, 0.1);
            const windowMaterial = new THREE.MeshStandardMaterial({ 
                color: 0x87ceeb,
                transparent: true,
                opacity: 0.6
            });
            object = new THREE.Mesh(windowGeometry, windowMaterial);
            break;
    }

    if (object) {
        object.position.set(0, object.geometry.parameters.height / 2, 0);
        object.castShadow = true;
        object.receiveShadow = true;
        object.userData.type = type;
        scene.add(object);
        objects.push(object);
    }
};

// Environment objects
window.addEnvironment = function(type) {
    let object;

    switch(type) {
        case 'tree':
            const treeGroup = new THREE.Group();
            
            // Trunk
            const trunkGeometry = new THREE.CylinderGeometry(0.2, 0.3, 2, 8);
            const trunkMaterial = new THREE.MeshStandardMaterial({ color: 0x4a3c2b });
            const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
            
            // Leaves
            const leavesGeometry = new THREE.ConeGeometry(1.5, 3, 8);
            const leavesMaterial = new THREE.MeshStandardMaterial({ color: 0x228b22 });
            const leaves = new THREE.Mesh(leavesGeometry, leavesMaterial);
            leaves.position.y = 2.5;
            
            treeGroup.add(trunk, leaves);
            object = treeGroup;
            break;
            
        // Add other environment objects here
    }

    if (object) {
        object.position.set(
            (Math.random() - 0.5) * 20,
            0,
            (Math.random() - 0.5) * 20
        );
        object.castShadow = true;
        object.receiveShadow = true;
        object.userData.type = type;
        scene.add(object);
        objects.push(object);
    }
};

// Navigation mode toggle
let isWalkMode = false;
window.toggleNavigationMode = function() {
    isWalkMode = !isWalkMode;
    if (isWalkMode) {
        walkControls.lock();
        orbitControls.enabled = false;
    } else {
        walkControls.unlock();
        orbitControls.enabled = true;
    }
};

// Zoom camera function
window.zoomCamera = function(direction) {
    const zoomSpeed = 2;
    const minDistance = 2;
    const maxDistance = 50;
    
    if (direction === 'in') {
        // Move camera closer
        const newPosition = camera.position.clone();
        newPosition.multiplyScalar(1 / zoomSpeed);
        if (newPosition.length() >= minDistance) {
            camera.position.copy(newPosition);
        }
    } else if (direction === 'out') {
        // Move camera farther
        const newPosition = camera.position.clone();
        newPosition.multiplyScalar(zoomSpeed);
        if (newPosition.length() <= maxDistance) {
            camera.position.copy(newPosition);
        }
    }
    
    // Update orbit controls target
    camera.lookAt(orbitControls.target);
};

// Animation loop
function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
}

animate();

// Handle window resize
window.addEventListener('resize', onWindowResize, false);

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
} 