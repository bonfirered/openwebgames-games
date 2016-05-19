pc.script.create('lightProbeAtEachNode', function (app) {
    // Creates a new LightProbeAtEachNode instance
    var LightProbeAtEachNode = function (entity) {
        this.entity = entity;
    };

    LightProbeAtEachNode.prototype = {
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
                mat.ambientSH = new Float32Array(9 * 3);
                //mat.emissive = new pc.Color(1,0,0);
                mat.update();
                app._probePos.push(meshes[i].aabb.center);
                app._probeMode.push(0);
                app._probeReceivers.push([meshes[i]]);
                app._probeInstancePos.push(meshes[i].aabb.center);
            }
        },

        // Called every frame, dt is time in seconds since last update
        update: function (dt) {
        }
    };

    return LightProbeAtEachNode;
});