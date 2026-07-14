/*
 * Fallback implementation of THREE.OrbitControls derived from the
 * three.js r128 distribution. This copy is provided so the arena UI keeps
 * working offline if the CDN fails. The implementation mirrors the
 * original (MIT licensed) controls and exposes the same public API used by
 * the application.
 */

;(function () {
  if (typeof THREE === "undefined" || typeof THREE.OrbitControls === "function") {
    return;
  }

  const _changeEvent = { type: "change" };
  const _startEvent = { type: "start" };
  const _endEvent = { type: "end" };

  const STATE = {
    NONE: -1,
    ROTATE: 0,
    DOLLY: 1,
    PAN: 2,
    TOUCH_ROTATE: 3,
    TOUCH_PAN: 4,
    TOUCH_DOLLY_PAN: 5
  };

  THREE.OrbitControls = function OrbitControls(object, domElement) {
    if (!object) {
      throw new Error("THREE.OrbitControls: object is required");
    }

    if (!domElement) {
      throw new Error("THREE.OrbitControls: DOM element required");
    }

    if (domElement === document) {
      throw new Error("THREE.OrbitControls: DOM element must be a specific element");
    }

    const scope = this;

    this.object = object;
    this.domElement = domElement;

    // public API ----------------------------------------------------------
    this.enabled = true;
    this.target = new THREE.Vector3();

    this.minDistance = 0;
    this.maxDistance = Infinity;

    this.minZoom = 0;
    this.maxZoom = Infinity;

    this.minPolarAngle = 0;
    this.maxPolarAngle = Math.PI;

    this.minAzimuthAngle = -Infinity;
    this.maxAzimuthAngle = Infinity;

    this.enableDamping = false;
    this.dampingFactor = 0.05;

    this.enableZoom = true;
    this.zoomSpeed = 1.0;

    this.enableRotate = true;
    this.rotateSpeed = 1.0;

    this.enablePan = true;
    this.panSpeed = 1.0;
    this.screenSpacePanning = false;
    this.keyPanSpeed = 7.0;

    this.autoRotate = false;
    this.autoRotateSpeed = 2.0;

    this.enableKeys = false;
    this.keys = {
      LEFT: "ArrowLeft",
      UP: "ArrowUp",
      RIGHT: "ArrowRight",
      BOTTOM: "ArrowDown"
    };

    this.mouseButtons = {
      LEFT: THREE.MOUSE ? THREE.MOUSE.ROTATE : 0,
      MIDDLE: THREE.MOUSE ? THREE.MOUSE.DOLLY : 1,
      RIGHT: THREE.MOUSE ? THREE.MOUSE.PAN : 2
    };

    this.touches = {
      ONE: THREE.TOUCH ? THREE.TOUCH.ROTATE : 0,
      TWO: THREE.TOUCH ? THREE.TOUCH.DOLLY_PAN : 1
    };

    // internals ----------------------------------------------------------
    let state = STATE.NONE;
    const pointers = [];
    const pointerPositions = {};

    const spherical = new THREE.Spherical();
    const sphericalDelta = new THREE.Spherical();
    const scale = { value: 1 };
    const panOffset = new THREE.Vector3();
    let zoomChanged = false;

    const rotateStart = new THREE.Vector2();
    const rotateEnd = new THREE.Vector2();
    const rotateDelta = new THREE.Vector2();

    const panStart = new THREE.Vector2();
    const panEnd = new THREE.Vector2();
    const panDelta = new THREE.Vector2();

    const dollyStart = new THREE.Vector2();
    const dollyEnd = new THREE.Vector2();
    const dollyDelta = new THREE.Vector2();

    const target0 = this.target.clone();
    const position0 = this.object.position.clone();
    const zoom0 = this.object.zoom;

    function getAutoRotationAngle() {
      return ((2 * Math.PI) / 60 / 60) * scope.autoRotateSpeed;
    }

    function getZoomScale() {
      return Math.pow(0.95, scope.zoomSpeed);
    }

    function addPointer(event) {
      pointers.push(event);
    }

    function removePointer(event) {
      delete pointerPositions[event.pointerId];
      for (let i = 0; i < pointers.length; i += 1) {
        if (pointers[i].pointerId === event.pointerId) {
          pointers.splice(i, 1);
          return;
        }
      }
    }

    function pointerPosition(event) {
      if (event.pointerId !== undefined) {
        pointerPositions[event.pointerId] = pointerPositions[event.pointerId] || new THREE.Vector2();
        pointerPositions[event.pointerId].set(event.clientX, event.clientY);
      }
    }

    function onPointerDown(event) {
      if (!scope.enabled) {
        return;
      }

      if (pointers.length === 0) {
        scope.domElement.setPointerCapture(event.pointerId);
        scope.dispatchEvent(_startEvent);
      }

      addPointer(event);
      pointerPosition(event);

      if (event.pointerType === "touch") {
        onTouchStart(event);
      } else {
        onMouseDown(event);
      }
    }

    function onPointerMove(event) {
      if (!scope.enabled) {
        return;
      }
      pointerPosition(event);

      if (event.pointerType === "touch") {
        onTouchMove(event);
      } else {
        onMouseMove(event);
      }
    }

    function onPointerUp(event) {
      removePointer(event);
      if (!scope.enabled) {
        return;
      }

      if (event.pointerType === "touch") {
        onTouchEnd(event);
      } else {
        onMouseUp(event);
      }

      if (pointers.length === 0) {
        scope.domElement.releasePointerCapture(event.pointerId);
        scope.dispatchEvent(_endEvent);
      }
    }

    function onMouseDown(event) {
      let mouseAction;
      switch (event.button) {
        case 0:
          mouseAction = scope.mouseButtons.LEFT;
          break;
        case 1:
          mouseAction = scope.mouseButtons.MIDDLE;
          break;
        case 2:
          mouseAction = scope.mouseButtons.RIGHT;
          break;
        default:
          mouseAction = scope.mouseButtons.LEFT;
      }

      if (mouseAction === THREE.MOUSE.PAN) {
        if (!scope.enablePan) {
          return;
        }

        panStart.set(event.clientX, event.clientY);
        state = STATE.PAN;
      } else if (mouseAction === THREE.MOUSE.DOLLY) {
        if (!scope.enableZoom) {
          return;
        }

        dollyStart.set(event.clientX, event.clientY);
        state = STATE.DOLLY;
      } else {
        if (!scope.enableRotate) {
          return;
        }

        rotateStart.set(event.clientX, event.clientY);
        state = STATE.ROTATE;
      }
    }

    function onMouseMove(event) {
      if (!scope.enabled) {
        return;
      }

      if (state === STATE.ROTATE && scope.enableRotate) {
        rotateEnd.set(event.clientX, event.clientY);
        rotateDelta.subVectors(rotateEnd, rotateStart).multiplyScalar(scope.rotateSpeed / scope.domElement.clientHeight);

        rotateLeft((2 * Math.PI * rotateDelta.x));
        rotateUp((2 * Math.PI * rotateDelta.y));

        rotateStart.copy(rotateEnd);
        scope.update();
      } else if (state === STATE.DOLLY && scope.enableZoom) {
        dollyEnd.set(event.clientX, event.clientY);
        dollyDelta.subVectors(dollyEnd, dollyStart);

        if (dollyDelta.y > 0) {
          dollyIn(getZoomScale());
        } else if (dollyDelta.y < 0) {
          dollyOut(getZoomScale());
        }

        dollyStart.copy(dollyEnd);
        scope.update();
      } else if (state === STATE.PAN && scope.enablePan) {
        panEnd.set(event.clientX, event.clientY);
        panDelta.subVectors(panEnd, panStart).multiplyScalar(scope.panSpeed / scope.domElement.clientHeight);

        pan(panDelta.x, panDelta.y);
        panStart.copy(panEnd);
        scope.update();
      }
    }

    function onMouseUp() {
      state = STATE.NONE;
    }

    function onMouseWheel(event) {
      if (!scope.enabled || !scope.enableZoom || state !== STATE.NONE) {
        return;
      }

      event.preventDefault();

      if (event.deltaY < 0) {
        dollyOut(getZoomScale());
      } else if (event.deltaY > 0) {
        dollyIn(getZoomScale());
      }

      scope.update();
    }

    function onTouchStart(event) {
      pointerPosition(event);

      switch (pointers.length) {
        case 1:
          if (!scope.enableRotate) {
            return;
          }
          rotateStart.copy(pointerPositions[pointers[0].pointerId]);
          state = STATE.TOUCH_ROTATE;
          break;
        case 2:
          if (!scope.enableZoom && !scope.enablePan) {
            return;
          }
          const position0 = pointerPositions[pointers[0].pointerId];
          const position1 = pointerPositions[pointers[1].pointerId];

          const midpoint = new THREE.Vector2().addVectors(position0, position1).multiplyScalar(0.5);
          panStart.copy(midpoint);
          dollyStart.subVectors(position0, position1);
          state = STATE.TOUCH_DOLLY_PAN;
          break;
        default:
          state = STATE.NONE;
      }
    }

    function onTouchMove() {
      if (!scope.enabled) {
        return;
      }

      switch (state) {
        case STATE.TOUCH_ROTATE:
          if (!scope.enableRotate || pointers.length !== 1) {
            return;
          }
          rotateEnd.copy(pointerPositions[pointers[0].pointerId]);
          rotateDelta.subVectors(rotateEnd, rotateStart).multiplyScalar(scope.rotateSpeed / scope.domElement.clientHeight);
          rotateLeft((2 * Math.PI * rotateDelta.x));
          rotateUp((2 * Math.PI * rotateDelta.y));
          rotateStart.copy(rotateEnd);
          scope.update();
          break;

        case STATE.TOUCH_DOLLY_PAN:
          if (pointers.length !== 2) {
            return;
          }

          const position0 = pointerPositions[pointers[0].pointerId];
          const position1 = pointerPositions[pointers[1].pointerId];

          const midpoint = new THREE.Vector2().addVectors(position0, position1).multiplyScalar(0.5);
          panEnd.copy(midpoint);
          panDelta.subVectors(panEnd, panStart).multiplyScalar(scope.panSpeed / scope.domElement.clientHeight);
          pan(panDelta.x, panDelta.y);
          panStart.copy(panEnd);

          dollyEnd.subVectors(position0, position1);
          const dollyFactor = dollyEnd.length() / dollyStart.length();
          if (dollyFactor !== 1 && scope.enableZoom) {
            if (dollyFactor > 1) {
              dollyOut(Math.pow(dollyFactor, scope.zoomSpeed));
            } else {
              dollyIn(Math.pow(1 / dollyFactor, scope.zoomSpeed));
            }
            dollyStart.copy(dollyEnd);
          }
          scope.update();
          break;

        default:
          break;
      }
    }

    function onTouchEnd() {
      state = STATE.NONE;
    }

    function onContextMenu(event) {
      if (scope.enabled) {
        event.preventDefault();
      }
    }

    function rotateLeft(angle) {
      sphericalDelta.theta -= angle;
    }

    function rotateUp(angle) {
      sphericalDelta.phi -= angle;
    }

    const panLeft = (function () {
      const v = new THREE.Vector3();
      return function panLeftFunction(distance, objectMatrix) {
        v.setFromMatrixColumn(objectMatrix, 0);
        v.multiplyScalar(-distance);
        panOffset.add(v);
      };
    }());

    const panUp = (function () {
      const v = new THREE.Vector3();
      return function panUpFunction(distance, objectMatrix) {
        v.setFromMatrixColumn(objectMatrix, 1);
        v.multiplyScalar(distance);
        panOffset.add(v);
      };
    }());

    const panInternal = (function () {
      const offset = new THREE.Vector3();
      return function panInternalFunction(deltaX, deltaY) {
        if (!scope.enablePan) {
          return;
        }

        const element = scope.domElement;

        if (scope.object.isPerspectiveCamera) {
          const position = scope.object.position;
          offset.copy(position).sub(scope.target);
          let targetDistance = offset.length();
          targetDistance *= Math.tan((scope.object.fov / 2) * (Math.PI / 180));

          panLeft((2 * deltaX * targetDistance) / element.clientHeight, scope.object.matrix);
          panUp((2 * deltaY * targetDistance) / element.clientHeight, scope.object.matrix);
        } else if (scope.object.isOrthographicCamera) {
          panLeft((deltaX * (scope.object.right - scope.object.left)) / scope.object.zoom / element.clientWidth, scope.object.matrix);
          panUp((deltaY * (scope.object.top - scope.object.bottom)) / scope.object.zoom / element.clientHeight, scope.object.matrix);
        } else {
          console.warn("THREE.OrbitControls: unsupported camera type for panning.");
          scope.enablePan = false;
        }
      };
    }());

    function pan(deltaX, deltaY) {
      if (scope.screenSpacePanning) {
        panOffset.set(-deltaX, deltaY, 0);
        panOffset.applyQuaternion(scope.object.quaternion);
        scope.target.add(panOffset);
      } else {
        panInternal(deltaX, deltaY);
      }
    }

    function dollyIn(dollyScale) {
      if (!scope.enableZoom) {
        return;
      }

      if (scope.object.isPerspectiveCamera) {
        scale.value /= dollyScale;
      } else if (scope.object.isOrthographicCamera) {
        scope.object.zoom = THREE.MathUtils.clamp(scope.object.zoom * dollyScale, scope.minZoom, scope.maxZoom);
        scope.object.updateProjectionMatrix();
        zoomChanged = true;
      }
    }

    function dollyOut(dollyScale) {
      if (!scope.enableZoom) {
        return;
      }

      if (scope.object.isPerspectiveCamera) {
        scale.value *= dollyScale;
      } else if (scope.object.isOrthographicCamera) {
        scope.object.zoom = THREE.MathUtils.clamp(scope.object.zoom / dollyScale, scope.minZoom, scope.maxZoom);
        scope.object.updateProjectionMatrix();
        zoomChanged = true;
      }
    }

    // ------------------------------------------------------------------
    this.update = function update() {
      const position = scope.object.position;
      const offset = new THREE.Vector3();

      offset.copy(position).sub(scope.target);
      spherical.setFromVector3(offset);

      if (scope.autoRotate && state === STATE.NONE) {
        rotateLeft(getAutoRotationAngle());
      }

      spherical.theta += sphericalDelta.theta;
      spherical.phi += sphericalDelta.phi;

      spherical.theta = THREE.MathUtils.clamp(spherical.theta, scope.minAzimuthAngle, scope.maxAzimuthAngle);
      spherical.phi = THREE.MathUtils.clamp(spherical.phi, scope.minPolarAngle, scope.maxPolarAngle);
      spherical.makeSafe();

      spherical.radius *= scale.value;
      spherical.radius = THREE.MathUtils.clamp(spherical.radius, scope.minDistance, scope.maxDistance);

      scope.target.add(panOffset);

      offset.setFromSpherical(spherical);
      position.copy(scope.target).add(offset);
      scope.object.lookAt(scope.target);

      if (scope.enableDamping) {
        sphericalDelta.theta *= 1 - scope.dampingFactor;
        sphericalDelta.phi *= 1 - scope.dampingFactor;
      } else {
        sphericalDelta.set(0, 0, 0);
      }

      scale.value = 1;
      panOffset.set(0, 0, 0);

      if (scope.enableDamping) {
        if (Math.abs(sphericalDelta.theta) > Number.EPSILON || Math.abs(sphericalDelta.phi) > Number.EPSILON || zoomChanged) {
          scope.dispatchEvent(_changeEvent);
        }
      } else if (zoomChanged) {
        scope.dispatchEvent(_changeEvent);
      }

      zoomChanged = false;
    };

    this.saveState = function saveState() {
      target0.copy(scope.target);
      position0.copy(scope.object.position);
      zoom0 = scope.object.zoom;
    };

    this.reset = function reset() {
      scope.target.copy(target0);
      scope.object.position.copy(position0);
      scope.object.zoom = zoom0;
      scope.object.updateProjectionMatrix();
      scale.value = 1;
      sphericalDelta.set(0, 0, 0);
      panOffset.set(0, 0, 0);
      scope.update();
      scope.dispatchEvent(_changeEvent);
      state = STATE.NONE;
    };

    this.dispose = function dispose() {
      scope.domElement.removeEventListener("contextmenu", onContextMenu);
      scope.domElement.removeEventListener("pointerdown", onPointerDown);
      scope.domElement.removeEventListener("pointermove", onPointerMove);
      scope.domElement.removeEventListener("pointerup", onPointerUp);
      scope.domElement.removeEventListener("pointercancel", onPointerUp);
      scope.domElement.removeEventListener("wheel", onMouseWheel);
    };

    // event helpers ------------------------------------------------------
    this.domElement.addEventListener("contextmenu", onContextMenu);
    this.domElement.addEventListener("pointerdown", onPointerDown);
    this.domElement.addEventListener("pointermove", onPointerMove);
    this.domElement.addEventListener("pointerup", onPointerUp);
    this.domElement.addEventListener("pointercancel", onPointerUp);
    this.domElement.addEventListener("wheel", onMouseWheel, { passive: false });

    if (this.domElement.style && typeof this.domElement.style.touchAction !== "undefined") {
      this.domElement.style.touchAction = "none";
    }

    // initialise spherical state ----------------------------------------
    this.update();
    this.saveState();
  };

  THREE.OrbitControls.prototype = Object.create(THREE.EventDispatcher.prototype);
  THREE.OrbitControls.prototype.constructor = THREE.OrbitControls;
})();
