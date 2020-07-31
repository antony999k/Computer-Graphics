let renderer = null,
    scene = null,
    camera = null;

let game = null;
let level = null;
let player = null;
let hud = null;

let root = null;
let playerGroup = null;

let duration = 1000; // ms
let currentTime = Date.now();

let loader2 = new THREE.FBXLoader();

function main(canvas) {
    /****************************************************************************
     * Scene
     */
    renderer = new THREE.WebGLRenderer({
        canvas: canvas,
        antialias: true
    });
    // Set the viewport size
    renderer.setSize(canvas.width, canvas.height);
    // Create a new Three.js scene
    scene = new THREE.Scene();
    // Set the background color 
    scene.background = new THREE.Color("rgb(224,248,249)");
    // scene.background = new THREE.Color( "rgb(100, 100, 100)" );

    /****************************************************************************
     * Camera
     */
    // Add  a camera so we can view the scene
    //PerspectiveCamera( fov : Number, aspect : Number, near : Number, far : Number )
    camera = new THREE.PerspectiveCamera(45, canvas.width / canvas.height, 0.5, 4000);
    //camera = new THREE.OrthographicCamera( canvas.width / - 2, canvas.width / 2, canvas.height / 2, canvas.height / - 2, 0.5, 2000 );
    camera.position.set(3, 4, 8);
    camera.rotation.x = -0.4;
    camera.rotation.y = 0.0;
    scene.add(camera);

    /****************************************************************************
     * Light
     */
    // Add a directional light to show off the objects
    let light = new THREE.DirectionalLight(0xffffff, 2.0);
    // let light = new THREE.DirectionalLight( "rgb(255, 255, 100)", 1.5);

    // Position the light out from the scene, pointing at the origin
    light.position.set(1, 3, 0);
    light.target.position.set(0, 0, 0);
    scene.add(light);

    // This light globally illuminates all objects in the scene equally.
    // Cannot cast shadows
    let ambientLight = new THREE.AmbientLight(0xffccaa, 0.5);
    scene.add(ambientLight);

    /****************************************************************************
     * Game
     */
    // Create a group to hold all the objects
    root = new THREE.Object3D;
    game = new Game();
    hud = new HUD();
    let deepClone = JSON.parse(JSON.stringify(game.levelsData[game.level]));
    game.levelObj = new Level(deepClone);
    player = new Player();

    // Now add the group to our scene
    scene.add(root);

    /****************************************************************************
     * Events
     */
    // add mouse handling so we can rotate the scene
    gameEvents(game, game.levelObj, player, hud);
    /****************************************************************************
     * Run the loop
     */
    run();
}

function _update() {
    let now = Date.now();
    let deltat = now - currentTime;
    currentTime = now;
    let fract = deltat / duration;

    game.update();
    //if (level) level.update();
    player.update(deltat);
    /*
        if (dancers.length > 0) {
            for (dancer_i of dancers)
                dancer_i.mixer.update((deltat) * 0.001);
        }
    */
}

function run() {
    requestAnimationFrame(() => run());
    // Render the scene
    renderer.render(scene, camera);

    _update();
    // Update the animations
    TWEEN.update();
}

class Game {
    constructor() {
        if (!!Game.instance) return Game.instance;
        Game.instance = this;
        this.loaded = false;
        this.state = "start";
        this.playing = false;
        this.level = 0;
        this.levelObj = null;
        this.commands = []
        this.levelsData = [{
                level: "se",
                buttons: {
                    DragFront: 2,
                    DragLeft: 0,
                    DragRight: 0
                }
            },
            {
                level: "sflfrffre",
                buttons: {
                    DragFront: 5,
                    DragLeft: 2,
                    DragRight: 2
                }
            },
        ]
        this.ambienAudio = document.createElement("audio");
        this.ambienAudio.src = "src/bg.mp3";
        //this.ambienAudio.volume = 0.25;
        this.ambienAudio.volume = 0.0;
        return this;
    }

