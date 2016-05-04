pc.script.create('lightProbe', function (app) {
    // Creates a new LightProbe instance
    var LightProbe = function (entity) {
        this.entity = entity;
    };

    LightProbe.prototype = {
        
        renderCubemap: function(pos, size) {
            console.log("Rendering cubemap");
            var cubemap = new pc.Texture(app.graphicsDevice, {
                format: pc.gfx.PIXELFORMAT_R8_G8_B8_A8,
                width: size,
                height: size,
                cubemap: true
            });
            cubemap.minFilter = pc.gfx.FILTER_LINEAR;
            cubemap.magFilter = pc.gfx.FILTER_LINEAR;
            cubemap.addressU = pc.gfx.ADDRESS_CLAMP_TO_EDGE;
            cubemap.addressV = pc.gfx.ADDRESS_CLAMP_TO_EDGE;

            var targets = [];
            for (var i = 0; i < 6; i++) {
                var target = new pc.gfx.RenderTarget(app.graphicsDevice, cubemap, {
                    face: i,
                    depth: true
                });
                targets.push(target);
            }

			var camera = app._cubeCamera;
			if (!camera) {
                camera = new pc.Entity();
                app._cubeCameraEntity = camera;
                app.systems.camera.addComponent(camera, {
                });
                camera = camera.camera.camera;
                camera.setAspectRatio(1);
                camera.setNearClip(0.01);
                camera.setFov(90);
                app._cubeCamera = camera;
			}
            
            var lookAts = [
              { target: new pc.Vec3(1, 0, 0), up: new pc.Vec3(0,-1, 0)},
              { target: new pc.Vec3(-1, 0, 0), up: new pc.Vec3(0,-1, 0)},
              { target: new pc.Vec3( 0, 1, 0), up: new pc.Vec3(0, 0, 1)},
              { target: new pc.Vec3( 0,-1, 0), up: new pc.Vec3(0, 0,-1)},
              { target: new pc.Vec3( 0, 0, 1), up: new pc.Vec3(0,-1, 0)},
              { target: new pc.Vec3( 0, 0,-1), up: new pc.Vec3(0,-1, 0)}
            ];
            camera._node.setPosition(pos);

            for (var face = 0; face < 6; face++) {
                // Set the face of the cubemap
                camera.setRenderTarget(targets[face]);

                // Point the camera in the right direction
                camera._node.lookAt(lookAts[face].target.add(pos), lookAts[face].up);

                // Render the scene
                app.renderer.render(app.scene, camera);
                this.syncCubemap(targets[face], face);
            }
            
            app._cubeCameraEntity.enabled = false;
            return cubemap;
        },
        
        syncCubemap: function(target, face) {
            var tex = target._colorBuffer;
            var pixels = new Uint8Array(tex.width * tex.height * 4);
            var gl = app.graphicsDevice.gl;
            gl.bindFramebuffer(gl.FRAMEBUFFER, target._glFrameBuffer);
            gl.readPixels(0, 0, tex.width, tex.height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
            if (!tex._levels) tex._levels = [];
            if (!tex._levels[0]) tex._levels[0] = [];
            tex._levels[0][face] = pixels;
        },
        
        genShName: function (pos) {
            return (pos.x + "").substr(0,10) + (pos.y + "").substr(0,10) + (pos.z + "").substr(0,10);
        },
        
        saveSh: function (pos, sh) {
            var json = JSON.stringify(sh);
            var fname = this.genShName(pos);
            fname = "http://localhost:8080/user/storage.php?n=" + fname + "&e=json";
            console.log("Attempting to save " + fname);
            var req = new XMLHttpRequest();
            req.open("POST", fname, true);
            req.send(json);
        },
        
        parseSh: function (json) {
            var i = 0;
            while(json[i]!==undefined) i++;
            var count = i;
            var arr = new Float32Array(count);
            for(i=0; i<count; i++) arr[i] = json[i];
            return arr;
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
        
        saveDp: function (pos, dp) {
            var fname = "dp" + this.genShName(pos);
            fname = "http://localhost:8080/user/storage.php?n=" + fname + "&e=dds";
            console.log("Attempting to save " + fname);
            var req = new XMLHttpRequest();
            req.open("POST", fname, true);
            this.syncTex2d(dp);
            req.send(dp.getDds());
        },
        
        /*loadSh: function (pos, id) {
            var fname = (pos.x + "").substr(10) + (pos.y + "").substr(10) + (pos.z + "").substr(10);
            fname = "http://geom.io/user/storage/" + fname + ".zip";
            console.log("Attempting to load " + fname);
            var req = new XMLHttpRequest();
            req.open("GET", fname, true);
            req.responseType = "arraybuffer";
            req.onload = function (ev) {
              var buff = req.response;
              if (buff) {
                  app.waitForResource--;
                  buff = new Float32Array(buff);
                  console.log(buff);
                  app._probeLoaded[id] = buff;
              }
            };
            req.onreadystatechange = function (ev) {
              if (req.readyState >= 4) {
                  if (req.status!==200) {
                      app.waitForResource--;
                      console.log("Can't load file " + fname);
                  }
              }
            };
            req.send(null);
        },*/
        
        generateEnvProbes: function(positions, modes) {
            // Setup shaders to render RGBM
            var origGamma = app.scene.gammaCorrection;
            var origTonemap = app.scene.toneMapping;
            var origExposure = app.scene.exposure;
            app.scene.gammaCorrection = 0;
            app.scene.toneMapping = 0;
            app.scene.exposure = 1.0;
            var dips = app.scene.drawCalls;
            var oldEndPS = [];
            var i, m;
            for(i=0; i<dips.length; i++) {
                m = dips[i].material;
                oldEndPS.push(m.chunks.endPS);
            }
            for(i=0; i<dips.length; i++) {
                m = dips[i].material;
                if (m) {
                    m.chunks.endPS = pc.shaderChunks.endPS + "gl_FragColor.rgb = pow(gl_FragColor.rgb, vec3(0.5));\
                                                            gl_FragColor.rgb /= 8.0;\
                                                            gl_FragColor.a = clamp( max( max( gl_FragColor.r, gl_FragColor.g ), max( gl_FragColor.b, 1.0 / 255.0 ) ), 0.0,1.0 );\
                                                            gl_FragColor.a = ceil(gl_FragColor.a * 255.0) / 255.0;\
                                                            gl_FragColor.rgb /= gl_FragColor.a;";
                    m.chunks.outputAlphaOpaquePS = "//";
                    m.chunks.outputAlphaPS = "gl_FragColor.a = 0.0;";
                    m.chunks.outputAlphaPremulPS = "gl_FragColor.a = 0.0;";
                    m.update();
                }
            }
            
            // Generate
            var cubemaps = [];
            var sh = [];
            var dp = [];
            var pmrem = [];
            for(i=0; i<positions.length; i++) {

                cubemaps[i] = null;
                var cached;
                if (modes[i]===0) {
                    cached = app.assets.find(this.genShName(positions[i]));
                    if (cached) {
                        sh[i] = this.parseSh(cached.resource);
                        console.log("Probe loaded from cache");
                    } else {
                        cubemaps[i] = this.renderCubemap(positions[i], modes[i]===0? 32 : 128);
                        cubemaps[i].rgbm = true;
                        sh[i] = pc.shFromCubemap(cubemaps[i], true); this.saveSh(positions[i], sh[i]);
                    }
                    dp[i] = null;
                    pmrem[i] = null;
                } else {
                    sh[i] = null;
                    cached = app.assets.find("dp" + this.genShName(positions[i]));
                    if (cached) {
                        pmrem[i] = null;
                        dp[i] = cached.resource;
                        dp[i].rgbm = true;
                        dp[i].minFilter = pc.FILTER_LINEAR;
                        dp[i].magFilter = pc.FILTER_LINEAR;
                        dp[i].addressU = pc.ADDRESS_CLAMP_TO_EDGE;
                        dp[i].addressV = pc.ADDRESS_CLAMP_TO_EDGE;
                        console.log("Reflection loaded from cache");
                    } else {
                        cubemaps[i] = this.renderCubemap(positions[i], modes[i]===0? 32 : 128);
                        cubemaps[i].rgbm = true;
                        var options = {
                            device: app.graphicsDevice,
                            sourceCubemap: cubemaps[i],
                            method: 0,
                            samples: 256,
                            cpuSync: false,
                            filteredFixed: []
                        };
                        pc.prefilterCubemap(options);
                        pmrem[i] = [cubemaps[i],
                                                               options.filteredFixed[0],
                                                               options.filteredFixed[1],
                                                               options.filteredFixed[2],
                                                               options.filteredFixed[3],
                                                               options.filteredFixed[4]];
                        var dpTex = pc.generateDpAtlas(app.graphicsDevice, pmrem[i], true);
                        dpTex.rgbm = true;
                        dp[i] = dpTex;
                        this.saveDp(positions[i], dp[i]);
                    }
                }
            }
            
            // Roll back shader changes
            app.scene.gammaCorrection = origGamma;
            app.scene.toneMapping = origTonemap;
            app.scene.exposure = origExposure;
            for(i=0; i<dips.length; i++) {
                m = dips[i].material;
                if (m) {
                    m.chunks.endPS = oldEndPS[i];
                    m.chunks.outputAlphaOpaquePS = null;
                    m.chunks.outputAlphaPS = null;
                    m.chunks.outputAlphaPremulPS = null;
                    m.update();
                }
            }
        
            return {cubemaps:cubemaps, sh:sh, dp:dp, pmrem:pmrem};
        },
        
        setupTestMaterial: function () {
            var mesh = this.entity.model.model.meshInstances[0];
            var mat = mesh.material;
            
            /*mat.cubeMap = new pc.Texture();
            mat.cubeMap.rgbm = true;
            mat.diffuse = new pc.Color(0,0,0);
            mat.specular = new pc.Color(1,1,1);
            mat.shininess = 100;
            mat.chunks.reflectionCubePS = "uniform samplerCube texture_cubeMap;\
                                            uniform float material_reflectivity;\
                                            void addReflection(inout psInternalData data) {\
                                                vec3 lookupVec = fixSeams(cubeMapProject(data.reflDirW));\
                                                data.reflection += vec4($textureCubeSAMPLE(texture_cubeMap, lookupVec).rgb, material_reflectivity);\
                                            }";*/
                                            
            mat.diffuse = new pc.Color(1,1,1);
            mat.specular = new pc.Color(0,0,0);
            mat.shininess = 0;
            mat.ambientSH = new Float32Array(9 * 3);
            mat.update();
        },
        
        // Called once after all resources are loaded and before the first update
        initialize: function () {
            if (!app._probePos) {
                app._probePos = [];
                app._probeMode = [];
                app._probeReceivers = [];
                app._probeInstancePos = [];
            }
            this.setupTestMaterial();
            var mesh = this.entity.model.model.meshInstances[0];
            var pos = this.entity.getPosition();
            
            /*if (app.waitForResource===undefined) app.waitForResource = 0;
            app.waitForResource++;
            this.loadSh(pos, app._probePos.length);*/

            app._probePos.push(pos);
            app._probeMode.push(0);
            app._probeReceivers.push([mesh]);
            app._probeInstancePos.push(pos);
        },
        
        findClosestReflection: function (pos) {
            var minProbe = 0;
            var minDist = Number.MAX_VALUE;
            for(var j=0; j<app._probePos.length; j++) {
                if (app._probeMode[j]===1) {
                    var s = pos.clone().sub(app._probePos[j]);
                    var dist = s.dot(s);
                    if (dist < minDist) {
                        minProbe = j;
                        minDist = dist;
                    }
                }
            }
            return minProbe;
        },
        
        postInitialize: function () {

            if (app._probePos) {
                var i, j, rcv;
                for(i=0; i<app._probeReceivers.length; i++) {
                    rcv = app._probeReceivers[i];
                    for(j=0; j<rcv.length; j++) {
                        rcv[j]._hidden = true; // hide receivers
                    }
                }
                if (app._reflReceivers) {
                    for(i=0; i<app._reflReceivers.length; i++) {
						app._reflReceivers[i]._hidden = true;
                    }
                }
                
                //while(app.waitForResource > 0) { console.log(app.waitForResource); } // OMG
                app._probes = this.generateEnvProbes(app._probePos, app._probeMode);
                
                for(i=0; i<app._probePos.length; i++) {
                    app._probePos[i] = app._probeInstancePos[i];
                }
                
                for(i=0; i<app._probeReceivers.length; i++) {
                    var sh = app._probes.sh[i];
                    var dp = app._probes.dp[i];
                    rcv = app._probeReceivers[i];
                    for(j=0; j<rcv.length; j++) {
                        //rcv[j]._hidden = false; // show receivers
                        if (app._probeMode[i]===0) {
                            rcv[j]._hidden = false; // show receivers
                            rcv[j].setParameter("ambientSH[0]", sh);
                            //rcv[j].setParameter("texture_cubeMap", app._probes.cubemaps[i]);
                        } else {
                            rcv[j].setParameter("texture_sphereMap", dp);
                            //rcv[j].setParameter("texture_cubeMap", app._probes.cubemaps[i]);
                            /*rcv[j].setParameter("texture_prefilteredCubeMap128", app._probes.pmrem[i][0]);
                            rcv[j].setParameter("texture_prefilteredCubeMap64", app._probes.pmrem[i][1]);
                            rcv[j].setParameter("texture_prefilteredCubeMap32", app._probes.pmrem[i][2]);
                            rcv[j].setParameter("texture_prefilteredCubeMap16", app._probes.pmrem[i][3]);
                            rcv[j].setParameter("texture_prefilteredCubeMap8", app._probes.pmrem[i][4]);
                            rcv[j].setParameter("texture_prefilteredCubeMap4", app._probes.pmrem[i][5]);*/
                        }
                    }
                }
                if (app._reflReceivers) {
                    for(i=0; i<app._reflReceivers.length; i++) {
						var m = app._reflReceivers[i];
                        m._hidden = false;
                        m.node.getWorldTransform();
                        var c = this.findClosestReflection(m.aabb.center);
                        var dp2 = app._probes.dp[c];
                        dp2.minFilter = pc.gfx.FILTER_LINEAR;
                        dp2.magFilter = pc.gfx.FILTER_LINEAR;
                        dp2.addressU = pc.gfx.ADDRESS_CLAMP_TO_EDGE;
                        dp2.addressV = pc.gfx.ADDRESS_CLAMP_TO_EDGE;
                        if (dp2) {
                            m.setParameter("texture_sphereMap", dp2);
                            /*m.setParameter("texture_prefilteredCubeMap128", app._probes.pmrem[c][0]);
                            m.setParameter("texture_prefilteredCubeMap64", app._probes.pmrem[c][1]);
                            m.setParameter("texture_prefilteredCubeMap32", app._probes.pmrem[c][2]);
                            m.setParameter("texture_prefilteredCubeMap16", app._probes.pmrem[c][3]);
                            m.setParameter("texture_prefilteredCubeMap8", app._probes.pmrem[c][4]);
                            m.setParameter("texture_prefilteredCubeMap4", app._probes.pmrem[c][5]);*/
                        } else {
                            console.log("Can't find reflection for " + m.node.name);
                        }
                    }
                }
                app._probePos = null;
                app._probeReceivers = null;
                app._probeInstancePos = null;
                app._reflReceivers = null;
            }
        },
        
        // Called every frame, dt is time in seconds since last update
        update: function (dt) {
        }
    };

    return LightProbe;
});