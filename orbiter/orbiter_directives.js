
var ThumbSingleDirective = function () {
    return {
        scope: {
            item: '=item',
            ewidth: '=ewidth',
            iwidth: '=iwidth',
            eheight: '=eheight',
            iheight: '=iheight',
            font: '=font'
        },
        template: '<div style="display: inline;"><div ng-style="{width: (ewidth ? ewidth : 180)+\'px\', height: (eheight ? eheight : null)+\'px\'}" style="border: 1px solid black; margin: 1ex; padding: 1ex; overflow: hidden;"><a href="{{item.url}}"><h3 ng-if="item.title" style="margin-top: 0px;">{{item.title}}</h3><img ng-style="{width: (iwidth ? iwidth : 160)+\'px\', height: (iheight ? iheight : null)+\'px\'}" style="box-shadow: 2px 2px 5px #ccc;" ng-src="{{item.preview_url + \'?_=_\' + (iwidth ? \'&w=\' + iwidth : \'\') + (iheight ? \'&h=\' + iheight : \'\')}}"><br/><span ng-if="item.text" ng-style="{\'font-family\': (font ? font : \'inherit\')}">{{item.text}}</span></a></div></div>'
    }
}

var ChannelSingleDirective = function () {
    return {
        scope: {
            channel: '=channel'
        },
        templateUrl: 'partial/channel_single.html'
    }
}

var EditTableDirective = function () {
    return {
        scope: {
            fields: '=fields', /* field format is {title:, ident:} */
            staticObject: '=staticobj',
            editableObject: '=editableobj',
            editableModeMarker: '=editmarker',
            submitButtonLabel: '=submitlabel',
            submitFn: '=submitfn',
            deleteButtonLabel: '=deletelabel',
            deleteFn: '=deletefn'
        },
        templateUrl: 'component/edittable.html'
    }
}

var FrameSwitcherDirective = function () {
    return {
        scope: {
            frameSwitchFn: '=frameSwitchFn',
            frameInfo: '=frameInfo' // frameInfo = {count, idx, width, height}
            
        },
        template: '        <div>\
            <button class="btn btn-xs btn-default" ng-click="frameSwitchFn(-1)"><span class="glyphicon glyphicon-circle-arrow-left"></span></button>\
            <button class="btn btn-xs btn-default" ng-click="frameSwitchFn(1)"><span class="glyphicon glyphicon-circle-arrow-right"></span></button>\
            <span>Frame {{frameInfo.currentIdx+1}} of {{frameInfo.frameCount}} ({{frameInfo.width}} &times; {{frameInfo.height}} pixels)</span><br/><br/>\
        </div>'
    }
}


var OrbimgAppDirectives = angular.module('OrbimgAppDirectives', []);
OrbimgAppDirectives
    .directive('oiThumb', ThumbSingleDirective)
    .directive('oiChannel', ChannelSingleDirective)
    .directive('oiEdittable', EditTableDirective)
    .directive('oiFrameSwitcher', FrameSwitcherDirective)
