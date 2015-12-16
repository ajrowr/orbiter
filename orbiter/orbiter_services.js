

var OiUtilFactory = function () {
    return {
        clone: function (obj) {
            return JSON.parse(JSON.stringify(obj));
        },
        paramify: function (obj) {
            var str = '';
            for (var key in obj) {
                if (str != '') {
                    str += '&';
                }
                str += key + '=' + encodeURIComponent(obj[key]);
            }
            return str;
        }
    }
}


var OiAuthenticatedServiceFactory = function ($http, $rootScope, $location) {
    
    /* Provided as a service for 3rd-party code that needs to authenticate, eg. Resumable.js */
    function getRequestHeaders() {
        return {
            'Authorization': 'Token {0}'.format($rootScope.user.authKey),
            'X-CSRFToken': $rootScope.csrfToken
        }
    }
    
    var cfg = function () {
        if (!$rootScope.user) $location.path = '/login';
        return {
            headers: getRequestHeaders()
        }
    }
    var tplus = function (delta) {
        s = 0;
        if (delta) {
            if (delta.days) s += delta.days * 60 * 60 * 24;
            if (delta.hours) s += delta.hours * 60 * 60;
            if (delta.minutes) s += delta.minutes * 60;
            if (delta.seconds) s += delta.seconds;
        }
        return Date.now()/1000 + s;
    }
    return {
        authenticate: function (username, password, onSuccess) {
            $http.post(ORBSERV('api_login/'), {
                username: username,
                password: password
            }).success(function (data, status, headers) {
                $rootScope.user = {
                    authKey: data.token,
                    username: data.username,
                    displayName: data.display_name,
                    sessionExpires: tplus({hours:12})
                };
                console.log($rootScope.user);
                window.localStorage['user'] = JSON.stringify($rootScope.user);
                if (onSuccess) {
                    onSuccess();
                }
                else {
                    console.log('Logged in as {0}'.format(data.username))
                    $location.path('/');
                }
            });
        },
        /* Initialise user session. If user cannot be init'ed, redirect to login */
        initSession: function () {
            if (window.localStorage['user']) {
                $rootScope.user = JSON.parse(window.localStorage['user']);
                console.log($rootScope.user);
                if ($rootScope.user.sessionExpires < tplus(0)) {
                    $rootScope.user = null;
                    window.localStorage.clear('user');
                }
                else {    
                    $rootScope.user.sessionExpires = tplus({hours:12});
                    window.localStorage['user'] = JSON.stringify($rootScope.user);
                }
            }
            else $rootScope.user = null;
    
            if (!$rootScope.user) {
                $location.path('/login');
            }
            
        },
        clearSession: function () {
            $rootScope.user = null;
            window.localStorage.clear('user'); /* TODO make this available to the service eg in initSession */
        },
        getRequestHeaders: getRequestHeaders,
        get: function (uri) {
            return $http.get(ORBSERV(uri), cfg());
        },
        post: function (uri, data) {
            return $http.post(ORBSERV(uri), data, cfg());
        },
        patch: function (uri, data) {
            return $http.patch(ORBSERV(uri), data, cfg());
        },
        delete: function (uri, data) {
            return $http.delete(ORBSERV(uri), cfg());
        }
    }
}

var OiServiceFactory = function (OiA) {
    return {
        getOrbList: function () {
            return OiA.get('api/orbs/?fw=150&fh=150');
        },
        getOrb: function (id) {
            return OiA.get('api/orbs/{0}/?w=300'.format(id));
        },
        getOrbSourceList: function () {
            return OiA.get('api/orbsources/');
        },
        getOrbSource: function (id) {
            return OiA.get('api/orbsources/{0}/'.format(id));
        },
        getChannels: function () {
            return OiA.get('api/channels/?all=true');
        },
        getSites: function () {
            return OiA.get('api/sites/');
        }
    }
}

var OiUiFactory = function () {
    return {
        dateFmt: function (datestr) {
            return new Date(datestr).toDateString();
        },
        applyIsogridLayout: function (containerSelector, itemSelector) {
            window.setTimeout(function () {
                $(containerSelector).isotope({
                  itemSelector: itemSelector,
                  layoutMode: 'fitRows'
                })
            }, 500);
        }
    }
}

OrbiterServices = angular.module('OrbiterServices', [])
    .factory('Oi', OiServiceFactory)
    .factory('OiA', OiAuthenticatedServiceFactory)
    .factory('OiUi', OiUiFactory)
    .factory('OiUtil', OiUtilFactory)

