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

// Raycaster for object selection
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let selectedObject = null;
let isDragging = false;
const dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const intersectionPoint = new THREE.Vector3();
const offset = new THREE.Vector3();

// Controls
const orbitControls = new OrbitControls(camera, renderer.domElement);
const walkControls = new PointerLockControls(camera, document.body);

// Event listeners for object interaction
renderer.domElement.addEventListener('mousedown', onMouseDown);
renderer.domElement.addEventListener('mousemove', onMouseMove);
renderer.domElement.addEventListener('mouseup', onMouseUp);
window.addEventListener('keydown', onKeyDown);

function onMouseDown(event) {
    if (isWalkMode) return;

    // Calculate mouse position in normalized device coordinates (-1 to +1)
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    // Update the picking ray with the camera and mouse position
    raycaster.setFromCamera(mouse, camera);

    // Calculate objects intersecting the picking ray
    const intersects = raycaster.intersectObjects(objects, true);

    if (intersects.length > 0) {
        orbitControls.enabled = false;
        isDragging = true;
        
        // Find the top-level parent in case we clicked a child object
        selectedObject = intersects[0].object;
        while(selectedObject.parent && selectedObject.parent !== scene) {
            selectedObject = selectedObject.parent;
        }

        // Calculate the offset
        const intersectionPoint = intersects[0].point;
        offset.copy(intersectionPoint).sub(selectedObject.position);

        // Create context menu on right click
        if (event.button === 2) {
            event.preventDefault();
            showContextMenu(event.clientX, event.clientY);
        }
    } else {
        selectedObject = null;
        hideContextMenu();
    }
}

function onMouseMove(event) {
    if (!isDragging || !selectedObject || isWalkMode) return;

    // Update mouse position
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    // Update the picking ray with the camera and mouse position
    raycaster.setFromCamera(mouse, camera);

    // Calculate the intersection point with the drag plane
    if (raycaster.ray.intersectPlane(dragPlane, intersectionPoint)) {
        // Move the object while preserving its original height
        const currentY = selectedObject.position.y;
        selectedObject.position.copy(intersectionPoint.sub(offset));
        selectedObject.position.y = currentY; // Restore the original height
        
        // Update status bar with coordinates
        updateCoordinates();
    }
}

function onMouseUp() {
    isDragging = false;
    orbitControls.enabled = true;
}

function onKeyDown(event) {
    if (event.key === 'Delete' && selectedObject) {
        removeSelectedObject();
    }
}

// Remove selected object
window.removeSelectedObject = function() {
    if (selectedObject) {
        const index = objects.indexOf(selectedObject);
        if (index > -1) {
            objects.splice(index, 1);
        }
        scene.remove(selectedObject);
        selectedObject = null;
        hideContextMenu();
    }
};

// Duplicate selected object
window.duplicateSelectedObject = function() {
    if (!selectedObject) return;

    let newObject;
    const type = selectedObject.userData.type;

    // Clone based on object type
    if (type === 'wall' || type === 'floor' || type === 'roof' || type === 'door' || type === 'window') {
        newObject = window.addBuildingPart(type);
    } else if (type === 'painting-frame' || type === 'pedestal' || type === 'spotlight' || type === 'bench') {
        newObject = window.addGalleryItem(type);
    } else if (type === 'tree' || type === 'grass' || type === 'rock' || type === 'water' || type === 'light') {
        newObject = window.addEnvironment(type);
    }

    if (newObject) {
        // Position slightly offset from the original
        newObject.position.copy(selectedObject.position);
        newObject.position.x += 1;
        newObject.position.z += 1;
        
        // Copy rotation
        newObject.rotation.copy(selectedObject.rotation);
        
        // Copy scale
        newObject.scale.copy(selectedObject.scale);
        
        // Select the new object
        selectedObject = newObject;
        updateCoordinates();
    }
    
    hideContextMenu();
};

// Context menu
function showContextMenu(x, y) {
    const contextMenu = document.querySelector('.context-menu');
    if (!contextMenu) return;
    
    contextMenu.style.display = 'block';
    contextMenu.style.left = x + 'px';
    contextMenu.style.top = y + 'px';
}

