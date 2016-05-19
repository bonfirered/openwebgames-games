pc.script.createLoadingScreen(function (app) {
    var showSplash = function () {
        // splash
        var splash = document.createElement('div');
        splash.id = 'application-splash';
        document.body.appendChild(splash);

        var logo = document.createElement('img');
        logo.id = 'logo';
        logo.src = 'https://s3-eu-west-1.amazonaws.com/static.playcanvas.com/casino/Casino_Logo.png';
        splash.appendChild(logo);
        
        var diamond = document.createElement('img');
        diamond.id = 'diamond';
        diamond.src = 'https://s3-eu-west-1.amazonaws.com/static.playcanvas.com/casino/Large_Diamond.png';
        splash.appendChild(diamond);
        
        var powered = document.createElement('a');
        powered.id = 'powered';
        powered.href = 'https://playcanvas.com';
        powered.target = '_blank';
        document.body.appendChild(powered);
        
        var poweredImg = document.createElement('img');
        poweredImg.src = 'https://s3-eu-west-1.amazonaws.com/static.playcanvas.com/casino/Pow_By.png';
        powered.appendChild(poweredImg);   
     
        // progress bar
        var container = document.createElement('div');
        container.id = 'progress-container';
        splash.appendChild(container);

        var bar = document.createElement('div');
        bar.id = 'progress-bar';
        container.appendChild(bar);
    };

    var hideSplash = function () {
        var splash = document.getElementById('application-splash');
        splash.parentElement.removeChild(splash);
        
        var powered = document.getElementById('powered');
        powered.parentElement.removeChild(powered);
    };

    var setProgress = function (value) {
        var bar = document.getElementById('progress-bar');
        if(bar) {
            value = Math.min(1, Math.max(0, value));
            bar.style.width = value * 100 + '%';
        }
    };

    var createCss = function () {
        var css = [
            'body {',            
            '    background-color: #1f354d;',
            '}',
            
            '#application-splash {',
            '    position: absolute;',
            '    top: 30%;',
            '    width: 444px;',
            '    max-width: 100%;',
            '    left: 50%;',
            '    margin-left: -222px;',
            '}',
                       
            '#logo {',
                'width: 412px;',
                'max-width: 100%;',
            '}',            
            '@-webkit-keyframes rotate {',
            '    from {',
            '        -webkit-transform: rotate(0deg);',
            '    }',
            '    to {', 
            '        -webkit-transform: rotate(180deg);',
            '    }',
            '}',
            
            
            '@-moz-keyframes rotate {',
            '    from {',
            '        -moz-transform: rotate(0deg);',
            '    }',
            '    to {', 
            '        -moz-transform: rotate(180deg);',
            '    }',
            '}',
           
            '@keyframes rotate {',
            '    from {',
            '        transform: rotate(0deg);',
            '    }',
            '    to {', 
            '        transform: rotate(180deg);',
            '    }',
            '}',
            
            '#diamond {',
            '    width: 22px;',
            '    -webkit-animation: rotate 1s 1s infinite ease-out;',   
            '    -moz-animation: rotate 1s 1s infinite ease-out;',  
            '    animation: rotate 1s 1s infinite ease-out;',  
            '    margin-left: 10px;',
            '}',
             
            
           ' #powered {',
           '     position: absolute;',
           '     bottom: 5px;',
           '     left: 50%;',
           '     margin-left: -100px;',
           '}',

            '#powered img {',
            '    width: 200px;',
            '    opacity: 0.75;',
            '}',

            '#progress-container {',
            '    margin-top: 20px;',
            '    width: 100%;',
            '    height: 20px;',
            '    position: absolute;',
            '    background-color: transparent;',
            '}',

            '#progress-bar {',
            '    width: 0%;',
            '    height: 100%;',
            '    background-color: #82354f;',
            '}',
            
            '@media (max-width: 440px) {',
                '#application-splash {',
                    'width: 300px;',
                    'margin-left: -150px;',
                '}',
                '#logo {',
                    'width: 265px;',
                '}',
                '#diamond {',
                    'width: 15px;',
                    'margin-left: 10px;',
                '}',
            '}'
        ].join('\n');

        var style = document.createElement('style');
        style.type = 'text/css';
        if (style.styleSheet) {
          style.styleSheet.cssText = css;
        } else {
          style.appendChild(document.createTextNode(css));
        }

        document.head.appendChild(style);
    };


    createCss();

    showSplash();

    app.on("preload:end", function () {
        app.off("preload:progress");
    });
    app.on("preload:progress", setProgress);
    app.on("start", hideSplash);
});
