
/* To set up an auth token:

from django.contrib.auth.models import User
u =  User.objects.get(username='alan')
from rest_framework.authtoken.models import Token
token = Token.objects.create(user=u)
print token.key

*/

orbimg_debug = true;

var ORBSERV = function (endpoint) {
    return '/{0}'.format(endpoint);
}


var MainNavController = function ($scope, $location) {
    $scope.navItems = [
        {title: 'Dashboard', badge: null, path: '/dashboard'},
        {title: 'My Orbs', badge: null, path: '/my/orbs'},
        {title: 'Sources', badge: null, path: '/sources'},
        {title: 'Channels', badge: null, path: '/my/channels'},
    ];
    $scope.navMenus = [
        {title: 'User', items: [
            {type: 'title', title: 'Logged in as ' + ($scope.user ? $scope.user.displayName : 'NO-ONE') + ' to ' + ($scope.server ? $scope.server.name : 'NOWHERE')},
            {title: 'Login', badge: null, path: '/login'},
            {title: 'Logout', badge: null, path: '/logout'},
            {type: 'separator'},
            {type: 'title', title: 'Tools'},
            {title: 'Profile', badge: null, path: '/user/profile'}
        ]}
    ];
    $scope.isCurrent = function (path) {
        return path == $location.url();
    }
}


var LoginController = function ($scope, OiA, $location) {
    $scope.login = {};
    $scope.message = null;
    
    $scope.doLogin = function () {
        OiA.authenticate($scope.login.username, $scope.login.password, null);
    }
    
    $scope.doLogout = function () {
        OiA.clearSession();
    }
    
    console.log($location.url())
    if ($location.url() == '/logout') {
        $scope.doLogout();
        $scope.message = {content: 'You have logged out of the system.'}
    }
    
}


var DashboardController = function ($scope, Oi) {
    // $http.get(ORBSERV('orbs/?w=150&h=150')).success(function (data, status, headers) {
    Oi.getOrbList().success(function (data, status, headers) {
        $scope.orbs = [];
        var xf = function (o) {
            o.url = '#orb/{0}'.format(o.id);
            return o;
        }
        for (var i=0; i<data.length; i++) $scope.orbs.push(xf(data[i]));
    });
}

