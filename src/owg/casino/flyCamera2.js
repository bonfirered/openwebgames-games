pc.script.attribute('mode', 'enumeration', 0, {
    enumerations: [{
        name: 'Lock',
        value: 0
    }, {
        name: 'Drag',
        value: 1
    }]
});

pc.script.attribute('speed', 'number', 10);
pc.script.attribute('fastSpeed', 'number', 20);

pc.script.attribute('touchJoystickColor', 'rgb', [255, 255, 255]);

pc.script.create('flyCamera2', function (app) {
    var vec = new pc.Vec2();
    var tmp = new pc.Vec2();
    var vec3 = new pc.Vec3();

    var FlyCamera2 = function (entity) {
        this.entity = entity;
        this._enabled = false;
        this._initializedEvents = false;

        // Camera euler angle rotation around x and y axes
        var eulers = this.entity.getLocalEulerAngles();
        this.ex = eulers.x;
        this.ey = eulers.y;
        this.moved = false;
        this.lmbDown = false;

       // touch controls
       if (app.touch) {
           this.touches = {};
           this.joySize = 2*74 + 16;
           this.joyRadius = this.joySize / 2  - 2;
           this.joyColor = 'white';

           this.joyLeft = document.createElement('canvas');
           this.joyLeft.width = this.joySize;
           this.joyLeft.height = this.joySize;
           this.joyLeft.ctx = this.joyLeft.getContext('2d');
           this.joyLeft.style.position = 'absolute';
           this.joyLeft.style.left = '30px';
           this.joyLeft.style.bottom = '30px';
           this.joyLeft.style.display = 'none';

           this.joyRight = document.createElement('canvas');
           this.joyRight.width = this.joySize;
           this.joyRight.height = this.joySize;
           this.joyRight.ctx = this.joyRight.getContext('2d');
           this.joyRight.style.position = 'absolute';
           this.joyRight.style.right = '30px';
           this.joyRight.style.bottom = '30px';
           this.joyRight.style.display = 'none';
       }
    };

    FlyCamera2.prototype = {
        initialize: function () {
            this.joyColor = this.touchJoystickColor.toString();
        },

        onAttributeChanged: function (name, oldVal, newVal) {
            if (name === 'touchJoystickColor') {
                this.joyColor = newVal.toString();
            }
        },

        onEnable: function () {
            if (app.touch) {
                this.joyRight.style.display = 'block';
                this.joyLeft.style.display = 'block';
            }
        },

        onDisable: function () {
            if (app.touch) {
                this.joyRight.style.display = 'none';
                this.joyLeft.style.display = 'none';
            }
        },

        postUpdate: function (dt) {
            if (!this.enabled) return;

            // Update the camera's orientation
            this.entity.setLocalEulerAngles(this.ex, this.ey, 0);

            if (!app.touch) {
                this.updateNonTouch(dt);
            } else {
                this.updateTouch(dt);
            }
        },

        updateNonTouch: function (dt) {

            var speed = this.speed;
            if (app.keyboard.isPressed(pc.KEY_SHIFT)) {
                speed = this.fastSpeed;
            }

            // Update the camera's position
            if (app.keyboard.isPressed(pc.KEY_UP) || app.keyboard.isPressed(pc.KEY_W)) {
                this.entity.translateLocal(0, 0, -speed*dt);
            } else if (app.keyboard.isPressed(pc.KEY_DOWN) || app.keyboard.isPressed(pc.KEY_S)) {
                this.entity.translateLocal(0, 0, speed*dt);
            }

            if (app.keyboard.isPressed(pc.KEY_LEFT) || app.keyboard.isPressed(pc.KEY_A)) {
                this.entity.translateLocal(-speed*dt, 0, 0);
            } else if (app.keyboard.isPressed(pc.KEY_RIGHT) || app.keyboard.isPressed(pc.KEY_D)) {
                this.entity.translateLocal(speed*dt, 0, 0);
            }
        },

        onMouseMove: function (evt) {
            if (!this.enabled) return;

            if (!this.mode) {
                if (!pc.Mouse.isPointerLocked())
                    return;
            } else {
                if (!this.lmbDown)
                    return;
            }

            // Update the current Euler angles, clamp the pitch.
            if (!this.moved) {
                // first move event can be very large
                this.moved = true;
                return;
            }
            this.ex -= evt.dy / 5;
            this.ex = pc.math.clamp(this.ex, -90, 90);
            this.ey -= evt.dx / 5;
        },

        onMouseDown: function (evt) {            
            if (!this.enabled || evt.event.target !== app.graphicsDevice.canvas) return;
            
            if (event.button === 0) {
                this.lmbDown = true;

                // When the mouse button is clicked try and capture the pointer
                if (!this.mode && !pc.Mouse.isPointerLocked()) {
                    app.mouse.enablePointerLock();                                                
                }
            }
        },

        onMouseUp: function (evt) {
            if (!this.enabled) return;
            
            if (evt.button === 0) {
                this.lmbDown = false;
            }
        },
        
        updateTouch: function (dt) {
            var self = this;
            var touch;

            self.resizeJoystick();

            // for each touch determine if it's on the
            // left or right joystick
            for(var id in self.touches) {
                touch = self.touches[id];
                if (touch.start) {
                    
                    var rect = this.joyLeft.getBoundingClientRect();
                    vec.set(touch.x - rect.left - this.joySize / 2, touch.y - rect.top - this.joySize / 2);
                    if (vec.length() < (this.joySize / 2)) {
                        touch.joy = this.joyLeft;
                    }

                    rect = this.joyRight.getBoundingClientRect();
                    vec.set(touch.x - rect.left - this.joySize / 2, touch.y - rect.top - this.joySize / 2);
                    if (vec.length() < (this.joySize / 2)) {
                        touch.joy = this.joyRight;
                    }
                }
            }

            // draw circles at each touch point
            for(var id in self.touches) {
                touch = self.touches[id];
                if (touch.down && touch.joy) {
                                                    
                    var rect = touch.joy.getBoundingClientRect();
                    vec.set(touch.x - rect.left - this.joySize / 2, touch.y - rect.top - this.joySize / 2);

                    if (vec.length() > this.joySize / 2 - 24)
                        vec.normalize().scale(this.joySize / 2 - 24);                    

                    if (touch.joy == this.joyRight) {
                        tmp.copy(vec).scale(1 / (this.joySize / 2 - 24)).scale(90 * dt);

                        this.ex -= tmp.y * 0.7; //pc.math.clamp(this.ex - dy * dt, -90, 90);
                        this.ey -= tmp.x;

                        // this.entity.script.flyCamera.rotate(-tmp.y * .7, -tmp.x);
                    } else if (touch.joy == this.joyLeft) {
                        tmp.copy(vec).scale(1 / (this.joySize / 2 - 24)).scale(2 * dt);
                        this.entity.translateLocal(tmp.x, 0, tmp.y);
                    }                                                            
                }
            }
           
            for(var id in this.touches) {
                touch = self.touches[id];
                if (touch.start) {
                    delete touch.start;
                    touch.down = true;
                }

                if (touch.end) {
                    delete this.touches[id];
                }
            }
        },

        resizeJoystick: function () {
            var size = Math.max(2, Math.min(4, Math.floor(screen.width / 240))) * 50 + 24;

            if (size !== this.joySize) {
                this.joySize = size;
                this.joyRadius = size / 2 - 2;
                this.joyLeft.width = size;
                this.joyLeft.height = size;
                this.joyRight.width = size;
                this.joyRight.height = size;

                var ctx = this.joyLeft.ctx;
                this.drawCircle(ctx, 'rgba(255, 255, 255, .07)', this.joyColor, size / 2, size / 2, this.joyRadius);

                ctx = this.joyRight.ctx;
                this.drawCircle(ctx, 'rgba(255, 255, 255, .07)', this.joyColor, size / 2, size / 2, this.joyRadius);
            }
        },

        drawCircle: function (ctx, color, stroke, x, y, radius) {
            ctx.beginPath();
            ctx.arc(x, y, radius, 2 * Math.PI, false);
            ctx.fillStyle = color;
            ctx.fill();
            if (stroke) {
                ctx.strokeStyle = stroke;
                ctx.stroke();
            }
        },

        onTouchStart: function (evt) {
            if (!this.enabled || evt.target.nodeName !== 'CANVAS') return;
            
            var i = evt.touches.length, id;
            while (i--) {
                id = evt.touches[i].identifier;
                if (this.touches[id]) continue;

                this.touches[id] = {
                    x: evt.touches[i].clientX,
                    y: evt.touches[i].clientY,
                    start: true
                };
            }
           // evt.preventDefault();
        },

        onTouchMove: function (evt) {
            if (!this.enabled) return;
            
            var i = evt.touches.length, id;
            while (i--) {
                id = evt.touches[i].identifier;
                if (!this.touches[id]) continue;

                this.touches[id].x = event.touches[i].clientX;
                this.touches[id].y = event.touches[i].clientY;
            }
            //evt.preventDefault();
        },

        onTouchEnd: function (evt) {
            if (!this.enabled) return;
            
            var i = evt.changedTouches.length, id;
            while (i--) {
                id = evt.changedTouches[i].identifier;
                if (this.touches[id] !== undefined && !this.touches[id].end) {
                    delete this.touches[id].start;
                    delete this.touches[id].down;
                    this.touches[id].end = true;
                }
            }
            
           // if (evt.target.nodeName === 'CANVAS')
             //   evt.preventDefault();
        }
    };
    
    Object.defineProperty(FlyCamera2.prototype, 'enabled', {
        get: function () {
            return this._enabled;
        },

        set: function (value) {
            if (this._enabled === value) return;

            this._enabled = value;
            if (value) {
                var eulers = this.entity.getEulerAngles();
                this.ex = eulers.x;
                this.ey = eulers.y;
                
                // Disabling the context menu stops the browser displaying a menu when
                // you right-click the page
                app.mouse.disableContextMenu();
                
                if (!this._initializedEvents) {                    
                    app.mouse.on(pc.EVENT_MOUSEMOVE, this.onMouseMove, this);
                    app.mouse.on(pc.EVENT_MOUSEDOWN, this.onMouseDown, this);
                    app.mouse.on(pc.EVENT_MOUSEUP, this.onMouseUp, this);
                }
                

                // touch controls
               if (app.touch) {
                   
                   document.body.appendChild(this.joyLeft);                
                   document.body.appendChild(this.joyRight);

                   if (!this._initializedEvents) {
                        window.addEventListener('touchstart', this.onTouchStart.bind(this));
                        window.addEventListener('touchend', this.onTouchEnd.bind(this));
                        window.addEventListener('touchmove', this.onTouchMove.bind(this));
                   }
               }

               this._initializedEvents = true;
            } else {
                if (app.touch) {
                    document.body.removeChild(this.joyLeft);
                    document.body.removeChild(this.joyRight);
                }            
            }
        }
    });

   return FlyCamera2;
});