    update() {
        if(this.levelObj) this.levelObj.update();
        // If player and level exist and loaded is equal to false
        if (game.levelObj && player && !this.loaded) {
            if (game.levelObj.loaded && player.loaded) {
                this.loaded = true;
            }
        }

        if (this.state == "start") {
            // Check if all the assets are loaded
            if (this.loaded) {
                hud.startButton();
            }
        } else if (this.state == "game") {
            if (!player.inAction && this.playing) {
                if (this.commands.length <= 0) {
                    this.playing = false;
                    //hud.togglePlayBtn(false);
                    //Collision detenction
                    game.levelObj.tiles.forEach(tile => {
                        if (tile.boxColider && player.boxColider) {
                            this.state = tile.boxColider.intersectsBox(player.boxColider) ? 'win' : 'lose';
                        }
                    });

                    return;
                }
                let actualCommand = this.commands.shift()
                switch (actualCommand) {
                    case 'DragFront':
                        player.isFrontTween = true;
                        break;
                    case 'DragLeft':
                        player.isLeftTween = true;
                        break;
                    case 'DragRight':
                        player.isRightTween = true;
                        break;
                    default:
                        break;
                }
                player.playTweenAnimation()
            }
        } else if (this.state == "win") {
            //Make the animation, then 
            console.log("win");
            hud.toggleLevelComplete(true);

        } else if (this.state == "lose") {
            console.log("lose");
        } else if (this.state == "changeLevel") {
            console.log("changeLevel");
            if (this.loaded) this.playLevel()
        }
    }

    togglePlaySound() {
        if (this.ambienAudio.paused) {
            this.ambienAudio.play();
            return true;
        } else {
            this.ambienAudio.pause();
            return false;
        }
    }

    playLevel() {
        this.state = "game";
        if (this.ambienAudio.paused) this.togglePlaySound();
        game.levelObj.show();
        player.show();
        hud.toggleDragAndDrop(true)
    }

    playTurn() {
        this.playing = true;
        hud.togglePlayBtn(true)
        //playAnimations()
        //player.playTweenAnimation()
    }

    resetLevel() {
        this.playing = false;
        this.state = "game";
        this.commands = []

        player.reset();
        hud.toggleLevelComplete(false);
        hud.setHudDraggables();
    }

    nextLevel() {
        // Change game states
        this.state = "changeLevel";
        this.loaded = false;
        //Remove old elements
        game.levelObj.delete();
        game.levelObj = null;
        // Update
        this.level++;
        hud.toggleLevelComplete(false);
        player.reset();
        // Create
        console.log(game.levelObj)
        let deepClone = JSON.parse(JSON.stringify(this.levelsData[this.level]));
        game.levelObj = new Level(deepClone);
    }
}

class Level {
    constructor(levelData) {
        // s: start, f: front, e:end
        this.loaded = false;
        this.win = false;
        // Level struct
        this.level = levelData.level;
        this.buttons = levelData.buttons;
        this.tiles = []
        this.setTiles()
        return this;
    }

    update() {
        // Check if tiles loaded
        if (this.tiles.length > 0 && !this.loaded) {
            if (this.tiles.every(this.isTileLoad)){
                hud.setHudDraggables();
                this.loaded = true;
            }
        }

        // Update all tiles
        if (this.loaded) {
            this.tiles.forEach(tile => {
                tile.update();
            });
        }
    }

    isTileLoad(tile) {
        return (tile.loaded)
    }

    setTiles() {
        let pos = {
            x: 0,
            y: 0,
            z: 0
        }
        let dir = 0 // (0) foward - x+, (1) left - z-, (2) right - z+, (3) backward - x-,
        for (let i = 0; i < this.level.length; i++) {
            let tileType = this.level[i];

            if (tileType == 's') {
                let tile = new Tile({
                    x: pos.x,
                    y: pos.y,
                    z: pos.z
                }, tileType);
                this.tiles.push(tile);
            } else if (tileType == 'f' || tileType == 'e') {
                let offset = {
                    x: 0,
                    y: 0,
                    z: 0
                }

                if (dir == 0) offset.x = 1;
                else if (dir == 1) offset.z = -1;
                else if (dir == 2) offset.x = -1;
                else if (dir == 3) offset.z = 1;

                pos.x += offset.x;
                pos.z += offset.z;
                let tile = new Tile({
                    x: pos.x,
                    y: pos.y,
                    z: pos.z
                }, tileType);
                this.tiles.push(tile);
            } else if (tileType == 'l') {
                dir = (dir + 1) % 4

            } else if (tileType == 'r') {
                dir--;
                if (dir < 0) dir = 3;
            }

            if (tileType == 'e') return;
        }
    }