var ____elemIdx = 0;
var OrbDisplayController = function ($scope, $routeParams, Oi, OiA, OiUtil, $route, $location) {
    $scope.orbId = $routeParams.id;
    $scope.channelIdents = {};
    $scope.orbChannels = {};
    ____elemIdx++;
    $scope.elemIdent = 'orb_{0}'.format(____elemIdx);
    $scope.myBinding = function (chan) {
        return $scope.orbChannels[chan.system_label];
    }
    
    $scope.attachOrbToChannel = function (channelId) {
        console.log('Binding orb {0} to channel {1}'.format($scope.orbId, channelId));
        OiA.post('api/channelpresentations/', {
            channel: channelId,
            presentation: $scope.orbId,
            external_id: $scope.channelIdents[channelId],
            added_by: 2, /* TODO nope */
            published: false
        }).success(function (data, status, headers) {
            $scope.refreshChannelBindings();
        });
    }
    
    $scope.detachOrbFromChannel = function (bindingId) {
        console.log('Deleting channel binding {0}'.format(bindingId));
        OiA.delete('api/channelpresentations/{0}/'.format(bindingId)).success(function (data, status, headers) {
            console.log('Delete was successful');
            $scope.refreshChannelBindings();
        });
    }
    
    var _formatChannelBindings = function (orbdata) {
        $scope.orbChannels = {};
        var cb = orbdata.channelbindings;
        for (var i=0; i<cb.length; i++) {
            $scope.orbChannels[cb[i].channel.system_label] = cb[i];
        }
    }

    $scope.refreshChannelBindings = function () {
        $scope.orbChannels = {};
        Oi.getOrb($scope.orbId).success(function (data, status, headers) {
            _formatChannelBindings(data);
        })
    }
    
    $scope.refreshOrb = function () {
        Oi.getOrb($scope.orbId).success(function (data, status, headers) {
            $scope.orb = data;
            _formatChannelBindings(data);
        })
    }
        
    $scope.publishOrb = function (bindingId) {
        console.log('Publishing orb with binding id ' + bindingId);
        OiA.patch('api/channelpresentations/{0}/'.format(bindingId), {
            published: true
        }).success(function (data, status, headers) {
            $scope.refreshChannelBindings();
        });
    }    
    
    $scope.withdrawOrb = function (bindingId) {
        console.log('Withdrawing orb with binding id ' + bindingId);
        OiA.patch('api/channelpresentations/{0}/'.format(bindingId), {
            published: false
        }).success(function (data, status, headers) {
            $scope.refreshChannelBindings();
        });
    }
    
    $scope.deleteOrb = function (evt) {
        console.log('Deleting orb {0}'.format($scope.orbId));
        OiA.delete('api/orbs/{0}/'.format($scope.orbId)).success(function (data, status, headers) {
            $location.path('#');
        })
    }
    
    $scope.orbFields = [
        {title: 'Title', ident: 'title'},
        {title: 'Notes', ident: 'notes'},
        {title: 'Display mode', ident: 'displaymode'}        
    ]
    
    $scope.editOrb = function (evt) {
        console.log('Applying changes to orb {0}'.format($scope.orbId));
        OiA.patch('api/orbs/{0}/'.format($scope.orbId), {
            title: $scope.orbEditable.title,
            notes: $scope.orbEditable.notes,
            displaymode: $scope.orbEditable.displaymode
        }).success(function (data, status, headers) {
            $scope.refreshOrb();
            $scope.toggleEditable(false);
        })
    }
    
    $scope.infoEditEnabled = false;
    $scope.orbEditable = null;
    $scope.toggleEditable = function (mode) {
        // $scope.orbEditable = (JSON.parse(JSON.stringify($scope.orb))); /* Clone it */
        $scope.orbEditable = OiUtil.clone($scope.orb);
        $scope.infoEditEnabled = mode ? mode : !$scope.infoEditEnabled;
    }
    
    /* Init tasks */
    $scope.orb = null;
    Oi.getOrb($scope.orbId).success(function (data, status, headers) {
        console.log(headers());
        $scope.orb = data;
        window.setTimeout(function () {
            window.__orbimg.orbifyElement(document.getElementById($scope.elemIdent));            
        }, 1000); /* TODO lazy */
        
        /* Reorganise orb channel list to expose the metadata */
        _formatChannelBindings(data);
        
        Oi.getChannels().success(function (data, status, headers) {
            $scope.channels = data;
        })
        
    });
    
}

var OrbSourceListController = function ($scope, Oi, OiUi, OiA, $http, $route) {
    
    function refreshSourceList() {
        Oi.getOrbSourceList().success(function (data, status, headers) {
            $scope.sources = [];
            var xf = function (s) {
                s.url = '#source/{0}'.format(s.id);
                s.title = 'Source #{0}'.format(s.id);
                s.text = OiUi.dateFmt(s.created_when);
                return s;
            }
            for (var i=0; i<data.length; i++) $scope.sources.push(xf(data[i]));
        })        
    };
    
    refreshSourceList();
    
    function initUploader() {
        function getPostArgs() {
            return {
                upload_ident:$scope.uploadIdent
            };
        }
        $scope.uploadIdent = String(Date.now()) + String(Math.random());
        $scope.progressValue = 0;
        $scope.uploadInProgress = false;
        var trg = '/api/orbsources/cluster_chunk_upload/';
        var r = new Resumable({target:trg, testChunks:false, chunkSize:512*512, query:getPostArgs, headers:OiA.getRequestHeaders});
        var e1 = document.getElementById('uploadBrowse');
        var e2 = document.getElementById('uploadDrop');

        r.assignBrowse(e1);
        r.assignDrop(e2);
        console.log('browse assigned to '+e1);
        console.log('drop assigned to '+e2);

        r.on('fileSuccess', function(file){
            console.log(':file successful');
        });
        r.on('fileProgress', function(file){
            console.log(':file progress');
        });
        r.on('fileAdded', function(file, event){
            console.log(':file added');
        });
        r.on('filesAdded', function(array){
            console.log(':files added');
            console.debug(array);
            r.upload();
        });
        r.on('fileRetry', function(file){
            console.log('hello5');
        });
        r.on('fileError', function(file, message){
            console.log('hello6');
        });
        r.on('uploadStart', function(){
            console.log(':upload started');
            $scope.uploadInProgress = true;
            $scope.uploadStatus = 'Starting...';
        });
        r.on('complete', function(){
            console.log(':transfer complete');
            $scope.uploadStatus = 'Post-processing...';
            var trg = 'api/orbsources/cluster_upload_conclude/?upload_ident=' + $scope.uploadIdent;
            OiA.get(trg).success(function (data, status, headers) {
                $scope.uploadStatus = 'Finished!';
                $scope.progressValue = 100;
                // refreshSourceList();
                // delete r;
                // initUploader();
                $route.reload();
            });
        
        });
        r.on('progress', function(){
            var progr = r.progress();
            var progrstr = 'Upload is ' + Math.round(String(progr*100)) + '% complete';
            $scope.$apply(function () {
                $scope.progressValue = Math.round(String(progr*90));
                $scope.uploadStatus = 'Uploading... ' + $scope.progressValue + '% complete';
            })
            console.log(progrstr);
        });
        r.on('error', function(message, file){
            console.log('hello10');
        });
        r.on('pause', function(){
            console.log('hello11');
        });
        r.on('cancel', function(){
            console.log('hello12');
        });


    }
    
    initUploader();



    
}

