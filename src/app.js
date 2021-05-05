// require CSS file for the widgets
require('../public/Widgets/widgets.css');

//require jquery
var $ = require('jquery');
require('jquery-ui/ui/widgets/datepicker');

// set root folder to ./
var BuildModuleUrl = require('cesium/Source/Core/buildModuleUrl');
BuildModuleUrl.setBaseUrl('./');

//require utils module
const Utils = require('./Utils/Utils');
// require the Viewer object
var Viewer = require('cesium/Source/Widgets/Viewer/Viewer');

// create globe
var earth = new Viewer('cesiumContainer'); 

earth.imageryProvider = new Cesium.BingMapsImageryProvider({
                url : 'https://dev.virtualearth.net',
                key : 'AryMbHZCNC1iIE3WKhXFEAJVhmtAB_ac-OqUP2B9hnhUJojNdgGy2kgyjjg8NiAo',
                mapStyle : Cesium.BingMapsStyle.AERIAL,
                baseLayerPicker: false
}); 

              
  
// render HD stars
earth.skyBox =  new Cesium.SkyBox ({
        sources : {
          positiveX : '../public/Assets/stars/TychoSkymapII.t3_08192x04096_80_px.jpg',
          negativeX : '../public/Assets/stars/TychoSkymapII.t3_08192x04096_80_mx.jpg',
          positiveY : '../public/Assets/stars/TychoSkymapII.t3_08192x04096_80_py.jpg',
          negativeY : '../public/Assets/stars/TychoSkymapII.t3_08192x04096_80_my.jpg',
          positiveZ : '../public/Assets/stars/TychoSkymapII.t3_08192x04096_80_pz.jpg',
          negativeZ : '../public/Assets/stars/TychoSkymapII.t3_08192x04096_80_mz.jpg'
        }  
});


var isSpinning = false;
var scene = earth.scene;

// Add event to rotate camera for globe
function addSpinCameraEvent(){
  earth.clock.onTick.addEventListener(spinCamera);
}

// Remove event to rotate camera for globe
function removeSpinCameraEvent(){
  earth.clock.onTick.removeEventListener(spinCamera);
}

//rotate globe function
function rotateGlobe(){
    //if not spinning, spin
    if (!isSpinning){
      addSpinCameraEvent();
      isSpinning = true;
    }
    else{
      //stop spinning
      removeSpinCameraEvent();
      isSpinning = false;
    }
  }

//spin camera function
function spinCamera(clock) {
    scene.camera.rotateRight(0.001);
}

//Enable lighting based on sun/moon positions
//earth.scene.globe.enableLighting = true;

console.log(earth.animation.viewModel.timeLabel);

// setup initial screen
Utils.showPositionOnMouseOver(earth);
Utils.createAnonyomeOfficesBillboards(earth);
Utils.filterControls(earth);
Utils.setWidgetTimezone(earth);

console.log(earth.animation.viewModel.timeLabel);

$("#rotation").change(function() {
    console.log(`rotation changed`);
    rotateGlobe();
})

