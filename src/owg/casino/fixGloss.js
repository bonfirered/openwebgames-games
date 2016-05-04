pc.script.create('fixGloss', function (app) {
    // Creates a new FixGloss instance
    var FixGloss = function (entity) {
        this.entity = entity;
    };

    FixGloss.prototype = {
        // Called once after all resources are loaded and before the first update
        initialize: function () {
            
            // Fix incorrect mip selection for DP atlas
            
            var i;
            var dips = app.scene.drawCalls;
            for(i=0; i<dips.length; i++) {
                var mat = dips[i].material;
                mat.chunks.reflectionDpAtlasPS = "\
uniform sampler2D texture_sphereMap;\n\
uniform float material_reflectivity;\n\
vec2 getDpAtlasUv(vec2 uv, float mip) {\n\
    vec4 rect;\n\
    float sx = saturate(mip - 2.0);\n\
    rect.x = sx * 0.5;\n\
    float t = mip - rect.x * 6.0;\n\
    float i = 1.0 - rect.x;\n\
    rect.y = min(t * 0.5, 0.75) * i + rect.x;\n\
    float st = saturate(t);\n\
    rect.z = (1.0 - st * 0.5) * i;\n\
    rect.w = rect.z * 0.5;\n\
    float rcRectZ = 1.0 / rect.z;\n\
    float scaleFactor = 0.00390625 * rcRectZ;\n\
    vec2 scale = vec2(scaleFactor, scaleFactor * 2.0);\n\
    uv = uv * (vec2(1.0) - scale) + scale * 0.5;\n\
    uv = uv * rect.zw + rect.xy;\n\
    return uv;\n\
}\n\
void addReflection() {\n\
    vec3 reflDir = normalize(cubeMapProject(dReflDirW));\n\
    bool up = reflDir.y > 0.0;\n\
    float scale = 0.90909090909090909090909090909091;\n\
    vec3 reflDirWarp = reflDir.xzx * vec3(-0.25, 0.5, 0.25);\n\
    float reflDirVer = abs(reflDir.y) + 1.0;\n\
    reflDirWarp /= reflDirVer;\n\
    reflDirWarp *= scale;\n\
    reflDirWarp = vec3(0.75, 0.5, 0.25) - reflDirWarp;\n\
    vec2 tc = up? reflDirWarp.xy : reflDirWarp.zy;\n\
    float specPow = exp2(dGlossiness * 11.0);\n\
    specPow = antiAliasGlossiness(specPow);\n\
    float bias = log(specPow / 2048.0) / log(0.25);\n\
    float mip = floor(bias);\n\
    vec3 tex1 = $texture2DSAMPLE(texture_sphereMap, getDpAtlasUv(tc, mip)).rgb;\n\
    mip = min(mip + 1.0, 5.0);\n\
    vec3 tex2 = $texture2DSAMPLE(texture_sphereMap, getDpAtlasUv(tc, mip)).rgb;\n\
    tex1 = mix(tex1, tex2, fract(bias));\n\
    tex1 = processEnvironment(tex1);\n\
    dReflection += vec4(tex1, material_reflectivity);\n\
}\n";
                mat.update();
            }           
        },

        // Called every frame, dt is time in seconds since last update
        update: function (dt) {
        }
    };

    return FixGloss;
});