function hideContextMenu() {
    const contextMenu = document.querySelector('.context-menu');
    if (contextMenu) {
        contextMenu.style.display = 'none';
    }
}

// Update coordinates in status bar
function updateCoordinates() {
    const coords = document.getElementById('coordinates');
    if (selectedObject) {
        coords.textContent = `X: ${selectedObject.position.x.toFixed(2)} Y: ${selectedObject.position.y.toFixed(2)} Z: ${selectedObject.position.z.toFixed(2)}`;
    }
}

// Prevent context menu from showing on right click
renderer.domElement.addEventListener('contextmenu', (event) => event.preventDefault());

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
        object.position.y = object.geometry.parameters.height / 2;
        object.castShadow = true;
        object.receiveShadow = true;
        object.userData.type = type;
        scene.add(object);
        objects.push(object);
        return object;
    }
};

// Gallery items creation function
window.addGalleryItem = function(type) {
    let object;

    switch(type) {
        case 'painting-frame':
            const frame = new THREE.Group();
            
            // Frame border
            const borderMaterial = new THREE.MeshStandardMaterial({ 
                color: 0x4a3c2b,
                roughness: 0.5,
                metalness: 0.3
            });
            
            // Top and bottom
            const horizontalGeometry = new THREE.BoxGeometry(2, 0.1, 0.1);
            const topBorder = new THREE.Mesh(horizontalGeometry, borderMaterial);
            const bottomBorder = new THREE.Mesh(horizontalGeometry, borderMaterial);
            topBorder.position.y = 1.5;
            bottomBorder.position.y = -1.5;
            
            // Left and right
            const verticalGeometry = new THREE.BoxGeometry(0.1, 3, 0.1);
            const leftBorder = new THREE.Mesh(verticalGeometry, borderMaterial);
            const rightBorder = new THREE.Mesh(verticalGeometry, borderMaterial);
            leftBorder.position.x = -1;
            rightBorder.position.x = 1;
            
            // Canvas
            const canvasGeometry = new THREE.PlaneGeometry(1.9, 2.9);
            const canvasMaterial = new THREE.MeshStandardMaterial({
                color: 0xffffff,
                roughness: 0.9,
                metalness: 0.1
            });
            const canvas = new THREE.Mesh(canvasGeometry, canvasMaterial);
            canvas.position.z = -0.05;
            
            frame.add(topBorder, bottomBorder, leftBorder, rightBorder, canvas);
            object = frame;
            break;

        case 'pedestal':
            const pedestalGroup = new THREE.Group();
            
            // Base
            const baseGeometry = new THREE.BoxGeometry(1, 0.2, 1);
            const baseMaterial = new THREE.MeshStandardMaterial({
                color: 0xcccccc,
                roughness: 0.2,
                metalness: 0.8
            });
            const base = new THREE.Mesh(baseGeometry, baseMaterial);
            
            // Column
            const columnGeometry = new THREE.BoxGeometry(0.6, 1.2, 0.6);
            const column = new THREE.Mesh(columnGeometry, baseMaterial);
            column.position.y = 0.7;
            
            // Top
            const topGeometry = new THREE.BoxGeometry(0.8, 0.1, 0.8);
            const top = new THREE.Mesh(topGeometry, baseMaterial);
            top.position.y = 1.35;
            
            pedestalGroup.add(base, column, top);
            object = pedestalGroup;
            break;

        case 'spotlight':
            const spotlightGroup = new THREE.Group();
            
            // Light housing
            const housingGeometry = new THREE.CylinderGeometry(0.2, 0.3, 0.4, 32);
            const housingMaterial = new THREE.MeshStandardMaterial({
                color: 0x333333,
                roughness: 0.5,
                metalness: 0.8
            });
            const housing = new THREE.Mesh(housingGeometry, housingMaterial);
            
            // Light bulb
            const bulbGeometry = new THREE.SphereGeometry(0.1, 16, 16);
            const bulbMaterial = new THREE.MeshBasicMaterial({ color: 0xffffcc });
            const bulb = new THREE.Mesh(bulbGeometry, bulbMaterial);
            bulb.position.y = -0.2;
            
            // Add spotlight
            const light = new THREE.SpotLight(0xffffff, 1);
            light.position.copy(bulb.position);
            light.target.position.y = -1;
            light.angle = Math.PI / 6;
            light.penumbra = 0.2;
            light.castShadow = true;
            
            spotlightGroup.add(housing, bulb, light, light.target);
            object = spotlightGroup;
            break;

        case 'bench':
            const benchGroup = new THREE.Group();
            
            // Seat
            const seatGeometry = new THREE.BoxGeometry(2, 0.1, 0.6);
            const woodMaterial = new THREE.MeshStandardMaterial({
                color: 0x8b4513,
                roughness: 0.8,
                metalness: 0.2
            });
            const seat = new THREE.Mesh(seatGeometry, woodMaterial);
            seat.position.y = 0.4;
            
            // Legs
            const legGeometry = new THREE.BoxGeometry(0.1, 0.8, 0.1);
            const metalMaterial = new THREE.MeshStandardMaterial({
                color: 0x666666,
                roughness: 0.4,
                metalness: 0.8
            });
            
            const positions = [
                [-0.9, 0, -0.25],
                [-0.9, 0, 0.25],
                [0.9, 0, -0.25],
                [0.9, 0, 0.25]
            ];
            
            positions.forEach(pos => {
                const leg = new THREE.Mesh(legGeometry, metalMaterial);
                leg.position.set(pos[0], pos[1], pos[2]);
                benchGroup.add(leg);
            });
            
            benchGroup.add(seat);
            object = benchGroup;
            break;
    }

    if (object) {
        object.position.set(
            (Math.random() - 0.5) * 8,
            type === 'spotlight' ? 3 : 0,
            (Math.random() - 0.5) * 8
        );
        object.castShadow = true;
        object.receiveShadow = true;
        object.userData.type = type;
        scene.add(object);
        objects.push(object);
        return object;
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

        case 'grass':
            const grassGroup = new THREE.Group();
            for(let i = 0; i < 5; i++) {
                const bladeGeometry = new THREE.ConeGeometry(0.1, 0.5, 4);
                const bladeMaterial = new THREE.MeshStandardMaterial({ color: 0x33cc33 });
                const blade = new THREE.Mesh(bladeGeometry, bladeMaterial);
                blade.position.set(
                    (Math.random() - 0.5) * 0.5,
                    0.25,
                    (Math.random() - 0.5) * 0.5
                );
                blade.rotation.y = Math.random() * Math.PI;
                grassGroup.add(blade);
            }
            object = grassGroup;
            break;

        case 'rock':
            const rockGeometry = new THREE.DodecahedronGeometry(0.5);
            const rockMaterial = new THREE.MeshStandardMaterial({ 
                color: 0x808080,
                roughness: 0.8
            });
            object = new THREE.Mesh(rockGeometry, rockMaterial);
            break;

        case 'water':
            const waterGeometry = new THREE.PlaneGeometry(4, 4);
            const waterMaterial = new THREE.MeshStandardMaterial({
                color: 0x0077be,
                transparent: true,
                opacity: 0.6
            });
            object = new THREE.Mesh(waterGeometry, waterMaterial);
            object.rotation.x = -Math.PI / 2;
            break;

        case 'light':
            const lightGroup = new THREE.Group();
            
            // Post
            const postGeometry = new THREE.CylinderGeometry(0.1, 0.1, 3, 8);
            const postMaterial = new THREE.MeshStandardMaterial({ color: 0x333333 });
            const post = new THREE.Mesh(postGeometry, postMaterial);
            
            // Light bulb
            const bulbGeometry = new THREE.SphereGeometry(0.2, 16, 16);
            const bulbMaterial = new THREE.MeshBasicMaterial({ color: 0xffffcc });
            const bulb = new THREE.Mesh(bulbGeometry, bulbMaterial);
            bulb.position.y = 1.5;
            
            // Point light
            const light = new THREE.PointLight(0xffffcc, 1, 10);
            light.position.copy(bulb.position);
            
            lightGroup.add(post, bulb, light);
            object = lightGroup;
            break;
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
        return object;
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
    const maxDistance = 200;
    
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
    
    // Highlight selected object
    objects.forEach(obj => {
        if (obj.material && obj.material.emissive) {
            obj.material.emissive.setHex(obj === selectedObject ? 0x333333 : 0x000000);
        }
    });
    
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