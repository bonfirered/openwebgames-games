pc.script.create('distCull', function (app) {
    // Creates a new DistCull instance
    var DistCull = function (entity) {
        this.entity = entity;
        this.vec = new pc.Vec3();
        this.lods = [];
        this.dontLod = [];
        this.lodLevel = []; // 0 = persistent, 1 = high, 2 = lod
        this.time = 0;
        app.distCull = this;
    };

    DistCull.prototype = {
        // Called once after all resources are loaded and before the first update
        postInitialize: function () {
            var dips = app.scene.drawCalls;
            var j;
            for(var i=0; i<dips.length; i++) {
                var level = 1;
                for(j=0; j<this.lods.length; j++) {
                    if (dips[i]===this.lods[j]) {
                        level = 2;
                        break;
                    }
                }
                for(j=0; j<this.dontLod.length; j++) {
                    if (dips[i]===this.dontLod[j]) {
                        level = 0;
                        break;
                    }
                }
                this.lodLevel.push(level);
            }
        },

        // Called every frame, dt is time in seconds since last update
        update: function (dt) {
            
            if (!app.scene._activeCamera) return;
            
            // prewarm
            if (this.time<0.1) {
                this.time += dt;
                return;
            }
            
            var posCam = app.scene._activeCamera._node.getPosition();
            
            var dips = app.scene.drawCalls;
            for(var i=0; i<dips.length; i++) {
                if (this.lodLevel[i]>0) {
                    var extents = dips[i].aabb.halfExtents;
                    var radius = Math.max(Math.max(extents.x, extents.y), extents.z);
                    if (dips[i]._veryHidden) {
                        dips[i]._hidden = true;
                        continue;
                    }
                    //if (radius) {
                        var pos = dips[i].node.getPosition();
                        var distSqr = this.vec.sub2(pos, posCam).lengthSq() - radius*radius;
                        var lodDist = 15;
                        dips[i]._hidden = distSqr > lodDist * lodDist;
                        if (this.lodLevel[i]==2) dips[i]._hidden = !dips[i]._hidden;
                    //}
                }
            }
            
        }
    };

    return DistCull;
});