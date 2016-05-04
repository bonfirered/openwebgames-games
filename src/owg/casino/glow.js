pc.script.create('glow', function (app) {
    // Creates a new Glow instance
    var Glow = function (entity) {
        this.entity = entity;
        this.vec = new pc.Vec3();
    };

    Glow.prototype = {
        // Called once after all resources are loaded and before the first update
        initialize: function () {
            
            this.mesh = this.entity.model.model.meshInstances[0];
            var mat = this.mesh.material;
            mat.customFragmentShader = "\
uniform sampler2D texture_diffuseMap;\n\
uniform float material_opacity;\
varying vec2 vUv0;\n\
void main() {\n\
    gl_FragColor = texture2D(texture_diffuseMap, vUv0) * material_opacity;\n\
}\n\
";
            mat.update();
        },

        // Called every frame, dt is time in seconds since last update
        postUpdate: function (dt) {
            if (!app.scene._activeCamera) return;
            
            var posCam = app.scene._activeCamera._node.getPosition();
            this.entity.lookAt(posCam);
            this.entity.rotateLocal(-90, 0, 0);
            
            var dist = this.vec.sub2(this.entity.getPosition(), posCam).length();
            dist = 1.0 / (dist + 1);
            dist *= 10;
            this.mesh.setParameter("material_opacity", Math.min(dist, 1));

            this.mesh._hidden = dist < 0.3;
        }
    };

    return Glow;
});