pc.script.attribute('ref', 'string', "");

pc.script.create('rotateReflection', function (app) {
    // Creates a new RotateReflection instance
    var RotateReflection = function (entity) {
        this.entity = entity;
        this._time = 0;
        this.rot = new pc.Vec4();
    };

    RotateReflection.prototype = {
        // Called once after all resources are loaded and before the first update
        initialize: function () {
            
            var ref = app.root.findByName(this.ref);
            var refPos = ref.getPosition();
            var refAngle = Math.atan2(refPos.z, refPos.x);
            
			var meshes = this.entity.model.model.meshInstances;
            for(var i=0; i<meshes.length; i++) {
                var mat = meshes[i].material;
                mat.chunks.reflDirPS = "\
    uniform vec4 reflRotation;\
void getReflDir() {\
    dReflDirW = normalize(-reflect(dViewDirW, dNormalW));\
        vec4 r = reflRotation;\
        mat2 R = mat2(r.x, r.y, r.z, r.w);\
        dReflDirW.xz = R * dReflDirW.xz;\
}\
";
                mat.update();
                
                meshes[i].node.getWorldTransform();
                var pos = meshes[i].aabb.center;
                var angle = Math.atan2(pos.z, pos.x);
                var relAngle = angle - refAngle;
                //relAngle += Math.PI / 4;
                
                //console.log(refPos.data);
                //console.log(pos.data);
                
                var s = Math.sin(relAngle);
                var c = Math.cos(relAngle);
                //console.log(refAngle+" "+angle+" "+relAngle+" "+s+" "+c);
                var rot = new pc.Vec4(c, -s, s, c);
                
                meshes[i].setParameter("reflRotation", rot.data);
            }
            
        },

        // Called every frame, dt is time in seconds since last update
        update: function (dt) {
            
            /*this._time += dt * 10;
            var a = this._time;
            var c = Math.sin(a);
            var s = Math.cos(a);
            this.rot.x = c;
            this.rot.y = -s;
            this.rot.z = s;
            this.rot.w = c;
			var meshes = this.entity.model.model.meshInstances;
            for(var i=0; i<meshes.length; i++) {
                meshes[i].setParameter("reflRotation", this.rot.data);
            }*/
            
        }
    };

    return RotateReflection;
});