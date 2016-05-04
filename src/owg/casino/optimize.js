pc.script.create('optimize', function (app) {
    // Creates a new Optimize instance
    var Optimize = function (entity) {
        this.entity = entity;
    };

    Optimize.prototype = {
        // Called once after all resources are loaded and before the first update
        initialize: function () {
            
            //pc.shaderChunks.endPS = "gl_FragColor = vec4(1,0,0,1);";
            app.graphicsDevice.precision = "mediump";//lowp";
            app.graphicsDevice.maxPixelRatio = 1;
            var i;
            var dips = app.scene.drawCalls;
            var rebake = false;
            for(i=0; i<dips.length; i++) {
                dips[i].material.fastTbn = true;
                //dips[i].material.chunks.endPS = "gl_FragColor.rgb = gammaCorrectOutput(toneMap(data.diffuseLight));";
            }
            
        },

        // Called every frame, dt is time in seconds since last update
        update: function (dt) {
        }
    };

    return Optimize;
});