var OrbSourceDisplayController = function ($scope, $routeParams, Oi, OiUtil, OiA, $location) {
    
    $scope.setTabState = function (state) {
        $scope.tabState = state;
    }
    $scope.setTabState('info');
    
    $scope.frameInfo = {
        frameCount: 0, 
        currentIdx: 0, 
        width: 0, 
        height: 0
    }
    
    $scope.refreshSrc = function () {
        Oi.getOrbSource($routeParams.id).success(function (data, status, headers) {
            $scope.src = data;
            $scope.frameInfo.width = data.frame_width;
            $scope.frameInfo.height = data.frame_height;
            $scope.frameInfo.frameCount = data.frame_count;
            $scope.showPreviewFrame(0);
        });
    }
    
    $scope.previewUrl = null;
    $scope.showPreviewFrame = function (frame) {
        if (frame) $scope.frameInfo.currentIdx = frame;
        var w = Math.round(document.getElementById('imgcontainer').clientWidth * 0.9);
        $scope.previewUrl = ORBSERV('src/{0}/preview/{1}/?w={2}'.format($scope.src.id, $scope.frameInfo.currentIdx, w));
    }
    
    $scope.switchFrame = function (delta) {
        var ci = $scope.frameInfo.currentIdx;
        ci += Number(delta);
        var fc = $scope.frameInfo.frameCount;
        if (ci < 0) ci = fc + delta;
        if (ci == fc) ci = 0;
        $scope.frameInfo.currentIdx = ci;
        $scope.showPreviewFrame(ci);
    }
    
    $scope.submitSourceUpdateForm = function (evt) {
        OiA.patch('api/orbsources/{0}/'.format($scope.src.id), {
            'description': $scope.srcEditable.description
        }).success(function (data, status, headers) {
            $scope.refreshSrc();
            $scope.toggleEditable(false);
        });
    }
    
    /* Configure things for source edittable */
    $scope.srcFields = [
        {title: 'Description', ident: 'description'}
    ]
    // $scope.srcStatic = null;
    $scope.srcEditable = null
    $scope.srcEditMarker = false
    $scope.srcEditSubmit = null
    
    $scope.toggleEditable = function (mode) {
        $scope.srcEditable = OiUtil.clone($scope.src);
        $scope.srcEditMarker = mode ? mode : !$scope.srcEditMarker;
    }
    
    /* Configure things for orb edittable */
    $scope.newOrb = {};
    $scope.newOrbFields = [
        {title: 'Title', ident: 'title'},
        {title: 'Notes', ident: 'notes'},
        {title: 'Preferred display mode', ident: 'displaymode'}
    ]
    $scope.submitNewOrb = function (evt) {
        OiA.post('api/orbs/', {
            plugin_name: '001_basic',
            title: $scope.newOrb.title,
            notes: $scope.newOrb.notes,
            publish: true,
            source: $scope.src.id
        }).success(function (data, status, headers) {
            $scope.refreshSrc();
            $scope.newOrb = {};
        })
    }
    
    $scope.deleteSource = function () {
        OiA.delete('api/orbsources/{0}/'.format($scope.src.id)).success(function (data, status, headers) {
            $location.path('/sources');
        });
    }
    
    $scope.refreshSrc();
    
}

