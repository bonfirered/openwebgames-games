pc.script.attribute('reflObject', 'string', "");

pc.script.create('renderReflection', function (app) {
    // Creates a new RenderReflection instance
    var RenderReflection = function (entity) {
        this.entity = entity;
        this.firstTime = true;
        this.posCam = new pc.Vec3();
        this.vec = new pc.Vec3();
        app.reflection = this;
    };

    RenderReflection.prototype = {
        // Called once after all resources are loaded and before the first update
        initialize: function () {
            
            this.reflDips = [];
            var names = this.reflObject.split("|");
            for(var i=0; i<names.length; i++) {
                var entity = app.root.findByName(names[i]);
                var meshes = entity.model.model.meshInstances;
                console.log(names[i] +  " " + meshes.length);
                for(var j=0; j<meshes.length; j++) {
                    this.reflDips.push(meshes[j]);
                }
            }
            
            var device = app.graphicsDevice;
            var tex = new pc.Texture(device, {
              width:256,
              height:256, 
              format:pc.PIXELFORMAT_R8_G8_B8_A8,
              autoMipmap:false,
              rgbm:false});
            tex.addressU = pc.ADDRESS_CLAMP_TO_EDGE;
            tex.addressV = pc.ADDRESS_CLAMP_TO_EDGE;
            tex.minFilter = pc.FILTER_LINEAR;
            tex.magFilter = pc.FILTER_LINEAR;
            var targ = new pc.RenderTarget(device, tex, {
                depth: true
            });
            this.tex = tex;
            this.targ = targ;
            
            var tex2 = new pc.Texture(device, {
              width:128,
              height:128,
              format:pc.PIXELFORMAT_R8_G8_B8_A8,
              autoMipmap:false,
              rgbm:false});
            tex2.addressU = pc.ADDRESS_CLAMP_TO_EDGE;
            tex2.addressV = pc.ADDRESS_CLAMP_TO_EDGE;
            tex2.minFilter = pc.FILTER_LINEAR;
            tex2.magFilter = pc.FILTER_LINEAR;
            var targ2 = new pc.RenderTarget(device, tex2, {
                depth: false
            });
            this.tex2 = tex2;
            this.targ2 = targ2;
            
            var tex3 = new pc.Texture(device, {
              width:64,
              height:64,
              format:pc.PIXELFORMAT_R8_G8_B8_A8,
              autoMipmap:false,
              rgbm:false});
            tex3.addressU = pc.ADDRESS_CLAMP_TO_EDGE;
            tex3.addressV = pc.ADDRESS_CLAMP_TO_EDGE;
            tex3.minFilter = pc.FILTER_LINEAR;
            tex3.magFilter = pc.FILTER_LINEAR;
            var targ3 = new pc.RenderTarget(device, tex3, {
                depth: false
            });
            this.tex3 = tex3;
            this.targ3 = targ3;
            
            var tex4 = new pc.Texture(device, {
              width:32,
              height:32,
              format:pc.PIXELFORMAT_R8_G8_B8_A8,
              autoMipmap:false,
              rgbm:false});
            tex4.addressU = pc.ADDRESS_CLAMP_TO_EDGE;
            tex4.addressV = pc.ADDRESS_CLAMP_TO_EDGE;
            tex4.minFilter = pc.FILTER_LINEAR;
            tex4.magFilter = pc.FILTER_LINEAR;
            var targ4 = new pc.RenderTarget(device, tex4, {
                depth: false
            });
            this.tex4 = tex4;
            this.targ4 = targ4;
            
            /*var tex5 = new pc.Texture(device, {
              width:16,
              height:16,
              format:pc.PIXELFORMAT_R8_G8_B8_A8,
              autoMipmap:false,
              rgbm:false});
            tex5.addressU = pc.ADDRESS_CLAMP_TO_EDGE;
            tex5.addressV = pc.ADDRESS_CLAMP_TO_EDGE;
            tex5.minFilter = pc.FILTER_LINEAR;
            tex5.magFilter = pc.FILTER_LINEAR;
            var targ5 = new pc.RenderTarget(device, tex5, {
                depth: false
            });
            this.tex5 = tex5;
            this.targ5 = targ5;
            
            var tex6 = new pc.Texture(device, {
              width:8,
              height:8,
              format:pc.PIXELFORMAT_R8_G8_B8_A8,
              autoMipmap:false,
              rgbm:false});
            tex6.addressU = pc.ADDRESS_CLAMP_TO_EDGE;
            tex6.addressV = pc.ADDRESS_CLAMP_TO_EDGE;
            tex6.minFilter = pc.FILTER_LINEAR;
            tex6.magFilter = pc.FILTER_LINEAR;
            var targ6 = new pc.RenderTarget(device, tex6, {
                depth: false
            });
            this.tex6 = tex6;
            this.targ6 = targ6;*/
            
            //device.scope.resolve("texture_screenRefl").setValue(this.tex3);
            
            var camera = new pc.Entity();
            app.systems.camera.addComponent(camera, {
            });
            camera.camera.enabled = false;
            camera = camera.camera.camera;
            camera.setClearOptions({color:[0,0,0,0], depth:1, flags:pc.CLEARFLAG_DEPTH});
            camera._node.rotateLocal(90, 0, 0);
            camera.setFov(90);
            camera.setRenderTarget(this.targ);
            this.camera = camera;
            
            var encode = "\
gl_FragColor.rgb = pow(gl_FragColor.rgb, vec3(0.5));\
gl_FragColor.rgb /= 8.0;\
gl_FragColor.a = clamp( max( max( gl_FragColor.r, gl_FragColor.g ), max( gl_FragColor.b, 1.0 / 255.0 ) ), 0.0,1.0 );\
gl_FragColor.a = ceil(gl_FragColor.a * 255.0) / 255.0;\
gl_FragColor.rgb /= gl_FragColor.a;";
            
            var fade = "\
gl_FragColor.rgb *= 1.0 - min(square(vPositionW.y - view_position.y), 1.0);\
";
            
            for(var i=0; i<this.reflDips.length; i++) {
                var mat = this.reflDips[i].material;
                mat.chunks.transformVS = "\
uniform vec3 view_positionVs;\
mat4 getModelMatrix() {\
    return matrix_model;\
}\
vec4 getPosition() {\
    dModelMatrix = getModelMatrix();\
    vec4 posW = dModelMatrix * vec4(vertex_position, 1.0);\
    dPositionW = posW.xyz;\
    posW.xyz -= view_positionVs;\
            posW.y *= 5.0;\
    vec4 pos = vec4(posW.xzy, 1.0);\
        float L = length(pos.xyz);\
        pos /= L;\
        pos.z += 1.0;\
        pos.xy /= pos.z;\
        float near = 0.01;\
        float far = 100.0;\
        pos.z = (L - near) / (far - near);\
        pos.w = 1.0;\
    return pos;\
}\
vec3 getWorldPosition() {\
    return dPositionW;\
}";             
                mat.chunks.endPS = pc.shaderChunks.endPS + (mat.name==="SlotRefl"? fade : "") + encode;
                mat.chunks.outputAlphaOpaquePS = "//";
                mat.update();
            }
            
            var chunks = pc.shaderChunks;
            var downsample2 = "\
varying vec2 vUv0;\
uniform sampler2D source;\
void main(void) {\
    float offset = 1.0 / 256.0;\
    vec3 c = texture2DRGBM(source, vUv0);\
    c += texture2DRGBM(source, vUv0 + vec2(0.0, -offset));\
    c += texture2DRGBM(source, vUv0 + vec2(-offset, 0.0));\
    c += texture2DRGBM(source, vUv0 + vec2(offset, 0.0));\
    c += texture2DRGBM(source, vUv0 + vec2(0.0, offset));\
    gl_FragColor = vec4(c / 5.0, 1.0);";
            
            var downsample3 = downsample2.replace("256", "128");
            var downsample4 = downsample2.replace("256", "64");
            /*var downsample5 = downsample2.replace("256", "32");
            var downsample6 = downsample2.replace("256", "16");*/
            
            this.downsampleShader2 = chunks.createShaderFromCode(device, chunks.fullscreenQuadVS, chunks.rgbmPS + downsample2 + encode + "}", "downsample2");
            this.downsampleShader3 = chunks.createShaderFromCode(device, chunks.fullscreenQuadVS, chunks.rgbmPS + downsample3 + encode + "}", "downsample3");
            this.downsampleShader4 = chunks.createShaderFromCode(device, chunks.fullscreenQuadVS, chunks.rgbmPS + downsample4 + encode + "}", "downsample4");
            /*this.downsampleShader5 = chunks.createShaderFromCode(device, chunks.fullscreenQuadVS, chunks.rgbmPS + downsample5 + encode + "}", "downsample5");
            this.downsampleShader6 = chunks.createShaderFromCode(device, chunks.fullscreenQuadVS, chunks.rgbmPS + downsample6 + encode + "}", "downsample6");*/
            this.constantView = device.scope.resolve("view_positionVs");
            this.constantSource = device.scope.resolve("source");
        },
        
        // Called every frame, dt is time in seconds since last update
        postUpdate: function (dt) {
            if (!app.scene._activeCamera) return;
            //return;
            
            var oldDips = app.scene.drawCalls;
            var origGamma = app.scene.gammaCorrection;
            var origTonemap = app.scene.toneMapping;
            var origExposure = app.scene.exposure;
            
            app.scene.gammaCorrection = 0;
            app.scene.toneMapping = 0;
            app.scene.exposure = 1.0;
            app.scene.drawCalls = this.reflDips;
            if (this.firstTime) {
                this.firstTime = false;
            } else {
                app.scene.updateShaders = false; // hack
            }
            
            var device = app.graphicsDevice;
            this.posCam.copy(this.entity.getPosition());
            if (this.posCam.y < 3.3 || (this.posCam.lengthSq() < 419 && this.vec.copy(this.posCam).normalize().dot(this.entity.forward) < -0.9) || this.posCam.lengthSq() < 333) {
                this.posCam.y = 1.8;
            } else {
                this.posCam.y = 3.75;//4.3;
            }
            this.constantView.setValue(this.posCam.data);
            this.camera._node.setPosition(this.posCam);
            app.renderer.render(app.scene, this.camera);
            
            this.constantSource.setValue(this.tex);
            pc.drawQuadWithShader(device, this.targ2, this.downsampleShader2);
            
            this.constantSource.setValue(this.tex2);
            pc.drawQuadWithShader(device, this.targ3, this.downsampleShader3);
            
            this.constantSource.setValue(this.tex3);
            pc.drawQuadWithShader(device, this.targ4, this.downsampleShader4);
            
            /*this.constantSource.setValue(this.tex4);
            pc.drawQuadWithShader(device, this.targ5, this.downsampleShader5);
            
            this.constantSource.setValue(this.tex5);
            pc.drawQuadWithShader(device, this.targ6, this.downsampleShader6);*/

            app.scene.gammaCorrection = origGamma;
            app.scene.toneMapping = origTonemap;
            app.scene.exposure = origExposure;
            app.scene.updateShaders = false; // hack
            
            app.scene.drawCalls = oldDips;
        }
    };

    return RenderReflection;
});