    show() {
        if (this.loaded) {
            this.tiles.forEach(tile => {
                root.add(tile.obj);
                if (tile.boxColiderH) scene.add(tile.boxColiderH);
            });
        }
    }

    //with actual level values
    removeBtn(id) {
        console.log(this)
        this.buttons[id] -= 1;
        hud.updateDraggable(id, this.buttons[id]);
    }

    delete() {
        if (this.loaded) {
            this.tiles.forEach(tile => {
                root.remove(tile.obj)
                if (tile.boxColiderH) scene.remove(tile.boxColiderH);
                tile.material.dispose();
            });
            delete this.level;
            delete this.buttons;
            this.tiles = []
        } else {
            return false
        }
    }

}

class Tile {
    constructor(pos, type) {
        // General
        this.loaded = false;
        this.type = type;
        //Resources
        this.resourceUrl = 'src/tileB.fbx';
        this.material = new THREE.MeshStandardMaterial({
            color: 0xffffff
        });
        this.obj = null;
        this.loader = new THREE.FBXLoader();
        this.loader.load(
            // resource URL
            this.resourceUrl,
            // called when the resource is loaded
            (tileObj) => this.updloadSuccess(tileObj, pos),
            // called while loading is progressing
            (xhr) => this.uploadProcessing(xhr),
            // called when loading has errors
            (error) => this.uploadError(error)
        );
        // Collider (Only e tile use collider)
        this.boxColider = null; // Box 3 - Represents an axis-aligned bounding box
        this.boxColiderH = null; // Helper object to visualize a Box3
        return this;
    }

    update() {
        if (player.action != "idle" && this.boxColider && this.boxColiderH) {
            this.boxColider = new THREE.Box3().setFromObject(this.obj);
        }

        if (this.boxColider) {
            let newBounds = this.obj.children[0].geometry.boundingBox;
            newBounds.max.z = 1
            this.boxColider.copy(newBounds).applyMatrix4(this.obj.children[0].matrixWorld);
        }
    }

    updloadSuccess(tileObj, pos) {
        tileObj.children[0].material = this.material;
        tileObj.scale.set(0.01, 0.01, 0.01);
        tileObj.position.set(pos.x, pos.y, pos.z)
        this.obj = tileObj;
        // Add collider
        if (this.type == 'e') {
            this.obj.children[0].geometry.computeBoundingBox();
            this.boxColider = new THREE.Box3();
            //this.boxColider = new THREE.Box3().setFromObject(this.obj);
            this.boxColiderH = new THREE.Box3Helper(this.boxColider, 0x22ff00);
        }
        this.loaded = true;
    }

    uploadProcessing(xhr) {
        console.log((xhr.loaded / xhr.total * 100) + '% loaded tile');
    }

    uploadError(error) {
        console.log('An error happened');
        console.log(error)
    }
}

