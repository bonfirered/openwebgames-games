pc.script.create('animCamera', function (app) {
    // Creates a new AnimCamera instance
    var AnimCamera = function (entity) {
        this.entity = entity;
        this.time = 0;
        this.speed = 0.025;
        this.target = new pc.Vec3();
        this.enabled = true;
        this.initialExposure = null;
    };

    AnimCamera.prototype = {
        // Called once after all resources are loaded and before the first update
        initialize: function () {
            
            var i;
            this.nodes = this.entity.getChildren();
            
            this.initialExposure = app.scene.exposure;
            
            var curveMode = pc.CURVE_CARDINAL;
            this.x = new pc.Curve(); this.x.type = curveMode;
            this.y = new pc.Curve(); this.y.type = curveMode;
            this.z = new pc.Curve(); this.z.type = curveMode;
            this.tx = new pc.Curve(); this.tx.type = curveMode;
            this.ty = new pc.Curve(); this.ty.type = curveMode;
            this.tz = new pc.Curve(); this.tz.type = curveMode;
            this.exposure = new pc.Curve();
            for(i=0; i<this.nodes.length; i++) {
                var t = i / this.nodes.length;
                var pos = this.nodes[i].getPosition();
                this.x.add(t, pos.x);
                this.y.add(t, pos.y);
                this.z.add(t, pos.z);
                var lookAt = pos.clone().add(this.nodes[i].forward);
                this.tx.add(t, lookAt.x);
                this.ty.add(t, lookAt.y);
                this.tz.add(t, lookAt.z);
                this.exposure.add(t, (t===0 || i===this.nodes.length-1)? 0 : app.scene.exposure);
            }
         
        },

        // Called every frame, dt is time in seconds since last update
        update: function (dt) {
            //return;
            if (app.keyboard.wasPressed(pc.KEY_ENTER)) this.enabled = false;
            
     
            var cam = app.scene._activeCamera;
            if (cam) {
                var flyCamera = cam._node.script.flyCamera2;
                flyCamera.enabled = !this.enabled;
                if (flyCamera.enabled)
                    app.scene.exposure = this.initialExposure;
            } 
            
            if (!this.enabled || !cam) return;
            
            
            
            
            var timeline = this.nodes.length * this.time;
            var startNode = Math.min(Math.floor(timeline), this.nodes.length-1);
            var nextNode = Math.min(startNode+1, this.nodes.length-1);
            var percent = timeline - startNode;
            this.time += dt * this.speed;
            this.time = this.time % ((this.nodes.length-1) / this.nodes.length);
            
            var pos = cam._node.getPosition();
            //pos.lerp(this.nodes[startNode].getPosition(), this.nodes[nextNode].getPosition(), percent);
            pos.x = this.x.value(this.time);
            pos.y = this.y.value(this.time);
            pos.z = this.z.value(this.time);
            cam._node.setPosition(pos);
            
            //var rot = cam._node.getRotation();
            //rot.slerp(this.nodes[startNode].getRotation(), this.nodes[nextNode].getRotation(), percent);
            //cam._node.setRotation(rot);
            this.target.x = this.tx.value(this.time);
            this.target.y = this.ty.value(this.time);
            this.target.z = this.tz.value(this.time);
            cam._node.lookAt(this.target);
            
            var fov = pc.math.lerp(this.nodes[startNode].camera.camera.getFov(), this.nodes[nextNode].camera.camera.getFov(), 1-(1-percent) * (1-percent));
            cam.setFov(fov);
            
            app.scene.exposure = this.exposure.value(this.time);
        }
    };

    return AnimCamera;
});