pc.script.create('occludeWithLM', function (app) {
    // Creates a new OccludeWithLM instance
    var OccludeWithLM = function (entity) {
        this.entity = entity;
    };

    OccludeWithLM.prototype = {
        // Called once after all resources are loaded and before the first update
        initialize: function () {
            
            var dips = this.entity.model.model.meshInstances;//app.scene.drawCalls;
            for(var i=0; i<dips.length; i++) {
                var mat = dips[i].material;
                mat.chunks.lightmapSinglePS = "\
uniform sampler2D texture_lightMap;\
void addLightMap() {\
    dDiffuseLight = $texture2DSAMPLE(texture_lightMap, $UV).$CH;\
    dAo = max(max(dDiffuseLight.r, dDiffuseLight.g), dDiffuseLight.b);\
    dAo = saturate(dAo + 0.5);\
}\n";
                mat.chunks.aoTexPS = "\
uniform sampler2D texture_aoMap;\
void applyAO() {\
    dAo *= texture2D(texture_aoMap, $UV).$CH;\
    dDiffuseLight *= dAo;\
}\n";
                mat.update();
            }
            
        },

        // Called every frame, dt is time in seconds since last update
        update: function (dt) {
        }
    };

    return OccludeWithLM;
});