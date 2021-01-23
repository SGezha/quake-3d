import Player from './Player.js';

export default class Game {

  constructor(canvas, engine, fpsmeter) {
    this.canvas = canvas;
    this.engine = engine;
    this.scene = undefined;
    this.inputMap = {};
    this.player = undefined;
    this.nextHUDUpdate = 0;
    this.speedometerElement = document.getElementById("speedometer");
    this.debugElement = document.getElementById("debug");

    // Register a render loop to repeatedly render the scene
    engine.runRenderLoop(function () {
      if (this.scene) {
        fpsmeter.tickStart();
        this.scene.render();
        fpsmeter.tick();
      }
    }.bind(this));

    // Watch for browser/canvas resize events
    window.addEventListener("resize", function () {
      this.engine.resize();
    }.bind(this));
  }

  setScene(scene) {
    this.scene = scene;
  }

  createScene() {
    // Setup the scene
    var scene = new BABYLON.Scene(this.engine);
    scene.gravity = 800;
    scene.accel = 10;
    scene.airAccel = 10;
    scene.friction = 4;
    scene.stopspeed = 100;
    scene.stepsize = 18;
    scene.collisionsEnabled = false;

    this.player = new Player(scene, new BABYLON.Vector3(0, 120, -150));

    var camera = new BABYLON.UniversalCamera("camera1", new BABYLON.Vector3(0, this.player.eyeHeight, 0), scene);
    camera.inertia = 0;
    camera.angularSensibility = 1000;
    camera.setTarget(camera.position.add(new BABYLON.Vector3(1, 0, 10)));
    camera.collisionsEnabled = false;

    var light = new BABYLON.HemisphericLight("light1", new BABYLON.Vector3(0, 1, 0), scene);
    light.intensity = 0.7;

    scene.clearColor = new BABYLON.Color4(0.1, 0.1, 0.1, 1);

    // var helperLight = scene.lights.pop();
    // scene.lights.push(helperLight);

    // helperLight.direction = new BABYLON.Vector3(0, 1, 1);
    // scene.ambientColor = new BABYLON.Color3(1, 1, 1);

    var start = BABYLON.MeshBuilder.CreateBox("plane", { height: 1, width: 10000, depth: 10000 }, scene);
    start.position.y = -100;
    start.position.z = -100;
    start.material = new BABYLON.StandardMaterial("plane" + start.name, scene);
    start.material.specularColor = BABYLON.Color3.Black();
    start.material.diffuseTexture = new BABYLON.Texture("intentionally.missing", scene);

    for (let i = 1; i < 10; i++) {
      var plane = BABYLON.MeshBuilder.CreateBox("plane", { height: 20, width: 150, depth: 150, diameter: 0.25 }, scene);
      // plane1.rotation = new BABYLON.Vector3(Math.PI/2.5, 0, 0);
      plane.position.z = 0 + 250 * i;
      plane.position.y = -100 + (i * 30);
      if (i > 1) plane.position.x = (Math.random() * 250);
      plane.bakeCurrentTransformIntoVertices();


      if (!plane.material) {
        plane.material = new BABYLON.StandardMaterial("plane" + plane.name, scene);
        plane.material.ambientColor = new BABYLON.Color3(Math.random(), Math.random(), Math.random());
      }
      // plane.material.specularColor = BABYLON.Color3.Black();
    }

    var gun = BABYLON.Mesh.CreateBox("box", 6.0, scene);
    gun.scaling.set(0.1, 0.1, 0.5);
    gun.lookAt(new BABYLON.Vector3(-0.1, 0.1, 1));
    gun.position.set(1, -1, 3);
    gun.parent = camera;

    // // Our built-in 'ground' shape. Params: name, width, depth, subdivs, scene

    // Keyboard events
    scene.actionManager = new BABYLON.ActionManager(scene);

    scene.onPointerObservable.add((pointerInfo) => {
      switch (pointerInfo.type) {
        case BABYLON.PointerEventTypes.POINTERDOWN:
          this.shoot(scene, gun, this.player, camera, start);
          break;
      }
    });
    var keyHandler = function (evt) {
      var key = evt.sourceEvent.key;
      if (key.length == 1) {
        key = key.toLowerCase();
      }
      this.inputMap[key] = evt.sourceEvent.type == "keydown";
      if (key == "q" && evt.sourceEvent.type == "keydown") {
        this.player.conc();
      }
      if (key == "r" && evt.sourceEvent.type == "keydown") {
        this.player.position = new BABYLON.Vector3(0, 120, -150);
      }
      if (key == "e" && evt.sourceEvent.type == "keydown") {
        this.shoot(scene, gun, this.player, camera);
      }
    }.bind(this);
    scene.actionManager.registerAction(new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnKeyDownTrigger, keyHandler));
    scene.actionManager.registerAction(new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnKeyUpTrigger, keyHandler));

    // Game/Render loop
    scene.onBeforeRenderObservable.add(() => {
      let deltaTime = this.engine.getDeltaTime();
      let dt = deltaTime / 1000;
      this.update(dt);
    });

    scene.camera = camera;
    this._initPointerLock();

    return scene;
  }

  shoot(scene, gun, player, camera, start) {
    var bullet = BABYLON.Mesh.CreateSphere("bullet", 16, 2, scene);
    bullet.checkCollisions = false;
    // var pickresult = scene.pick(canvas.width / 2, canvas.height / 2);
    bullet.material = new BABYLON.StandardMaterial("matBallon", scene);
    // var forw = gun.absolutePosition.subtract(pickresult.pickedPoint);
    var forwardRay = camera.getForwardRay(1);
    var forward = forwardRay.direction;

    let move = function () {
      var animationBox = new BABYLON.Animation("tutoAnimation", "position", 60, BABYLON.Animation.ANIMATIONTYPE_VECTOR3,
        BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE);
      // Animation keys
      var keys = [];
      keys.push({
        frame: 0,
        value: new BABYLON.Vector3(player.position.x + 50 * forward.x, player.position.y + 100 * forward.y + 64, player.position.z + 50 * forward.z)
      });

      keys.push({
        frame: 100,
        value: new BABYLON.Vector3((player.position.x + 50 * forward.x) + 1000 * forward.x, (player.position.y + 100 * forward.y + 64) + 1000 * forward.y, (player.position.z + 50 * forward.z) + 1000 * forward.z)
      });

      animationBox.setKeys(keys);

      bullet.animations.push(animationBox);

      scene.beginAnimation(bullet, 0, 100, false);
    }

    move();

    let interect = () => {
      scene.registerBeforeRender(function () {
        for (var i = 0; i < scene.meshes.length; i++) {
          if (bullet !== scene.meshes[i]) {
            if (bullet.intersectsMesh(scene.meshes[i], false)) {
              bullet.dispose();
            };
          }
        }
      });
    }


    scene.registerBeforeRender(interect);
    setTimeout(function () {
      bullet.dispose();
      scene.unregisterBeforeRender(interect);
    }, 2000);
  }

  getPosPlayer() {
    return this.player.position;
  }

  update(dt) {
    this.player.update(dt, this.inputMap);

    this.scene.camera.position = new BABYLON.Vector3(this.player.position.x, this.player.position.y + this.player.eyeHeight, this.player.position.z);

    if (performance.now() >= this.nextHUDUpdate) {
      this.updateHUD(dt);
      this.nextHUDUpdate = performance.now() + 100;
    }
  }

  updateHUD(dt) {
    this.speedometerElement.innerHTML = Math.round(this.player.getHorizSpeed());
    this.debugElement.innerHTML = `<div>позиция: ${this.player.position.x},${this.player.position.y},${this.player.position.z}</div>`;
    this.debugElement.innerHTML += `<div>vel: ${this.player.velocity.x},${this.player.velocity.y},${this.player.velocity.z}</div>`;
    this.debugElement.innerHTML += `<div>на земле: ${this.player.onGround}</div>`;
    if (this.scene.debugTrace) {
      this.debugElement.innerHTML += `<div>trace: fraction: ${this.scene.debugTrace.fraction} startsolid: ${this.scene.debugTrace.startsolid} allsolid: ${this.scene.debugTrace.allsolid} plane: ${this.scene.debugTrace.plane}</div>`;
    }
  }

  _initPointerLock() {
    var _this = this;
    // Request pointer lock
    var canvas = this.canvas;
    canvas.addEventListener("click", function (evt) {
      canvas.requestPointerLock = canvas.requestPointerLock || canvas.msRequestPointerLock || canvas.mozRequestPointerLock || canvas.webkitRequestPointerLock;
      if (canvas.requestPointerLock) {
        canvas.requestPointerLock();
      }
    }, false);

    // Event listener when the pointerlock is updated.
    var pointerlockchange = function (event) {
      _this.controlEnabled = (document.mozPointerLockElement === canvas || document.webkitPointerLockElement === canvas || document.msPointerLockElement === canvas || document.pointerLockElement === canvas);
      if (!_this.controlEnabled) {
        _this.scene.camera.detachControl(canvas);
      } else {
        _this.scene.camera.attachControl(canvas);
      }
    };
    document.addEventListener("pointerlockchange", pointerlockchange, false);
    document.addEventListener("mspointerlockchange", pointerlockchange, false);
    document.addEventListener("mozpointerlockchange", pointerlockchange, false);
    document.addEventListener("webkitpointerlockchange", pointerlockchange, false);
  }

}
