
/* WARNING: the server API for Sabr is not stable. There will probably be changes which will need to be reflected here. */

/* TODO this is a copy-paste from OIUtil to avoid circular dependency. Figure out what to do with it */
var SabrUtilFactory = function () {
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


var SabrServiceFactory = function (SabrUtil, $http) {
    var paramify_ops = function (ops) {
        var paramsObj = {withpat: 'checkerboard'};
        for (var i=0; i<ops.length; i++) {
            var myOp = ops[i];
            if (myOp.name) {
                var paramsJoined = '{0}'.format(myOp.name);
                for (var j=0; j<myOp.params.length; j++) paramsJoined += ',{0}_{1}'.format(myOp.params[j].type, encodeURIComponent(myOp.params[j].value));
                paramsObj[myOp.key] = paramsJoined;
            }
        }
        // return paramsJoined;
        return SabrUtil.paramify(paramsObj)
    }
    
    /* The new way of doing things. Accept a list of simplified ops and built parameter lists for them */
    var generate_ops = function (ops, frameMeta) {
        // console.log(ops)
        var ops_out = [];
        for (var i=0; i<ops.length; i++) {
            var mappedCoords = null;
            var myOp = ops[i];
            console.log(myOp)
            if (!myOp || !myOp.active) continue;
            var myKey = 'op_{0}'.format(myOp.key);
            if (myOp.tag == 'rotate') { /* {tag: 'rotate', factor: <factor>} */
                ops_out.push({
                    key: myKey,
                    name: 'convert',
                    params: [
                        {type: 'rotate', value: myOp.factor}
                    ]
                });
            }
            else if (myOp.tag == 'transparent') { /* {tag: 'transparent', fuzz: <fuzz>, color: <color>} */
                ops_out.push({
                    key: myKey,
                    name: 'convert',
                    params: [
                        {type: 'fuzz', value: myOp.fuzz}, 
                        {type: 'transparent', value: myOp.color}
                    ]
                });
            }
            else if (myOp.tag == 'flood') { /* {tag: 'flood', fuzz: <fuzz>, x: <x>, y: <y>, color: <color>} */
                mappedCoords = mapCoords(myOp.x, myOp.y, frameMeta);
                console.log('{0}, {1} => {2}, {3}'.format(myOp.x, myOp.y, mappedCoords.x, mappedCoords.y));
                ops_out.push({
                    key: myKey,
                    name: 'convert',
                    params: [
                        {type: 'fuzz', value: myOp.fuzz},
                        {type: 'fill', value: 'transparent'},
                        {type: 'floodfill', value:'+{0}+{1} #{2}'.format(mappedCoords.x, mappedCoords.y, myOp.color)}
                    ]
                });
            }
            else if (myOp.tag == 'trim') {
                ops_out.push({
                    key: myKey,
                    name: 'trim',
                    params: []
                });
            }
            else if (myOp.tag == 'crop') {
                ops_out.push({
                    key: myKey,
                    name: 'convert',
                    params: [
                        {type: 'crop', value: '{0}x{1}+{2}+{3}'.format(myOp.w, myOp.h, myOp.l, myOp.t)}
                    ]
                });
            }
            else if (myOp.tag == 'shave') {
                ops_out.push({
                    key: myKey,
                    name: 'convert',
                    params: [
                        {type: 'shave', value: '{0}%x{1}%'.format(myOp.shaveX, myOp.shaveY)}
                    ]
                })
            }
        }
        console.log(ops_out);
        return ops_out;
    }
    
    /* Map coordinates from virtual frame to real frame */
    /* Typically used for mapping coords from displayed preview to actual frame */
    var mapCoords = function (virtX, virtY, frameMeta) {
        var xFactor = frameMeta.widthReal / frameMeta.widthVirtual;
        var yFactor = frameMeta.heightReal / frameMeta.heightVirtual;
        return {x: Math.round(virtX * xFactor), y: Math.round(virtY * yFactor)};
        
    }
    
    return {
        getSabrImgUrl: function (srcId, frameIdx, ops, meta, frameWidth) {
            return ORBSERV('sabr/{0}/{1}/show/?w={3}&{2}'.format(srcId, frameIdx, paramify_ops(generate_ops(ops, meta)), frameWidth));
        },
        // getWorkflowUrl: function (srcId, ops, meta) {
        //     return ORBSERV('sabr/{0}/derive/?{1}'.format(srcId, paramify_ops(generate_ops(ops))))
        // },
        deriveSource: function (srcId, ops, meta) {
            return $http.post(ORBSERV('sabr/{0}/derive/?{1}'.format(srcId, paramify_ops(generate_ops(ops, meta)))));
        },
        mapCoords: mapCoords
        
    };
}



var SabrSourceDisplayController = function ($scope, SabrUtil, Oi, $routeParams, $http, SabrService) {
    $scope.operations = [];
    var OP = {
        ROTATE: '.1',
        CROP: '.2'
    }
    $scope.opKeyIdx = 1;
    
    $scope.frameInfo = {
        frameCount: 0, 
        currentIdx: 0, 
        width: 0, 
        height: 0
    }
    
    var findOp = function (key) {
        var found = false;
        var idx = null;
        for (var i=0; i<$scope.operations.length; i++) {
            // if ($scope.operations[i] === null) continue;
            if ($scope.operations[i].key == key) {
                found = true;
                idx = i;
                break;
            }
        }
        console.log(idx);
        return idx;
    }
    
    $scope.addOp = function (op, key) {
        /* Certain operations are special and need to be executed in the right order, so custom keys permit this */
        /* They also permit certain specific ops to be singleton. */
        /* This is usually accomplished by prefixing a number or letter with '.' */
        /* Check to see if a key is already used, if so, then replace instead of adding */
        if (key !== undefined) op.key = key;
        else op.key = $scope.opKeyIdx;
        $scope.opKeyIdx++;
        op.active = true;
        console.log(op);
        var foundAt = findOp(key);
        console.log(foundAt);
        if (foundAt === null) {
            $scope.operations.push(op);
        }
        else {
            $scope.operations[foundAt] = op;
        }
        // if (!found)
        if ($scope.showImg) $scope.showImg();
        // console.log($scope.operations);
    }
    
    /* Delete op by replacing it with null. Return value indicates whether the key was found. */
    $scope.deleteOp = function (key) {
        var foundAt = findOp(key);
        console.log(foundAt);
        if (foundAt!==null) {
            // $scope.operations[i] = null;
            $scope.operations.splice(foundAt, 1);
        }
        $scope.showImg();
        return foundAt;
    }
    
    $scope.toggleOp = function (key, state) {
        var foundAt = findOp(key);
        $scope.operations[foundAt].active = (state !== undefined ? state : !$scope.operations[foundAt].active);
        console.log('toggled to {0}'.format($scope.operations[foundAt].active));
        $scope.showImg();
    }
    
    
    $scope.addRotationOp = function (factor) {
        $scope.addOp({
            tag: 'rotate',
            factor: factor
        }, OP.ROTATE);
    }
    
    $scope.addTransparencyOp = function (fuzz, color) {
        // $scope.addOp({
        //     tag: 'transparent',
        //     name: 'convert',
        //     params: [
        //         {type: 'fuzz', value: fuzz},
        //         {type: 'transparent', value: color}
        //     ],
        //     meta: {fuzz: fuzz, color: color}
        // })
        if (fuzz === undefined) fuzz = 10;
        if (color === undefined) color = '000000';
        var myOp = {
            tag: 'transparent',
            fuzz: fuzz,
            color: color
        };
        $scope.addOp(myOp);
        $scope.setPickerTarget(myOp);
    }
    
    $scope.addFloodOp = function (x, y, fuzz, color) {
        if (fuzz === undefined) fuzz = 10;
        if (x === undefined) x = 1;
        if (y === undefined) y = 1;
        if (color === undefined) color = '000000';
        var myOp = {
            fuzz: fuzz,
            tag: 'flood',
            x: x, y: y,
            color: color
        }
        $scope.addOp(myOp);
        $scope.setPickerTarget(myOp);
    }
    
    $scope.addTrimOp = function () {
        $scope.addOp({tag: 'trim'});
    }
    
    $scope.addShaveOp = function () {
        $scope.addOp({tag: 'shave', shaveX: 0, shaveY: 0});
    }
    
    $scope.addCropOp = function () {
        $scope.addOp({tag: 'crop', t: 0, l: 0, w: $scope.src.frame_width, h: $scope.src.frame_height});
    }
    
    $scope.sendToWorkflow = function () {
        $scope.statusMessage = {
            content: 'Please stand by, this takes a little while...',
            processProgressEstimate: '0',
            processProgressCounter: 0,
            intervalIdent: window.setInterval(function () {
                $scope.$apply(function () {
                    $scope.statusMessage.processProgressCounter += 1;
                    $scope.statusMessage.processProgressEstimate = String(Math.round(100 * ($scope.statusMessage.processProgressCounter / $scope.src.frame_count)));
                    
                })
                // console.log($scope.statusMessage.processProgressCounter);
                console.log($scope.statusMessage.processProgressEstimate);
                
            }, 600)
        }
        
        // $scope.progressBar = {
        //     totalWidth: $scope.src.frame_count
        // }
        SabrService.deriveSource($scope.src.id, $scope.operations, $scope.framemeta).success(function (data, status, headers) {
            window.clearInterval($scope.statusMessage.intervalIdent);
            $scope.statusMessage = {
                content: 'Your new orb source was created. Click to view it.',
                url: '#/source/{0}'.format(data.newSourceId)
            }
            //window.cancel interval...
        })
    }
    
    $scope.switchFrame = function (delta) {
        var ci = $scope.frameInfo.currentIdx;
        ci += Number(delta);
        var fc = $scope.frameInfo.frameCount;
        if (ci < 0) ci = fc + delta;
        if (ci == fc) ci = 0;
        $scope.frameInfo.currentIdx = ci;
        $scope.showImg();
    }
    
    $scope.adjustValue = function (obj, k, delta) {
        obj[k] = Number(obj[k]) + delta;
        $scope.showImg();
    }
    
    $scope.pickerTarget = null;
    $scope.setPickerTarget = function (obj) {
        $scope.pickerTarget = obj;
    }
    
    $scope.rotationFactor = 0;
    // $scope.addOp({tag:'rotate', name:'convert', params:[{type:'rotate', value:$scope.rotationFactor}]}, OP.ROTATE);
    $scope.addRotationOp($scope.rotationFactor);
    // $scope.addOp({tag:'tranparent', name:'convert', params:[{type:'fuzz', value:'50'}, {type:'transparent', value:'e7eaf1'}]});
    // $scope.addTransparencyOp(10, 'e7eaf1');
    // $scope.addFloodOp(5, 5, 10, '292f32');
    // $scope.addFloodOp(5, 5, 10, 'fcfcfc');
    
    var cnv = document.getElementById('c');
    var cnvCtx = cnv.getContext('2d');
    
    cnv.addEventListener('click', function (evt) {
        var bounds = cnv.getBoundingClientRect();
        var hexify = function (val) {
            var out = val.toString(16);
            while (out.length < 2) out = '0' + out;
            return out;
        }
        $scope.$apply(function () {
            var x = evt.clientX - bounds.left;
            var y = evt.clientY - bounds.top;
            var pxdat = cnvCtx.getImageData(x, y, 1, 1);
            var r = pxdat.data[0];
            var g = pxdat.data[1];
            var b = pxdat.data[2];
            var a = pxdat.data[3];
            var hexval = '{0}{1}{2}'.format(hexify(r), hexify(g), hexify(b));
            
            $scope.click = {
                x: Math.round(x),
                y: Math.round(y),
                // r: pxdat.data[0],
                // g: pxdat.data[1],
                // b: pxdat.data[2],
                // a: pxdat.data[3],
                hexval: hexval
            }
            if ($scope.pickerTarget) {
                $scope.pickerTarget.color = $scope.click.hexval;
                $scope.pickerTarget.x = $scope.click.x;
                $scope.pickerTarget.y = $scope.click.y;
                $scope.showImg();
            }
        })
        // $scope.clickX = evt.clientX - bounds.left;
        // $scope.clickY = evt.clientY - bounds.top;
        
        console.log($scope.click)
    })
    
    
    $scope.rotate = function (d) {
        if (d == 'left') {
            $scope.rotationFactor -= 90;
            if ($scope.rotationFactor < 0) $scope.rotationFactor += 360;
            
        }
        else if (d == 'right') {
            $scope.rotationFactor += 90;
            if ($scope.rotationFactor > 359) $scope.rotationFactor -= 360;
            
        }
        // $scope.addOp({tag:'rotate', name:'convert', params:[{type:'rotate', value:$scope.rotationFactor}]}, OP.ROTATE);
        $scope.addRotationOp($scope.rotationFactor);
        $scope.showImg();
    }
    
    $scope.framemeta = {
        widthVirtual: null,
        heightVirtual: null,
        widthReal: null,
        heightReal: null
    }
    
    $scope.showImg = function () {
        var cont = document.getElementById('imgcontainer');
        var previewWidth = Math.round(cont.clientWidth * 0.9);
        $scope.imgUrl = SabrService.getSabrImgUrl($routeParams.srcid, $scope.frameInfo.currentIdx, $scope.operations, $scope.framemeta, previewWidth);
        var iimg = new Image();
        iimg.src = $scope.imgUrl;
        iimg.onload = function () {
            cnv.width = iimg.width;
            cnv.height = iimg.height;
            cnvCtx.drawImage(iimg, 0, 0);
            $scope.framemeta.widthVirtual = iimg.width;
            $scope.framemeta.heightVirtual = iimg.height;
            // cnvCtx.fillRect(5, 5, 10, 10);
        };
        
    }
    
    $scope.src = null;
    Oi.getOrbSource($routeParams.srcid).success(function (data, status, headers) {
        $scope.src = data;
        $scope.framemeta.widthReal = data.frame_width;
        $scope.framemeta.heightReal = data.frame_height;
        
        $scope.frameInfo = {
            frameCount: data.frame_count, 
            currentIdx: 0, 
            width: data.frame_width, 
            height: data.frame_height
        }
        
    })
       
    $scope.showImg();
}



var SabrOperationToggleAndDelete = function () {
    return {
        scope: {
            myOp: '=op',
            toggleFn: '=toggle',
            deleteFn: '=delete'
        },
        template: '<button type="button" ng-click="toggleFn(myOp.key)" class="btn btn-xs btn-info glyphicon" ng-class="{\'active\': !myOp.active, \'glyphicon-eye-open\': myOp.active, \'glyphicon-eye-close\': !myOp.active}"></button>\
                    <button type="button" ng-click="deleteFn(myOp.key)" class="btn btn-xs btn-danger glyphicon glyphicon-remove"></button>'
    }
}

var SabrColourPicker = function () {
    return {
        scope: {
            myOp: '=op',
            setPickerTargetFn: '=setpicker'
        },
        template: '<span title="#{{myOp.color}}" ng-style="{\'background-color\': \'#\'+myOp.color}" style="box-shadow: 1px 1px 3px black;">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span> <button ng-click="setPickerTargetFn(myOp)" class="btn btn-xs btn-default glyphicon glyphicon-tint"></button>'
    }
}

var SabrValueAdjuster = function () {
    return {
        scope: {
            myOp: '=op',
            valueKey: '=key',
            valueLabel: '=label',
            deltaPlus: '=deltaPlus',
            deltaMinus: '=deltaMinus',
            deltaFn: '=deltaFn',
            changeFn: '=changeFn'
        },
        template: '<span><strong>{{valueLabel}}:</strong> <input type-"text" style="width:2em;" ng-model="myOp[valueKey]" ng-change="changeFn()">\
                    <button ng-click="deltaFn(myOp, valueKey, deltaMinus)" class="btn btn-xs btn-default glyphicon glyphicon-minus"></button>\
                    <button ng-click="deltaFn(myOp, valueKey, deltaPlus)" class="btn btn-xs btn-default glyphicon glyphicon-plus"></button></span>'
    }
}

var SabrOperationAddButton = function () {
    return {
        scope: {
            addOpFn: '=addOpFn',
            label: '=label',
            helpText: '=helpText'
        },
        template: '<button type="button" ng-click="addOpFn()" title="{{helpText}}" class="btn btn-default"><span class="glyphicon glyphicon-plus-sign"></span> {{label}}</button>'
    }
}


OiSabr = angular.module('Sabr', [])
    .controller('SabrSourceDisplayController', SabrSourceDisplayController)
    .factory('SabrService', SabrServiceFactory)
    .factory('SabrUtil', SabrUtilFactory)
    .directive('sabrOperationToggleAndDelete', SabrOperationToggleAndDelete)
    .directive('sabrColourPicker', SabrColourPicker)
    .directive('sabrValueAdjuster', SabrValueAdjuster)
    .directive('sabrOperationAddButton', SabrOperationAddButton)


/* Adding an op to Sabr:
    Add UI for it into sabr_source_display.html
    Add a function for adding it
    Add a button for calling the add function
    Update SabrService.generate_ops to understand the tag
    Update orbserv.sabrtools.decode_operations_sequence
*/


