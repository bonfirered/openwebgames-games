pc.script.attribute('sphereSize', 'number', 1);
pc.script.attribute('reflMult', 'number', 1);

pc.script.create('bakeLight', function (app) {
    // Creates a new BakeLight instance
    var BakeLight = function (entity) {
        this.entity = entity;
        this.directional = false;
        this.directional01 = true;
        
        if (!app.bakeLight) {
            app.bakeLight = [];
        }
        app.bakeLight.push(this);
        app.lightBaked = false;
    };

    BakeLight.prototype = {
        
        syncToCpu: function (targ) {
            var tex = targ._colorBuffer;
            var pixels = new Uint8Array(tex.width * tex.height * 4);
            var gl = app.graphicsDevice.gl;
            gl.bindFramebuffer(gl.FRAMEBUFFER, targ._glFrameBuffer);
            gl.readPixels(0, 0, tex.width, tex.height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
            if (!tex._levels) tex._levels = [];
            if (!tex._levels[0]) tex._levels[0] = [];
            tex._levels[0] = pixels;
        },
        
        AddLightSphere: function () {
            var sph = new pc.Entity();
            sph.setPosition(this.entity.getPosition());
            sph.setLocalScale(new pc.Vec3(this.sphereSize, this.sphereSize, this.sphereSize));
            app.systems.model.addComponent(sph, {
                type: "sphere"
            });
            app.root.addChild(sph);
            sph.model.model.meshInstances[0].node.getWorldTransform(); // force recalc this shit
            var mat = new pc.PhongMaterial();
            mat.diffuse = new pc.Color(0,0,0);
            mat.specular = new pc.Color(0,0,0);
            mat.shininess = 0;
            mat.emissive = this.entity.light.light.getColor();
            mat.emissiveIntensity = this.entity.light.light.getIntensity() * 64 * this.reflMult;
            mat.update();
            sph.model.model.meshInstances[0].material = mat;
        },
        
        syncTex2d: function (tex) {
            var gl = app.graphicsDevice.gl;
            var fb = gl.createFramebuffer();
            var pixels = new Uint8Array(tex.width * tex.height * 4);
            gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
            gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex._glTextureId, 0);
            gl.readPixels(0, 0, tex.width, tex.height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
            if (!tex._levels) tex._levels = [];
            tex._levels[0] = pixels;
        },
        
        Run: function () {
            
            console.log("bakeLight::Run");
            
            if (app.lightBaked) {
                this.entity.enabled = false;
                this.AddLightSphere();
                return;
            }
            
            var device = app.graphicsDevice;
            var chunks = pc.shaderChunks;
            
            var xformUv1 = "\
mat4 getModelMatrix() {\
    return matrix_model;\
}\
vec4 getPosition() {\
    dModelMatrix = getModelMatrix();\
    vec4 posW = dModelMatrix * vec4(vertex_position, 1.0);\
    dPositionW = posW.xyz;\
    return vec4(vertex_texCoord1.xy * 2.0 - 1.0, 0.5, 1);\
}\
vec3 getWorldPosition() {\
    return dPositionW;\
}\
            ";
            var xformUv0 = xformUv1.replace("vertex_texCoord1", "vertex_texCoord0");
            
            var bakeLmEnd = chunks.endPS + "\
gl_FragColor.rgb = dDiffuseLight;\
gl_FragColor.rgb = pow(gl_FragColor.rgb, vec3(0.5));\
gl_FragColor.rgb /= 8.0;\
gl_FragColor.a = clamp( max( max( gl_FragColor.r, gl_FragColor.g ), max( gl_FragColor.b, 1.0 / 255.0 ) ), 0.0,1.0 );\
gl_FragColor.a = ceil(gl_FragColor.a * 255.0) / 255.0;\
gl_FragColor.rgb /= gl_FragColor.a;";
            
            var bakeLmEndHDR = chunks.endPS + "\
gl_FragColor.rgb = dDiffuseLight / 100.0;";
            
            // return no diffuse falloff
            var lightDiffuseLambertBakeDir = "\
float getLightDiffuse() {\
    return 1.0;\
}";
            // accumulate shadowed direction
            var lightSpecularBlinnBakeDir = "\
float getLightSpecular() {\
    dSpecularLight += dLightDirNormW * dAtten;\
    return 0.0;\
}";
            var bakeDirEnd = "\
gl_FragColor.rgb = normalize(dSpecularLight) * 0.5 + vec3(0.5);\
gl_FragColor.a = min(length(dSpecularLight), 1.0);\
";
            var bakeDirEndHDR = "\
gl_FragColor.rgb = dSpecularLight;\
gl_FragColor.a = 1.0;\
";
            
            var dilate = "\
varying vec2 vUv0;\
uniform sampler2D source;\
uniform vec2 pixelOffset;\
void main(void) {\
    vec4 c = texture2D(source, vUv0);\
    c = c.a>0.0? c : texture2D(source, vUv0 - pixelOffset);\
    c = c.a>0.0? c : texture2D(source, vUv0 + vec2(0, -pixelOffset.y));\
    c = c.a>0.0? c : texture2D(source, vUv0 + vec2(pixelOffset.x, -pixelOffset.y));\
    c = c.a>0.0? c : texture2D(source, vUv0 + vec2(-pixelOffset.x, 0));\
    c = c.a>0.0? c : texture2D(source, vUv0 + vec2(pixelOffset.x, 0));\
    c = c.a>0.0? c : texture2D(source, vUv0 + vec2(-pixelOffset.x, pixelOffset.y));\
    c = c.a>0.0? c : texture2D(source, vUv0 + vec2(0, pixelOffset.y));\
    c = c.a>0.0? c : texture2D(source, vUv0 + pixelOffset);\
    gl_FragColor = c;\
}\
";
            var hdr2rgbm = "\
varying vec2 vUv0;\
uniform sampler2D source;\
void main(void) {\
    gl_FragColor = texture2D(source, vUv0) * 100.0;\
    if (gl_FragColor.a > 0.001) {\
        gl_FragColor.rgb = pow(gl_FragColor.rgb, vec3(0.5));\
        gl_FragColor.rgb /= 8.0;\
        gl_FragColor.a = clamp( max( max( gl_FragColor.r, gl_FragColor.g ), max( gl_FragColor.b, 1.0 / 255.0 ) ), 0.0,1.0 );\
        gl_FragColor.a = ceil(gl_FragColor.a * 255.0) / 255.0;\
        gl_FragColor.rgb /= gl_FragColor.a;\
    }\
}";   
            var dirNorm = "\
varying vec2 vUv0;\
uniform sampler2D source;\
void main(void) {\
    gl_FragColor = texture2D(source, vUv0);\
    gl_FragColor.w = min(length(gl_FragColor.xyz), 1.0);\
    gl_FragColor.xyz = normalize(gl_FragColor.xyz) * 0.5 + vec3(0.5);\
}";   
            var oldSnippet = pc.programlib.getSnippet;
            pc.programlib.getSnippet = function (device, id) {
                if (id==="fs_clamp") return "";
                return oldSnippet(device, id);
            }
            
            var fillShader = chunks.createShaderFromCode(device, chunks.fullscreenQuadVS, chunks.fullscreenQuadPS, "fsQuadSimple");
            var dilateShader = chunks.createShaderFromCode(device, chunks.fullscreenQuadVS, dilate, "lmDilate");
            var rgbmShader = chunks.createShaderFromCode(device, chunks.fullscreenQuadVS, hdr2rgbm, "hdr2rgbm");
            var dirNormShader = chunks.createShaderFromCode(device, chunks.fullscreenQuadVS, dirNorm, "dirNorm");
            var constantTexSource = device.scope.resolve("source");
            var constantPixelOffset = device.scope.resolve("pixelOffset");
            var i;
            
            /*for(i=0; i<app.distCull.lods.length; i++) {
                app.distCull.lods[i]._hidden = true;
            }*/
            
            // Collect scene lightmaps
            var lms = {};
            var lm, m, mat;
            var dips = app.scene.drawCalls;
            for(i=0; i<dips.length; i++) {
                m = dips[i];
                if ((m._shaderDefs & pc.SHADERDEF_UV1)===0) continue;
                lm = m.material.lightMap; // get from material
                //if (lm) {
                    var lmOverride = m.parameters.texture_lightMap; // or from meshInstance
                    if (lmOverride) lm = lmOverride.data;
                //}
                if (lm) {
                    if (!lms[lm.name]) {
                        lms[lm.name] = {lm:lm, receivers:[m]};
                    } else {
                        lms[lm.name].receivers.push(m);
                    }
                }
            }
            
            // Disable scene stuff
            var origGamma = app.scene.gammaCorrection;
            var origTonemap = app.scene.toneMapping;
            var origExposure = app.scene.exposure;
            var origFog = app.scene.fog;
            var origDrawCalls = app.scene.drawCalls;
            app.scene.gammaCorrection = 0;
            app.scene.toneMapping = 0;
            app.scene.exposure = 1.0;
            app.scene.fog = pc.FOG_NONE;
            
            // Create pseudo-camera
			var camera = app._lmCamera;
			if (!camera) {
                camera = new pc.Entity();
                app._lmCameraEntity = camera;
                app.systems.camera.addComponent(camera, {
                });
                camera = camera.camera.camera;
                camera.setClearOptions({color:null, depth:1, flags:0});
                app._lmCamera = camera;
			}
            
            for(var lmName in lms) {
                var lightmap = lms[lmName];
                lm = lightmap.lm;
                rcv = lightmap.receivers;
                
                
                // Collect receiver draw calls using this lightmap
                app.scene.drawCalls = [];
                for(i=0; i<rcv.length; i++) {
                    m = rcv[i];
                    mat = m.material;
                    
                    // patch material
                    mat.chunks.transformVS = mat.lightMapUv? xformUv1 : xformUv0;
                        
                        //mat.chunks.endPS = bakeLmEnd;
                        //mat.chunks.outputAlphaOpaquePS = "//";
                    
                        mat.chunks.endPS = bakeLmEndHDR;
                        if (mat.blendType===pc.BLEND_NONE) mat.blendType = pc.BLEND_ADDITIVE;
                        mat.ambient = new pc.Color(0,0,0,0);
                    
                    mat.chunks.outputAlphaPS = "gl_FragColor = vec4(0.0);";
                    mat.chunks.outputAlphaPremulPS = "gl_FragColor = vec4(0.0);";
                    mat.update();
                    
                    app.scene.drawCalls.push(m);
                }
                
                // Create temporary HDR LM
                var texHDR = new pc.Texture(device, {width:lm.width, 
                                                  height:lm.height, 
                                                  format:pc.PIXELFORMAT_RGBA16F, 
                                                  autoMipmap:true, 
                                                  rgbm:false});
                texHDR.addressU = lm.addressU;
                texHDR.addressV = lm.addressV;
                var targHDR = new pc.RenderTarget(device, texHDR, {
                    depth: false
                });
                
                // Create new LM
                var tex = new pc.Texture(device, {width:lm.width, 
                                                  height:lm.height, 
                                                  format:lm.format, 
                                                  autoMipmap:true, 
                                                  rgbm:true});
                tex.name = lm.name;
                tex.addressU = lm.addressU;
                tex.addressV = lm.addressV;
                var targ = new pc.RenderTarget(device, tex, {
                    depth: false
                });
                
                // Create 2nd LM for ping-pong
                var texTmp = new pc.Texture(device, {width:lm.width, 
                                                  height:lm.height, 
                                                  format:lm.format, 
                                                  autoMipmap:true, 
                                                  rgbm:true});
                texTmp.addressU = lm.addressU;
                texTmp.addressV = lm.addressV;
                var targTmp = new pc.RenderTarget(device, texTmp, {
                    depth: false
                });
                
                /*// Render original lightmap into new
                constantTexSource.setValue(lm);
                pc.drawQuadWithShader(device, targ, fillShader);*/
                
                /*// Render receivers with this LM
                camera.setRenderTarget(targ);
                app.renderer.render(app.scene, camera);*/
                
                // Accumulate lights into HDR texture
                camera.setRenderTarget(targHDR);
                for(i=0; i<app.scene._lights.length; i++) {
                    for(j=0; j<app.scene._lights.length; j++) {
                        app.scene._lights[j].setEnabled(false);
                    }
                    app.scene._lights[i].setEnabled(true);
                    app.scene._lights[i].setCastShadows(true);
                    app.renderer.render(app.scene, camera);
                    
                    if (i===0) {
                        for(j=0; j<rcv.length; j++) {
                            m = rcv[j];
                            mat = m.material;
                            mat.ambientTint = true; // disable lightmap for further iterations
                            mat.update();
                        }
                    }
                }
                
                // Encode HDR to RGBM
                constantTexSource.setValue(texHDR);
                pc.drawQuadWithShader(device, targ, rgbmShader);
                
                // Dilate
                var numDilates2x = 4; // 8 dilates
                var pixelOffset = new pc.Vec2(1/lm.width, 1/lm.height);
                constantPixelOffset.setValue(pixelOffset.data);
                for(i=0; i<numDilates2x; i++) {
                    constantTexSource.setValue(tex);
                    pc.drawQuadWithShader(device, targTmp, dilateShader);
                    
                    constantTexSource.setValue(texTmp);
                    pc.drawQuadWithShader(device, targ, dilateShader);
                }
                
                // force correct autoMipmap
                this.syncToCpu(targ);
                tex.upload();
                
                // --- Bake light direction (optionally)
                var texDir = null;
                if (this.directional || (this.directional01 && lmName==="01")) {
                    texDir = new pc.Texture(device, {width:lm.width, 
                      height:lm.height, 
                      format:pc.PIXELFORMAT_R8_G8_B8_A8,
                      autoMipmap:true, 
                      rgbm:false});
                    texDir.name = "LMDIR_" + lm.name;
                    texDir.addressU = lm.addressU;
                    texDir.addressV = lm.addressV;
                    var targDir = new pc.RenderTarget(device, texDir, {
                        depth: false
                    });
                    app.scene.drawCalls = [];
                    for(i=0; i<rcv.length; i++) {
                        m = rcv[i];
                        mat = m.material;
                        // patch mat
                        mat.chunks.transformVS = mat.lightMapUv? xformUv1 : xformUv0;
                        mat.chunks.lightDiffuseLambertPS = lightDiffuseLambertBakeDir;
                        mat.chunks.lightSpecularBlinnPS = lightSpecularBlinnBakeDir;
                        mat.chunks.endPS = bakeDirEndHDR;
                        mat.chunks.outputAlphaOpaquePS = "//\n";
                        //mat.chunks.outputAlphaPS = "//\n";
                        //mat.chunks.outputAlphaPremulPS = "//\n";
                        mat.update();
                        app.scene.drawCalls.push(m);
                    }                    
                    
                    /*texHDR = new pc.Texture(device, {width:lm.width, 
                                                      height:lm.height, 
                                                      format:pc.PIXELFORMAT_RGBA16F, 
                                                      autoMipmap:true, 
                                                      rgbm:false});
                    texHDR.addressU = lm.addressU;
                    texHDR.addressV = lm.addressV;
                    targHDR = new pc.RenderTarget(device, texHDR, {
                        depth: false
                    });*/
                    
                    /*var oangle = [];
                    for(i=0; i<app.scene._lights.length; i++) {
                        oangle.push(app.scene._lights[i].getOuterConeAngle());
                    }*/
                    
                    camera.setRenderTarget(targHDR);
                    for(i=0; i<app.scene._lights.length; i++) {
                        for(j=0; j<app.scene._lights.length; j++) {
                            app.scene._lights[j].setEnabled(false);
                            //app.scene._lights[j].setOuterConeAngle(90);
                        }
                        if (i===0) camera.setClearOptions({color:[0.0, 0.0, 0.0, 0.0], depth:1, flags:pc.CLEARFLAG_COLOR});
                        app.scene._lights[i].setEnabled(true);
                        app.scene._lights[i].setCastShadows(true);
                        app.renderer.render(app.scene, camera);
                        if (i===0) camera.setClearOptions({color:null, depth:1, flags:0});
                    }
                    
                    /*for(i=0; i<app.scene._lights.length; i++) {
                        app.scene._lights[i].setOuterConeAngle(oangle[i]);
                    }*/
                    
                    //constantTexSource.setValue(texHDR);
                    //pc.drawQuadWithShader(device, targDir, dirNormShader);
                    
                    //camera.setRenderTarget(targDir);
                    //app.renderer.render(app.scene, camera);
                    
                    var texHDRTmp = new pc.Texture(device, {width:lm.width, 
                                                      height:lm.height, 
                                                      format:pc.PIXELFORMAT_RGBA16F, 
                                                      autoMipmap:true, 
                                                      rgbm:false});
                    texHDRTmp.addressU = lm.addressU;
                    texHDRTmp.addressV = lm.addressV;
                    var targHDRTmp = new pc.RenderTarget(device, texHDRTmp, {
                        depth: false
                    });
                    
                    for(i=0; i<numDilates2x; i++) {
                        constantTexSource.setValue(texHDR);
                        pc.drawQuadWithShader(device, targHDRTmp, dilateShader);

                        constantTexSource.setValue(texHDRTmp);
                        pc.drawQuadWithShader(device, targHDR, dilateShader);
                    }
                    
                    constantTexSource.setValue(texHDR);
                    pc.drawQuadWithShader(device, targDir, dirNormShader);
                    
                    this.syncToCpu(targDir);
                    texDir.upload();
                }
                // ---
                
                // roll material back
                for(i=0; i<rcv.length; i++) {
                    m = rcv[i];
                    mat = m.material;
                    mat.chunks.transformVS = null;
                    mat.chunks.endPS = null;
                    mat.chunks.outputAlphaOpaquePS = null;
                    mat.chunks.outputAlphaPS = null;
                    mat.chunks.outputAlphaPremulPS = null;
                    if (mat.blendType===pc.BLEND_ADDITIVE) mat.blendType = pc.BLEND_NONE; // TODO: restore actual values
                    mat.ambientTint = false;
                    mat.update();
                }

                // Replace lightmap
                for(i=0; i<rcv.length; i++) {
                    rcv[i].setParameter("texture_lightMap", tex);
                    if (texDir) rcv[i].setParameter("texture_lightMapDir", texDir);
                }
                
                // Save results
                var fname = "LM2_" + lm.name;
                fname = "http://localhost:8080/user/storage.php?n=" + fname + "&e=dds";
                console.log("Attempting to save " + fname);
                var req = new XMLHttpRequest();
                req.open("POST", fname, true);
                this.syncTex2d(tex);
                req.send(tex.getDds());
                
                if (texDir) {
                    fname = "LMDIR_" + lm.name;
                    fname = "http://localhost:8080/user/storage.php?n=" + fname + "&e=dds";
                    console.log("Attempting to save " + fname);
                    req = new XMLHttpRequest();
                    req.open("POST", fname, true);
                    this.syncTex2d(texDir);
                    req.send(texDir.getDds());
                }
            }
            
            // Roll back scene stuff
            app.scene.drawCalls = origDrawCalls;
            app.scene.gammaCorrection = origGamma;
            app.scene.toneMapping = origTonemap;
            app.scene.exposure = origExposure;
            app.scene.fog = origFog;
            
            app._lmCameraEntity.enabled = false;
            this.entity.enabled = false;
            this.AddLightSphere();
            app.lightBaked = true;
            
        },

        // Called every frame, dt is time in seconds since last update
        update: function (dt) {
        }
    };

    return BakeLight;
});