pc.script.create('Cull', function (app) {
    // Creates a new Cull instance
    var Cull = function (entity) {
        this.entity = entity;
    };

    Cull.prototype = {
        // Called once after all resources are loaded and before the first update
        initialize: function () {
            this.entity.camera.camera.frustumCulling = true;
        },

        // Called every frame, dt is time in seconds since last update
        update: function (dt) {
        }
    };

    return Cull;
});