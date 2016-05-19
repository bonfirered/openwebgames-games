pc.script.create('overrideLM', function (app) {
    // Creates a new OverrideLM instance
    var OverrideLM = function (entity) {
        this.entity = entity;
    };

    OverrideLM.prototype = {
        // Called once after all resources are loaded and before the first update
        initialize: function () {
            
            var i;
            var dips = app.scene.drawCalls;
            var rebake = false;
            for(i=0; i<dips.length; i++) {              
                var name = dips[i].node.name;
                var lmName = name + "_LightingMap";
                if (dips[i].material.lightMap && dips[i].material.lightMap.name=="01") lmName = dips[i].material.lightMap.name; // hack
                
                //var lm = app.assets.find(lmName + "_New");
                var lm = app.assets.find("LM2_" + lmName);
                if (!lm) {
                    lm = app.assets.find(lmName);
                    if (lm) {
                        rebake = true;
                        console.log("Forced rebaking because of " + lmName);
                    }
                }
                
                if (lm) {
                    lm = lm.resource;
                    dips[i].setParameter("texture_lightMap", lm);
                    
                    lm = app.assets.find("LMDIR_" + lmName);
                    if (lm) dips[i].setParameter("texture_lightMapDir", lm.resource);
                }
            }
            if (app.bakeLight) {
                if (rebake) {
                    for(i=0; i<app.bakeLight.length; i++) {
                        app.bakeLight[i].Run();
                    }
                } else {
                    for(i=0; i<app.bakeLight.length; i++) {
                        app.bakeLight[i].entity.enabled = false;
                    }
                }
            }
        },

        // Called every frame, dt is time in seconds since last update
        update: function (dt) {
        }
    };

    return OverrideLM;
});