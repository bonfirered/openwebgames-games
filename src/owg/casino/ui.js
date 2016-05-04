pc.script.attribute('html', 'asset');
pc.script.attribute('css', 'asset');

pc.script.create('ui', function (app) {
    // Creates a new Ui instance
    var Ui = function (entity) {
        this.entity = entity;
    };

    Ui.prototype = {
        // Called once after all resources are loaded and before the first update
        initialize: function () {
            var html = app.assets.get(this.html);
            var content = document.createElement('div');
            content.innerHTML = html.resource;
            document.body.appendChild(content);
            
            html.on('change', function () {
                content.innerHTML = html.resource;
                subscribeEvents();
            });
                       
            var subscribeEvents = function () {
                var btnCamera = document.getElementById('btn-camera');
                var btnInfo = document.getElementById('btn-info');
                var info = document.getElementById('info');
                var overlay = document.getElementById('overlay');
                var powered = document.getElementById('powered');
                
                btnCamera.addEventListener('click', function () {
                    var cameraAnimation = app.root.findByName('cameraPath').script.animCamera;
                    cameraAnimation.enabled = !cameraAnimation.enabled;

                    if (!cameraAnimation.enabled) {
                        btnCamera.classList.add('enabled');
                        hideInfo();
                    } else {
                        btnCamera.classList.remove('enabled');
                    }

                    var cam = app.scene._activeCamera;
                    if (cam) {
                        var flyCamera = cam._node.script.flyCamera2;
                        flyCamera.enabled = !cameraAnimation.enabled;
                    }
                });
                
                var hideInfo = function () {
                    btnInfo.classList.remove('enabled');
                    info.classList.add('hidden');
                    overlay.classList.add('hidden'); 
                    powered.classList.remove('hidden');
                };
                
                overlay.addEventListener('click', hideInfo);
                
                btnInfo.addEventListener('click', function () {                    
                    if (info.classList.contains('hidden')) {
                        info.classList.remove('hidden');
                        overlay.classList.remove('hidden');
                        btnInfo.classList.add('enabled');
                        powered.classList.add('hidden');
                    } else {
                        hideInfo();
                    }
                });
            };                    
            
            var css = app.assets.get(this.css);
            var style = pc.createStyle(css.resource);
            document.head.appendChild(style);
            
            css.on('change', function () {
                style.innerHTML = css.resource;
            });
            
            subscribeEvents();                       
        }      
    };

    return Ui;
});