var OrbListController = function ($scope, Oi) {
    Oi.getOrbList().success(function (data, status, headers) {
        $scope.orbs = [];
        var xf = function (o) {
            o.url = '#orb/{0}'.format(o.id);
            return o;
        }
        for (var i=0; i<data.length; i++) $scope.orbs.push(xf(data[i]));
    });
    
}

var ChannelListController = function ($scope, Oi, OiA) {
    /* NB: this is supposed to provide a nicely formatted version of the presentation for use by the thumb display directive.
    However instead it triggers some kind of weird freakout in the digest cycle. 
    Indications point to this happening any time a scope function is called from the template.
    Dare I suggest - a bug in this version of Angular?
    So we're manufacturing the exact same data in the oi-thumb call in channel_list.html instead.
    For now. */
    /* TODO revisit this */
    $scope.reformPres = function (p) { 
        return {
            preview_url: p.detail.preview_url,
            url: '#/orb/{0}'.format(p.detail.id),
            text: p.external_id
        }
    }
    
    $scope.submitChannelCreateForm = function (evt) {
        console.log($scope.channelSite);
        OiA.post('api/channels/', {
            name: $scope.channelName,
            description: $scope.channelDescription,
            // site: $scope.channelSite,
            system_label: $scope.channelLabel
        }).success(function (data, status, headers) {
            Oi.getChannels().success(function (data, status, headers) {
                $scope.channels = data;
            })
            evt.target.reset();
        })
    }
    
    /* Init */
    $scope.channels = [];
    $scope.sites = [];
    Oi.getChannels().success(function (data, status, headers) {
        $scope.channels = data;
    })
    Oi.getSites().success(function (data, status, headers) {
        $scope.sites = data;
    })
}

var OrbiterApp = angular.module('OrbiterApp', ['ngRoute', 'OrbiterServices', 'OrbiterDirectives', 'OrbiterControllers', 'Sabr'])
.controller('MainNavController', MainNavController)
.controller('DashboardController', DashboardController)
.controller('OrbDisplayController', OrbDisplayController)
.controller('OrbSourceListController', OrbSourceListController)
.controller('OrbSourceDisplayController', OrbSourceDisplayController)
.controller('ChannelListController', ChannelListController)
.controller('OrbListController', OrbListController)
.controller('SabrSourceDisplayController', SabrSourceDisplayController)
// .controller('SabrTestController', SabrTestController)
.controller('LoginController', LoginController)
.controller('NullController', function () {})
.run(function ($rootScope, $http, OiUi, OiA) {
    $rootScope.uiState = {};
    $rootScope.ui = OiUi;
    
    OiA.initSession(); /* Sets $rootScope.user */
        
    $http.get(ORBSERV('cfg/')).success(function (data, status, headers) {
        $rootScope.csrfToken = data.csrf_token;
        $rootScope.server = {
            root: data.root,
            name: data.host
        }
    })
});
;

OrbiterApp
.config(function ($routeProvider, $locationProvider) {
    $routeProvider
    .when('/dashboard', {
        templateUrl: 'partial/dashboard_main.html',
        controller: 'DashboardController'
    })
    .when('/orb/:id', {
        templateUrl: 'partial/orb_display.html',
        controller: 'OrbDisplayController'
    })
    .when('/source/:id', {
        templateUrl: 'partial/orbsource_display.html',
        controller: 'OrbSourceDisplayController'
    })
    .when('/sources', {
        templateUrl: 'partial/orbsource_list.html',
        controller: 'OrbSourceListController'
    })
    .when('/sabr/:srcid', {
        templateUrl: 'partial/sabr_source_display.html',
        controller: 'SabrSourceDisplayController'
    })
    .when('/my/orbs', {
        templateUrl: 'partial/orb_list.html',
        controller: 'OrbListController'
    })
    .when('/my/channels', {
        templateUrl: 'partial/channel_list.html',
        controller: 'ChannelListController'
    })
    .when('/channel/:ident', { /* TODO make this specific to a single controller */
        templateUrl: 'partial/channel_list.html',
        controller: 'ChannelListController'        
    })
    .when('/login', {
        templateUrl: 'partial/login.html',
        controller: 'LoginController'
    })
    .when('/logout', {
        templateUrl: 'partial/login.html',
        controller: 'LoginController'
    })
    .when('/bleblob', {
        templateUrl: 'partial/bleblob.html',
        controller: 'NullController'
        
    })
    .otherwise('/dashboard')
});
