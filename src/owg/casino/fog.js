pc.script.create('fog', function (app) {
    // Creates a new Fog instance
    var Fog = function (entity) {
        this.entity = entity;
    };

    Fog.prototype = {
        // Called once after all resources are loaded and before the first update
        initialize: function () {
            
            pc.shaderChunks.fogLinearPS = "\
float inScatter(vec3 start, vec3 dir, vec3 lightPos, float d) {\
	vec3 q = start - lightPos;\
	float b = dot(dir, q);\
	float c = dot(q, q);\
	float s = 1.0 / max(sqrt(c - b*b), 0.01);\
	float l = s * (atan( (d + b) * s) - atan( b*s ));\
	return l;\
}\
uniform vec3 fog_color;\
uniform float fog_start;\
vec3 addFog(vec3 color) {\
    float fog = inScatter(view_position, -normalize(view_position - vPositionW), vec3(0, 4.191, 0), length(view_position - vPositionW));\
    return mix(gl_FragColor.rgb, fog_color, saturate(fog) * fog_start);\
}\
";
            
        },

        // Called every frame, dt is time in seconds since last update
        update: function (dt) {
        }
    };

    return Fog;
});