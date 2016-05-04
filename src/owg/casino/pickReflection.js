pc.script.create('pickReflection', function (app) {
    // Creates a new PickReflection instance
    var PickReflection = function (entity) {
        this.entity = entity;
    };

    PickReflection.prototype = {
        // Called once after all resources are loaded and before the first update
        initialize: function () {
            if (!app._reflReceivers) {
                app._reflReceivers = [];
            }
            var meshes = this.entity.model.model.meshInstances;
            for(var i=0; i<meshes.length; i++) {
                app._reflReceivers.push(meshes[i]);
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
                mat.update();
            }
        },

        // Called every frame, dt is time in seconds since last update
        update: function (dt) {
        }
    };

    return PickReflection;
});