class Player {
    constructor() {
        // General
        this.loaded = false;
        this.inAction = false;
        this.action = 'idle'
        this.obj = null;
        //Resources
        this.resourceUrl = 'src/robot.fbx';
        this.textureUrl = 'src/robotTexture.png';
        this.texture = new THREE.TextureLoader().load(this.textureUrl);
        this.textureEm = new THREE.TextureLoader().load('src/robotEmissive.png');
        this.material = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            map: this.texture,
            emissive: 0xffffff,
            emissiveMap: this.textureEm
        });
        playerGroup = new THREE.Object3D;
        // Animation
        this.actionAnim = null;
        //Tween durations
        this.durationTween = 1.5; // sec
        //Front anim
        this.frontTween = null;
        this.isFrontTween = false;
        // LeftAnim
        this.leftTween = null;
        this.isLeftTween = false;
        // RightAnim
        this.rightTween = null;
        this.isRightTween = false;
        // Raycaster( origin, direction, near, far )
        this.raycaster = new THREE.Raycaster(playerGroup.position, new THREE.Vector3(0, -1, 0), 0, 10);
        // Collider
        this.boxColider = null; // Box 3 - Represents an axis-aligned bounding box
        this.boxColiderH = null; // Helper object to visualize a Box3
        // Loader
        this.loader = new THREE.FBXLoader();
        this.loader.load(
            // resource URL
            this.resourceUrl,
            // called when the resource is loaded
            (robotObj) => this.updloadSuccess(robotObj),
            // called while loading is progressing
            (xhr) => this.uploadProcessing(xhr),
            // called when loading has errors
            (error) => this.uploadError(error)
        );
    }

    update(deltat) {
        if (this.loaded) {
            // Rig animation 
            if (this.obj.mixer != null) this.obj.mixer.update((deltat) * 0.001);

            // Ad gravity to player
            if (this.action == "fall") {
                playerGroup.position.y -= 0.005 * deltat;
                if (playerGroup.position.y <= -15) this.action = "idle" //Avoid inifinite falling
            }

            // Update the box collider
            if (this.action != 'idle' && this.action != 'fall' && this.boxColider) {
                this.boxColider = new THREE.Box3().setFromObject(this.obj);
                if (this.boxColiderH) this.boxColiderH.update();
            }

            console.log(this.inAction)
        }
    }

    show() {
        playerGroup.add(this.obj);
        if (this.boxColiderH) scene.add(this.boxColiderH);
        root.add(playerGroup);
    }

    reset() {
        this.inAction = false;
        this.action = 'idle'
        if (this.frontTween) this.frontTween.stop()
        if (this.leftTween) this.leftTween.stop()
        if (this.rightTween) this.rightTween.stop()
        playerGroup.position.set(0, 0, 0)
        playerGroup.rotation.set(0, 0, 0)
    }

    updloadSuccess(robotObj) {
        robotObj.children[0].material = this.material;
        robotObj.mixer = new THREE.AnimationMixer(scene);
        robotObj.scale.set(0.01, 0.01, 0.01);
        robotObj.rotation.y = Math.PI / 2;

        if (robotObj.animations.length > 0) {
            this.actionAnim = robotObj.mixer.clipAction(robotObj.animations[0], robotObj);
            this.actionAnim.play();
        }

        this.obj = robotObj;

        // Add collider
        this.boxColider = new THREE.Box3().setFromObject(this.obj);
        //this.boxColiderH = new THREE.Box3Helper( this.boxColider, 0x0022ff ); //BOX3 Helper
        this.boxColiderH = new THREE.BoxHelper(this.obj, 0x22ff00);
        this.boxColiderH.visible = true;
        this.boxColiderH.update();

        //dancers.push(robotObj);
        this.loaded = true;
    }

    uploadProcessing(xhr) {
        console.log((xhr.loaded / xhr.total * 100) + '% loaded');
    }

    uploadError(error) {
        console.log('An error happened');
        console.log(error)
    }

    playTweenAnimation() {
        if (this.inAction) return;
        // Front animation
        if (this.frontTween) this.frontTween.stop(); // override tween animation
        if (this.isFrontTween) {
            let target = new THREE.Vector3(1, 0, 0).applyQuaternion(playerGroup.quaternion)
            this.inAction = true;
            this.action = 'front';
            this.frontTween =
                new TWEEN.Tween(playerGroup.position).to({
                    x: playerGroup.position.x + target.x,
                    y: playerGroup.position.y + target.y,
                    z: playerGroup.position.z + target.z
                }, this.durationTween * 1000)
                .interpolation(TWEEN.Interpolation.Linear)
                .delay(0)
                .easing(TWEEN.Easing.Quadratic.InOut)
                .repeat(0)
                .start()
                .onComplete(() => {
                    this.isFrontTween = false;
                    this.inAction = false;
                    this.action = 'idle';
                    this.checkFloor();
                })
        }

        if (this.leftTween) this.leftTween.stop(); // override tween animation
        if (this.isLeftTween) {
            this.inAction = true;
            this.action = 'left';
            this.leftTween =
                new TWEEN.Tween(playerGroup.rotation).to({
                    y: playerGroup.rotation.y + Math.PI / 2
                }, this.durationTween * 1000)
                .interpolation(TWEEN.Interpolation.Linear)
                .delay(0)
                .easing(TWEEN.Easing.Quadratic.InOut)
                .repeat(0)
                .start()
                .onComplete(() => {
                    this.isLeftTween = false;
                    this.inAction = false;
                    this.action = 'idle';
                })
        }

        if (this.rightTween) this.rightTween.stop(); // override tween animation
        if (this.isRightTween) {
            this.inAction = true;
            this.action = 'right';
            this.rightTween =
                new TWEEN.Tween(playerGroup.rotation).to({
                    y: playerGroup.rotation.y - Math.PI / 2
                }, this.durationTween * 1000)
                .interpolation(TWEEN.Interpolation.Linear)
                .delay(0)
                .easing(TWEEN.Easing.Quadratic.InOut)
                .repeat(0)
                .start()
                .onComplete(() => {
                    this.isRightTween = false;
                    this.inAction = false;
                    this.action = 'idle';
                })
        }
    }

    checkFloor() {
        console.log("checking floor...");
        let intersects = this.raycaster.intersectObjects(root.children, true, []);
        if (intersects.length <= 0) {
            this.action = "fall"
            game.state = "lose"
        }
    }
}

