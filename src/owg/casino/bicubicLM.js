pc.script.attribute('lmRes', 'number', 1024);
pc.script.attribute('bicubic', 'boolean', true);
pc.script.attribute('specular', 'boolean', true);
pc.script.attribute('refl', 'boolean', true);

pc.script.create('bicubicLM', function (app) {
    // Creates a new BicubicLM instance
    var BicubicLM = function (entity) {
        this.entity = entity;
    };

    BicubicLM.prototype = {
        // Called once after all resources are loaded and before the first update
        postInitialize: function () {
            
			var meshes = this.entity.model.model.meshInstances;
            for(var i=0; i<meshes.length; i++) {
                var mat = meshes[i].material;
                if (mat.name==="Floor") {
                    meshes[i].setParameter("texture_screenRefl", app.reflection.tex4);
                } else {
                    meshes[i].setParameter("texture_screenRefl", app.reflection.tex2);
                }
                mat.chunks.lightmapSinglePS = "\
float w0(float a){\
    return (1.0/6.0)*(a*(a*(-a + 3.0) - 3.0) + 1.0);\
}\
float w1(float a){\
    return (1.0/6.0)*(a*a*(3.0*a - 6.0) + 4.0);\
}\
float w2(float a){\
    return (1.0/6.0)*(a*(a*(-3.0*a + 3.0) + 3.0) + 1.0);\
}\
float w3(float a){\
    return (1.0/6.0)*(a*a*a);\
}\
float g0(float a){\
    return w0(a) + w1(a);\
}\
float g1(float a){\
    return w2(a) + w3(a);\
}\
float h0(float a){\
    return -1.0 + w1(a) / (w0(a) + w1(a)) + 0.5;\
}\
float h1(float a){\
    return 1.0 + w3(a) / (w2(a) + w3(a)) + 0.5;\
}\
vec4 tex2DFastBicubic( sampler2D tex, vec2 uv, float res ){\
    float x = uv.x * res;\
    float y = uv.y * res;\
	x -= 0.5;\
	y -= 0.5;\
   \
    float px = floor(x);\
    float py = floor(y);\
    \
    float fx = x - px;\
    float fy = y - py;\
    \
    float g0x = g0(fx);\
    float g1x = g1(fx);\
    float h0x = h0(fx);\
    float h1x = h1(fx);\
    float h0y = h0(fy);\
    float h1y = h1(fy);\
\
    vec4 r = g0(fy) * ( g0x * texture2D(tex, vec2(px + h0x, py + h0y) * 1.0/res)   +\
                          g1x * texture2D(tex, vec2(px + h1x, py + h0y) * 1.0/res)) +\
                          \
               g1(fy) * ( g0x * texture2D(tex, vec2(px + h0x, py + h1y) * 1.0/res)   +\
                          g1x * texture2D(tex, vec2(px + h1x, py + h1y) * 1.0/res));\
    return r;\
}\
float getLightSpecular2() {\
    vec3 h = normalize( -dLightDirNormW + dViewDirW );\
    float nh = max( dot( h, dNormalW ), 0.0 );\
    float specPow = exp2(dGlossiness * 11.0);\
    specPow = antiAliasGlossiness(specPow);\
    specPow = max(specPow, 0.0001);\
    return pow(nh, specPow) * (specPow + 2.0) / 8.0;\
}\
uniform sampler2D texture_lightMap;\
uniform sampler2D texture_lightMapDir;\
void addLightMap() {" + (this.bicubic? "\
    dDiffuseLight = decodeRGBM(tex2DFastBicubic(texture_lightMap, $UV, "+this.lmRes+".0)).$CH;\
" : "dDiffuseLight = decodeRGBM(texture2D(texture_lightMap, $UV)).$CH;") + (this.specular? "\
    vec4 bakedLight = texture2D(texture_lightMapDir, $UV);\
    dLightDirNormW = bakedLight.xyz * 2.0 - vec3(1.0);\
    float atten = bakedLight.w;\
    dSpecularLight = getLightSpecular2() * dDiffuseLight * atten;" : "") + "\
}\n";

                if (this.reflOld) {
                    
                    mat.chunks.transformVS = "\
varying vec4 vPositionV;\
mat4 getModelMatrix() {\
    return matrix_model;\
}\
vec4 getPosition() {\
    dModelMatrix = getModelMatrix();\
    vec4 posW = dModelMatrix * vec4(vertex_position, 1.0);\
    dPositionW = posW.xyz;\
    vPositionV = matrix_viewProjection * posW;\
    return vPositionV;\
}\
vec3 getWorldPosition() {\
    return dPositionW;\
}\
";
                    
                    mat.chunks.reflectionCubePS = "\
varying vec4 vPositionV;\
uniform sampler2D texture_screenRefl;\
uniform float material_reflectivity;\
void addReflection() {\
    vec2 tc = (vPositionV.xy / vPositionV.w) * 0.5 + 0.5;\
    vec3 lookupVec = fixSeams(cubeMapProject(dReflDirW));\
    dReflection = texture2D(texture_screenRefl, tc);\
}\
";
                    mat.chunks.endPS = "gl_FragColor.rgb = dReflection.rgb;";
                }
                
                if (this.refl) {
                    mat.chunks.reflectionCubePS = "\
uniform sampler2D texture_screenRefl;\
uniform float material_reflectivity;\
void addReflection() {\
    vec3 R = dReflDirW;\
    vec2 tc;\
    tc.x = (R.x / (2.0*(1.0 + R.y))) + 0.5;\
    tc.y = 1.0-((-R.z / (2.0*(1.0 + R.y))) + 0.5);\
    dReflection = texture2D(texture_screenRefl, tc);\
    dReflection.rgb *= dReflection.a * 8.0;\
    dReflection.rgb *= dReflection.rgb;\
    dReflection.a = saturate(R.y * 10.0);\
    dReflection.a *= min(dAo * dAo * dAo * dAo, 0.25) * material_reflectivity;\
}\
";
                    mat.chunks.aoTexPS = "\
uniform sampler2D texture_aoMap;\
void applyAO() {\
    dAo = texture2D(texture_aoMap, $UV).$CH;\
}";
                 //mat.chunks.endPS = "gl_FragColor.rgb = data.reflection.rgb * data.reflection.a;";
                }

                
                if (this.specular || this.refl) mat.cubeMap = new pc.Texture();
                mat.update();
            }
            
        },

        // Called every frame, dt is time in seconds since last update
        update: function (dt) {
        }
    };

    return BicubicLM;
});