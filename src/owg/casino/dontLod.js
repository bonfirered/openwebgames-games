pc.script.create('dontLod', function (app) {
    // Creates a new DontLod instance
    var DontLod = function (entity) {
        this.entity = entity;
    };

    DontLod.prototype = {
        // Called once after all resources are loaded and before the first update
        initialize: function () {
            
            var dips = this.entity.model.model.meshInstances;
            for(var i=0; i<dips.length; i++) {
                app.distCull.dontLod.push(dips[i]);
            }
            
        },

        // Called every frame, dt is time in seconds since last update
        update: function (dt) {
        }
    };

    return DontLod;
});