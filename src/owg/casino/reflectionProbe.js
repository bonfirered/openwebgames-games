pc.script.attribute('ref', 'string', "");

pc.script.create('reflectionProbe', function (app) {
    // Creates a new ReflectionProbe instance
    var ReflectionProbe = function (entity) {
        this.entity = entity;
    };

    ReflectionProbe.prototype = {
        // Called once after all resources are loaded and before the first update
        initialize: function () {
            if (!app._probePos) {
                app._probePos = [];
                app._probeMode = [];
                app._probeReceivers = [];
                app._probeInstancePos = [];
            }
            var meshes = this.entity.model.model.meshInstances;
            for(var i=0; i<meshes.length; i++) {
                var mat = meshes[i].material;
                var tmp = new pc.Texture();
                tmp.rgbm = true;
                tmp.fixCubemapSeams = true;
                mat.dpAtlas = tmp;
                //mat.cubeMap = tmp;
                /*mat.prefilteredCubeMap128 = tmp;
                mat.prefilteredCubeMap64 = tmp;
                mat.prefilteredCubeMap32 = tmp;
                mat.prefilteredCubeMap16 = tmp;
                mat.prefilteredCubeMap8 = tmp;
                mat.prefilteredCubeMap4 = tmp;*/
                meshes[i]._veryHidden = true;
                mat.update();
                pc.refl = mat;
                if (this.ref!=="") {
                    app._probePos.push(app.root.findByName(this.ref).getPosition());
                } else {
                    app._probePos.push(this.entity.getPosition());
                }
                app._probeMode.push(1);
                app._probeReceivers.push([meshes[i]]);
                app._probeInstancePos.push(this.entity.getPosition());
            }
        },

        // Called every frame, dt is time in seconds since last update
        update: function (dt) {
        }
    };

    return ReflectionProbe;
});