class HUD {
    constructor() {
        // In game items
        this.dragAndDrop = document.getElementById("dragAndDrop");
        this.draggables = document.getElementById("draggables");
        this.dropzone = document.getElementById("dropzone");
        this.startBtn = document.getElementById("startGame");
        this.playBtn = document.getElementById("playTurn");
        this.levelComplete = document.getElementById("levelComplete");
    }

    toggleDragAndDrop(visible) {
        if (visible) dragAndDrop.style.opacity = 1;
        else dragAndDrop.style.opacity = 0;
    }

    clearDrag() {
        while (this.draggables.firstChild) this.draggables.removeChild(this.draggables.lastChild);
    }

    clearDrop() {
        while (this.dropzone.firstChild) this.dropzone.removeChild(this.dropzone.lastChild);
        this.playBtn.disabled = true;
    }

    // Set and reset the hud draggables relative to game gamelevel data
    setHudDraggables() {
        // this.buttons = game.levelsData[game.level].buttons;
        game.levelObj.buttons = JSON.parse(JSON.stringify(game.levelsData[game.level].buttons));
        this.clearDrop();
        this.clearDrag();

        for (const [key, value] of Object.entries(game.levelsData[game.level].buttons)) {
            //console.log(`${key}: ${value}`);
            if (value > 0) this.appendDragable(key, value)
        }
    }

    // Add html visual draggable
    appendDragable(id, num = 1) {
        let draggable = document.createElement('div');
        draggable.id = id;
        draggable.innerHTML = "Null";
        switch (id) {
            case 'DragFront':
                draggable.innerHTML = "Front";
                break;
            case 'DragLeft':
                draggable.innerHTML = "Left";
                break;
            case 'DragRight':
                draggable.innerHTML = "Right";
                break;
            default:
                break;
        }

        draggable.className = 'draggable';
        draggable.draggable = true;
        // Start drag events
        draggable.addEventListener("dragstart", event => onDragStart(event));

        if (num > 0) {
            let number = document.createElement('span');
            number.innerHTML = num;
            number.className = 'number';
            draggable.appendChild(number)
        } else {
            draggable.draggable = false;
            draggable.classList.add("disabled");
        }
        this.draggables.appendChild(draggable);
    }

    updateDraggable(id, num) {
        let draggable = document.getElementById(id);
        if (!draggable) return;

        for (var i = 0; i < draggable.childNodes.length; i++) {
            if (draggable.childNodes[i].className == "number") {
                if (num > 0) {
                    draggable.childNodes[i].innerHTML = num
                } else {
                    draggable.draggable = false;
                    draggable.classList.add("disabled");
                    draggable.removeChild(draggable.childNodes[i])
                }
                break;
            }
        }
    }

    toggleLevelComplete(visible) {
        if (visible) this.levelComplete.style.display = "block";
        else this.levelComplete.style.display = "none";
    }

    togglePlayBtn(disable) {
        if (disable) this.playBtn.disabled = true;
        else this.playBtn.disabled = false;
    }

    startButton() {
        this.startBtn.disabled = false;
        this.startBtn.innerHTML = 'Start Game'
    }
}