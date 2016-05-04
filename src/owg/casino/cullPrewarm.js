pc.script.create('cullPrewarm', function (app) {
    // Creates a new CullPrewarm instance
    var CullPrewarm = function (entity) {
        this.entity = entity;
        this.time = 0;
    };

    CullPrewarm.prototype = {
        // Called once after all resources are loaded and before the first update
        initialize: function () {
            this.entity.camera.camera.frustumCulling = false;
        },

        // Called every frame, dt is time in seconds since last update
        update: function (dt) {
            
            if (app.scene._activeCamera) {
                if (this.time > 0) {
                    this.entity.camera.camera.frustumCulling = true;
                }
                this.time += dt;
            }
            
        }
    };

    return CullPrewarm;
});