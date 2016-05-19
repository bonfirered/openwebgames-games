pc.script.create('lod', function (app) {
    // Creates a new Lod instance
    var Lod = function (entity) {
        this.entity = entity;
    };

    Lod.prototype = {
        // Called once after all resources are loaded and before the first update
        initialize: function () {
            
            var dips = this.entity.model.model.meshInstances;
            for(var i=0; i<dips.length; i++) {
                app.distCull.lods.push(dips[i]);
            }
            
        },

        // Called every frame, dt is time in seconds since last update
        update: function (dt) {
        }
    };

    return Lod;
});