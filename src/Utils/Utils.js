// import anonyome logo
import logoUrl from '../../public/Assets/images/anonyome_logo2.png';
// require jquery
var $ = require('jquery');

/**
 * setWidgetTimezone()
 * @description This function sets the timezone 
 *               of both the Animation and Timeline widgets
 * @namespace Utils
 * @param {Cesium.Viewer} the viewer that renders the globe
 * @return {void}
 */  

function setWidgetTimezone(viewer) {
    var TZcode = 'AEST';
    var UTCoffset = new Date();
    UTCoffset = -UTCoffset.getTimezoneOffset();
    var UTCscratch = new Cesium.JulianDate();

    // Date formatting to a global form
    function localeDateTimeFormatter(datetime, viewModel, ignoredate) {
        if (UTCoffset) datetime = Cesium.JulianDate.addMinutes(datetime, UTCoffset, UTCscratch);
        var gregorianDT = Cesium.JulianDate.toGregorianDate(datetime), objDT;
        if (ignoredate)
            objDT = '';
        else {
            objDT = new Date(gregorianDT.year, gregorianDT.month - 1, gregorianDT.day);
            objDT = gregorianDT.day + ' ' + objDT.toLocaleString("en-us", { month: "short" }) + ' ' + gregorianDT.year;
            if (viewModel || gregorianDT.hour + gregorianDT.minute === 0)
                return objDT;
            objDT += ' ';
        }
        return objDT + Cesium.sprintf("%02d:%02d:%02d " + TZcode, gregorianDT.hour, gregorianDT.minute, gregorianDT.second);
    }

    function localeTimeFormatter(time, viewModel) {
        return localeDateTimeFormatter(time, viewModel, true);
    }

    viewer.animation.viewModel.dateFormatter = localeDateTimeFormatter;
    viewer.animation.viewModel.timeFormatter = localeTimeFormatter;
    viewer.timeline.makeLabel = function (time) { return localeDateTimeFormatter(time); }

}

/**
 * filterControls()
 * @description Controls behaviour of UI filter controls
 * This function gets the selected parameters on the UI 
 * and passes them to loadData() for data manipulation and drawing
 * @namespace Utils
 * @param {Cesium.Viewer} the viewer that renders the globe
 * @return {void}
 */  
function filterControls(viewer){
    var finalDate;
    var initialDate;
    var historyMode = false;
    var counter = 0;
    var datePickers = $('#datepicker, #datepicker2');
    var dateLabels = $('#dateLabel1, #dateLabel2');
    var viewMode;

    // hide radio button by default
    $('#inboundOutbound').hide();
    // hide datePickers
    datePickers.hide();
    // hide dateLabels
    dateLabels.hide();

    // View Mode dropdown
    $('#viewModes').change(function(){
        viewMode = $("#viewModes option:selected").val();
        console.log(`view mode changed to ${viewMode}`);
        if (viewMode === 'history') {
            datePickers.show();
            dateLabels.show();
            historyMode = true;
            $('#inboundOutbound').hide();
            datePickers.datepicker('setDate', null);
            viewer.entities.removeAll();
            setClockToDefault(viewer);
            showPositionOnMouseOver(viewer);
            createAnonyomeOfficesBillboards(viewer);
        }
        if (viewMode === 'now') {
            datePickers.hide();
            dateLabels.hide();
            datePickers.datepicker('setDate', null);
            $('#inboundOutbound').hide();
            historyMode = false;
            viewer.entities.removeAll();
            setClockToDefault(viewer);
            showPositionOnMouseOver(viewer);
            createAnonyomeOfficesBillboards(viewer);
        }
    });

    // Date Pickers
    // set Initial Date datepicker
    $("#datepicker").datepicker({
        changeMonth: true,
        changeYear: true,
        onSelect: function () {
            initialDate = $('#datepicker').datepicker('getDate').toISOString();
            console.log(initialDate);
            // check against finalDate
            if (initialDate > finalDate) {
                alert(`Initial Date is later than Final Date. Please enter correct dates.`);
                $(this).datepicker('setDate', null);
            }
        }
    });
    // set final Date datepicker
    $("#datepicker2").datepicker({
        changeMonth: true,
        changeYear: true,
        onSelect: function () {
            finalDate = $('#datepicker2').datepicker('getDate').toISOString();
            console.log(finalDate);
            // check against initialDate
            if(finalDate < initialDate) {
                alert(`Final date is earlier than Initial Date. Please enter correct dates.`);
                $(this).datepicker('setDate', null);
            }
        }
    });
    
    // Radio Buttons
    // Get value from dropdown box and pass it to loadData()
    $("#dataTypes").change(function(){
        console.log('changed');
        var selectedType = $("#dataTypes option:selected").val();
        var option = $("#dataTypes option:selected").text();
        
        if (!selectedType || !option) {
            alert('Please select a data type.');
        } else if (selectedType === 'clear') {

            console.log('globe cleared');
            $("#inboundOutbound").hide();
            datePickers.datepicker('setDate', null);
            // remove entities
            viewer.entities.removeAll();
            // setWidgetTimezone(viewer);
            setClockToDefault(viewer);
            // re render offices
            createAnonyomeOfficesBillboards(viewer);
            showPositionOnMouseOver(viewer);

        } else {
            // show radio buttons
            $('#inboundOutbound').show();

            if (historyMode && (!initialDate || !finalDate)) {
                alert(`You are in History Mode. Please select Dates`)
            } else if (historyMode && initialDate && finalDate) {
                // get radio button value
                var direction = $("input[name='direction']:checked").val();
                console.log(direction);
                // pass selectedType, viewer and direction to loadData()
                loadData(selectedType, viewer, direction, historyMode);
                
                
                console.log(`changed to option: ${option} and type: ${selectedType}. HistoryMode is ${historyMode}`);
            } else if (historyMode === false) {
                var direction = $("input[name='direction']:checked").val();
                console.log(direction);
                loadData(selectedType, viewer, direction, historyMode);
            }
        }
    });
};

/** 
 * loadData()
 * @description function that downloads and parses the csv file into javascript object
 * @memberof filterControls()
 * @param {number} the rate which the globe will rotate by
 * @param {string} the type of data to display. Eg: 'calls', 'messages'
 * @return {void}
 */  
function loadData(type, viewer, direction, historyMode) {
    // set url to CSV file
    var pathCSV;
    (historyMode) ?  pathCSV = 'http://localhost:3000/data/historical.csv' : pathCSV = 'http://localhost:3000/data/mockdata.csv';
    
    // require papaparse
    var Papa = require('papaparse');
    /** 
     * @description function that adds rotation to the globe.
     * @memberof loadData()
     * @param {url} the url to the database which contains the csv file
     * @param {callback} the callback function that will handle the results of the parsed csv
     * @return {void}
     */  
    function parseCSV(url, callback) {
        Papa.parse(url, {
        download: true,
        header: true,
        delimiter: ",",
        dynamicTyping: true,
        complete: function(results, myFile) {
              console.log("Parsing complete:", results, myFile);
              callback(results.data);
          }
        })
    }
    // parse CSV file 
    parseCSV(pathCSV, function(data) {
        console.log(data);
        handleSudoData(data, type, viewer, direction, historyMode);
    });
}

/** 
 * handleSudoData()
 * @description  This function grabs the selected data type array and draw the lines on the globe
 * @memberof loadData()
 * @param {Array} the array containing all sudo data records
 * @param {string} the type of data to display. Eg: 'calls', 'messages'
 * @param {Cesium.Viewer} the viewer that renders the globe
 * @return {void}
 */  
function handleSudoData(sudoData, type, viewer, direction, historyMode) {
    
    switch (type) {
        case 'call':
            var callsArray = getDataTypeArray(sudoData, type, direction);
            if (historyMode === true) {
                console.log("history is true");
                var czmlArray = convertToCZML(callsArray);
                renderCZML(czmlArray, viewer); 
            } else {
                draw2DLines(callsArray, viewer);
                // draw3DLines(callsArray, viewer);
                showPositionOnMouseOver(viewer);
            }
              
            break;
        case 'message':
            var messagesArray = getDataTypeArray(sudoData, type, direction);
            if (historyMode === true) {
                console.log("history is true");
                var czmlArray = convertToCZML(messagesArray);

                renderCZML(czmlArray, viewer); 
            } else {
                draw2DLines(messagesArray, viewer);
                // draw3DLines(callsArray, viewer);
                showPositionOnMouseOver(viewer);
            }
            break;
        case 'clear':
            // // hide radiobuttons
            // $('#inboundOutbound').hide();
            // // remove entities
            // viewer.entities.removeAll();
            // // re render offices
            // createAnonyomeOfficesBillboards(viewer);
            // showPositionOnMouseOver(viewer);
            break;
        default:
            console.log(`Did not loaded ${type} array.`);
            break;
    }
}

/** 
 * handleSudoData()
 * @description This function selects the type of data we want to display
 * @memberof handleSudoData()
 * @param {Array} the array containing all sudo data records
 * @param {string} the type of data to display. Eg: 'calls', 'messages'
 * @return {Array} || {string}
 */ 
function getDataTypeArray(sudoDataArray, type, direction) {
    var dataTypeArray = $.grep(sudoDataArray, function(item) {
        // set default direction
        direction = direction || 'both';

        if (direction === 'both') {
            return item.type === type;
        } else {
            return item.type === type && item.direction === direction;
        }     
    });
    if (dataTypeArray.length === 0 || typeof dataTypeArray === 'undefined') {
        return console.log(`Failed to load array of ${type}s.`)
    } else {
        console.log(`Successfully loaded array of ${type}s and direction ${direction}`)
        console.log(dataTypeArray);
        return dataTypeArray;
    }
}

/** 
 * createCallbackFunction()
 * @description This function creates the callback function that renders the point along the geodesic line
 * @param {Cesium.EllipsoidGeodesic} the geodesic line where the point will be rendered along
 * @param {number} the initial value of the moving point
 * @param {number} the rate in Radians by which the point will move along the line
 * @return {void} 
 */ 
function createCallbackFunction(geodesic, initialValue, delta) {
    return new Cesium.CallbackProperty(function(){
        var cartographic = geodesic.interpolateUsingFraction(initialValue, new Cesium.Cartographic());
        var position = Cesium.Cartesian3.fromRadians(cartographic.longitude, cartographic.latitude);
        initialValue = initialValue > 1 ? 0 : initialValue + delta;
        return position;
    }, false)
}

/** 
 * handleSudoData()
 * @description This function draws 2D(geodesic) lines on the globe
 * @param {Array} the array containing all sudo data records
 * @param {Cesium.Viewer} the viewer that renders the globe
 * @return {void} 
 */ 
function draw2DLines(dataTypeArray, viewer) {
    // remove any entities being drawn if any
    viewer.entities.removeAll();

    // create array for callback functions
    var funcsArray = [];

    // set values for the moving point
    var initialValue = 0;
    var delta;

    var noDupArray = prepareArrayForDrawing(dataTypeArray);
    
    for (var i = 0; i < noDupArray.length; i++) {
        var sLon = noDupArray[i].sLon;
        var sLat = noDupArray[i].sLat;
        var eLon = noDupArray[i].eLon;
        var eLat = noDupArray[i].eLat;
        var countFactor = noDupArray[i].count;

        delta = (0.0005 * countFactor);

        //  Cartographic point from Degrees based on origin long and lat
        var originCarto = new Cesium.Cartographic.fromDegrees(sLon, sLat);
        // Cartographic point from Degrees based on destination long and lat
        var destinationCarto = new Cesium.Cartographic.fromDegrees(eLon, eLat);
        // create geodesic line between originCarto and destinationCarto
        var geodesic = new Cesium.EllipsoidGeodesic(originCarto, destinationCarto);

        //Create a random bright color.
        var randomColor = Cesium.Color.fromRandom({
            minimumRed : 0.75,
            minimumGreen : 0.25,
            minimumBlue : 0.25,
            alpha : 1.0
        });

        // add callbackfunction for drawing moving point to the corresponding geodesic to the callbacks array 
        funcsArray.push(createCallbackFunction(geodesic, initialValue, delta));
        
        // output current state of 
        console.log("Geodesic start: " + geodesic.start);
        console.log("Geodesic end: " + geodesic.end);
        console.log("Surface Distance: " + geodesic.surfaceDistance);
        console.log(funcsArray[i]);   
        
        // add polyline to entities
        viewer.entities.add({
            name: `Info Placeholder`,
            description: `Origin -> Long: ${sLon} Lat: ${sLat} </br>
                          Destination -> Long: ${eLon} Lat: ${eLat}`,
            polyline: {
                positions: Cesium.Cartesian3.fromRadiansArray([
                    geodesic.start.longitude, geodesic.start.latitude,
                    geodesic.end.longitude, geodesic.end.latitude,
                ]),
                width: countFactor,
                material : new Cesium.PolylineGlowMaterialProperty({
                    color : randomColor,
                    glowPower : countFactor * 0.1,
                   // outlineColor : Cesium.Color.WHITE
                })
            },
            position: funcsArray[i], //position is given by the callback function store in funcsArray[i]
            point: {
                color : randomColor,
                pixelSize : countFactor + 8
            }
        });
    }
}

/** 
 * create3DCallbackFunction()
 * @description This function creates the callback function that renders the point along the geodesic line
 * @param {Cesium.EllipsoidGeodesic} the geodesic line where the point will be rendered along
 * @param {Number} the initial value of the moving point
 * @param {Number} the rate in Radians by which the point will move along the line
 * @return {Void} 
 */ 
function create3DCallbackFunction(geodesic, initialValue, delta, arrayHeights, counter) {
        return new Cesium.CallbackProperty(function(){
            var cartographic = geodesic.interpolateUsingFraction(initialValue, new Cesium.Cartographic()); 
            var position = Cesium.Cartesian3.fromRadians(cartographic.longitude, cartographic.latitude, arrayHeights[counter]);
            initialValue = initialValue > 1 ? 0 : initialValue + delta;
            counter = (counter > arrayHeights.length) ? 0 : counter + 1;
            //console.log(counter); 
            return position;
        }, false)
}

function draw3DLines(dataTypeArray, viewer) {
    viewer.entities.removeAll();
    var width = (Math.random() * 8) + 1;

    var noDupArray = prepareArrayForDrawing(dataTypeArray);

    for (var i = 0; i < noDupArray.length; i++) {
        var sLon = noDupArray[i].sLon;
        var sLat = noDupArray[i].sLat;
        var eLon = noDupArray[i].eLon;
        var eLat = noDupArray[i].eLat;
        var height = 0;
        var initialValue = 0;
        var delta = 0.005;
        var arrayHeights = [];

        var width = noDupArray[i].count;
        console.log(width);

        var originCarto = new Cesium.Cartographic.fromDegrees(sLon, sLat);
        var destinationCarto = new Cesium.Cartographic.fromDegrees(eLon, eLat);
        var geodesic = new Cesium.EllipsoidGeodesic(originCarto, destinationCarto);

        //Create a random bright color.
        var randomColor = Cesium.Color.fromRandom({
            minimumRed : 0.75,
            minimumGreen : 0.75,
            minimumBlue : 0.75,
            alpha : 1.0
        });

        var beforeMiddle1 = geodesic.interpolateUsingFraction(0.42,new Cesium.Cartographic());
        beforeMiddle1.height = geodesic.surfaceDistance / 7.295;
        arrayHeights.push(beforeMiddle1.height);
        
        var beforeMiddle2 = geodesic.interpolateUsingFraction(0.45,new Cesium.Cartographic());
        beforeMiddle2.height = geodesic.surfaceDistance / 6.955;
        arrayHeights.push(beforeMiddle2.height);
        
        var beforeMiddle3 = geodesic.interpolateUsingFraction(0.48,new Cesium.Cartographic());
        beforeMiddle3.height = geodesic.surfaceDistance / 6.7;
        arrayHeights.push(beforeMiddle3.height);
        
        var middlePoint = geodesic.interpolateUsingFraction(0.5,new Cesium.Cartographic());
        middlePoint.height = geodesic.surfaceDistance / 6.667;
        arrayHeights.push(middlePoint.height);
        
        var afterMiddle1 = geodesic.interpolateUsingFraction(0.52,new Cesium.Cartographic());
        afterMiddle1.height = geodesic.surfaceDistance / 6.7;
        arrayHeights.push(afterMiddle1.height);
        
        var afterMiddle2 = geodesic.interpolateUsingFraction(0.55,new Cesium.Cartographic());
        afterMiddle2.height = geodesic.surfaceDistance / 6.955;
        arrayHeights.push(afterMiddle2.height);
        
        var afterMiddle3 = geodesic.interpolateUsingFraction(0.58,new Cesium.Cartographic());
        afterMiddle3.height = geodesic.surfaceDistance / 7.295;
        arrayHeights.push(afterMiddle3.height);


        //output current state of 
        console.log("Geodesic start: " + geodesic.start);
        console.log("Geodesic end: " + geodesic.end);
        console.log("Surface Distance: " + geodesic.surfaceDistance);
       // console.log(funcsArray[i]); 
        console.log(arrayHeights);     
        
        viewer.entities.add({
            name: geodesic.start.latitude.toString() + '\n' +geodesic.end.latitude.toString(),
            description: "<p><a href='http://www.anonyome.com' target='_blank'>Anonyome.</a> Anonyome Labs.</p>",
            polyline: {
                positions: Cesium.Cartesian3.fromRadiansArrayHeights([
                    geodesic.start.longitude, geodesic.start.latitude, geodesic.start.height,
                    beforeMiddle1.longitude, beforeMiddle1.latitude, beforeMiddle1.height,
                    beforeMiddle2.longitude, beforeMiddle2.latitude, beforeMiddle2.height,
                    beforeMiddle3.longitude, beforeMiddle3.latitude, beforeMiddle3.height,
                    middlePoint.longitude, middlePoint.latitude, middlePoint.height,
                    afterMiddle1.longitude, afterMiddle1.latitude, afterMiddle1.height,
                    afterMiddle2.longitude, afterMiddle2.latitude, afterMiddle2.height,
                    afterMiddle3.longitude, afterMiddle3.latitude, afterMiddle3.height,
                    geodesic.end.longitude, geodesic.end.latitude, geodesic.end.height,
                ]),
                width: width,
                 material : new Cesium.PolylineGlowMaterialProperty({
                    color : randomColor,
                    glowPower: 0.50
                })
            },
            // position: funcsArray[i], //position is given by the callback function store in funcsArray[i]
            // point: {
            //     color : randomColor,
            //     pixelSize : 10
            // }
        });
    }
}

/** 
 * showPositionOnMouseOver()
 * @description This function renders a real-time billboard which displays the coordinates in degrees 
 *              when hovering over the globe
 * 
 * @return {void} 
 */ 
function showPositionOnMouseOver(viewer) {
   var entity = viewer.entities.add({
        label : {
            show : false,
            showBackground : true,
            font : '14px monospace',
            horizontalOrigin : Cesium.HorizontalOrigin.LEFT,
            verticalOrigin : Cesium.VerticalOrigin.TOP,
            pixelOffset : new Cesium.Cartesian2(15, 0)
        }
    });

    // Mouse over the globe to see the cartographic position
    var handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
    handler.setInputAction(function(movement) {
        var cartesian = viewer.camera.pickEllipsoid(movement.endPosition, viewer.scene.globe.ellipsoid);
        if (cartesian) {
            var cartographic = Cesium.Cartographic.fromCartesian(cartesian);
            var longitudeString = Cesium.Math.toDegrees(cartographic.longitude).toFixed(2);
            var latitudeString = Cesium.Math.toDegrees(cartographic.latitude).toFixed(2);

            entity.position = cartesian;
            entity.label.show = true;
            entity.label.text =
                'Lon: ' + ('   ' + longitudeString).slice(-7) + '\u00B0' +
                '\nLat: ' + ('   ' + latitudeString).slice(-7) + '\u00B0';
        } else {
            entity.label.show = false;
        }
    }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);
}

/** 
 * createAnonyomeOfficesBillboards()
 * @description This function renders the Anonyome logo at their real office locations
 * @param {Cesium.Viewer} the viewer that renders the globe
 * @return {void} 
 */ 
function createAnonyomeOfficesBillboards(viewer) {
    // Salt Lake City
    viewer.entities.add({
        name: "Salt Lake City Office",
        description: `<p><a href='http://www.anonyome.com' target='_blank'>Anonyome.</a> Anonyome Labs.</p>`,
        position : Cesium.Cartesian3.fromDegrees(-111.891047, 40.760779),
        billboard : {
            image : logoUrl,
            scale : 0.10,
        }
    });
    // San Francisco
    viewer.entities.add({
        name: "San Francisco Office",
        description: `<p><a href='http://www.anonyome.com' target='_blank'>Anonyome.</a> Anonyome Labs.</p>`,
        position : Cesium.Cartesian3.fromDegrees(-122.419416, 37.77493),
        billboard : {
            image : logoUrl,
            scale : 0.10,
        }
    });
    // Gold Coast
    viewer.entities.add({
        name: "Gold Coast Office",
        description: `<p><a href='http://www.anonyome.com' target='_blank'>Anonyome.</a> Anonyome Labs.</p>`,
        position : Cesium.Cartesian3.fromDegrees(153.42666864395142, -28.001795217995028),
        billboard : {
            image : logoUrl,
            scale : 0.10,
        }
    });
}

/** 
 * prepareArrayForDrawing()
 * @description This function counts the number of occurrences of the same origin/destination
 *              and returns an array with no duplicates and a count property
 * @param {Array} calls, emails or messages
 * @return {Array} the filtered array to be rendered
 */ 
function prepareArrayForDrawing(dataTypeArray) {
    // count number of occurences of the same location and 
    // select only one record. The new array should have no
    // duplicates. The number of occurences is a factor of the geodesic width
    
    // set counter to 1
    var counter = 1;

    // create new filtered array 
    var newArray = [];

    for (var i = 0; i < dataTypeArray.length; i++) {
        var element = { sLon: dataTypeArray[i].sLon, 
                        sLat: dataTypeArray[i].sLat, 
                        eLon: dataTypeArray[i].eLon,
                        eLat: dataTypeArray[i].eLat,
                        direction: dataTypeArray[i].direction };
        // check if element is already in the array, otherwise, push it
        if(!newArray.includes(element)) {
            newArray.push(element);
        }
        // compare elements for duplicates
        for (var j = 1; j < dataTypeArray.length; j++) {
            var element2 = { sLon: dataTypeArray[j].sLon, 
                             sLat: dataTypeArray[j].sLat,
                             eLon: dataTypeArray[j].eLon,
                             eLat: dataTypeArray[j].eLat,
                             direction: dataTypeArray[j].direction };
            if ((element.sLon === element2.sLon && element.sLat === element2.sLat)
                 && (element.eLon === element2.eLon && element.eLat && element2.eLat)
                    && (element.direction === element2.direction)) {
                counter++;
            } 
        }
        // add count, direction and timestamp property to element
        newArray[i].count = counter;
        newArray[i].timestamp = dataTypeArray[i].timestamp;
        // set counter to 0 once comparisons are finished
        counter = 0;
    }

    console.log(newArray);
    // create array with no duplicates and return it
    var noDupArray = newArray.reduce(function(previous, current) {
          var object = previous.filter(object => object.sLon === current.sLon && object.sLat === current.sLat 
                                                    && object.eLon === current.eLon && object.eLat === current.eLat
                                                    && object.direction === current.direction);
          if (object.length == 0) {
            previous.push(current);
          }
          return previous;
        }, []);
        
    console.log(noDupArray);
    return noDupArray;
}

/** 
 * setClockToDefault()
 * @description This function resets the clock to the current time when changing from history mode
 * @param {Cesium.Viewer} 
 */ 

function setClockToDefault(viewer) {
    var now = Cesium.JulianDate.now(new Cesium.JulianDate());
    viewer.clock.currentTime = now;
    viewer.clock.startTime = now.clone();
    viewer.clock.stopTime = Cesium.JulianDate.addDays(now, 1.0, new Cesium.JulianDate());
    viewer.clock.multiplier = 1.0;
    viewer.timeline.updateFromClock();
    viewer.timeline.zoomTo(viewer.clock.startTime, viewer.clock.stopTime);
}


/** 
 * convertToCZML()
 * @description This function converts a dataTypeArray into a CZML formatted array
 * @param {Array} calls, emails or messages
 * @return {Array} the filtered array to be rendered
 */ 
function convertToCZML(dataTypeArray) {
    var initialDate = $('#datepicker').datepicker('getDate').toISOString();
    var finalDate = $('#datepicker2').datepicker('getDate').toISOString();

    var timeInterval = `${initialDate}/${finalDate}`;
    console.log(timeInterval);

    var czml = [
        {
            "id": "document",
            "name": "Anonyome CZML",
            "version": "1.0",
            "clock": {
                "interval": timeInterval,
                "currentTime": initialDate,
                "multiplier": 8600,
                "range": "LOOP_STOP",
                "step": "SYSTEM_CLOCK_MULTIPLIER"
            }
        }
    ]

    for (var i = 0; i < dataTypeArray.length; i++) {
        var sLon = dataTypeArray[i].sLon;
        var sLat = dataTypeArray[i].sLat;
        var eLon = dataTypeArray[i].eLon;
        var eLat = dataTypeArray[i].eLat;
        var time = dataTypeArray[i].timestamp;
        var startInterval = Cesium.JulianDate.fromIso8601(time);
        var endInterval = Cesium.JulianDate.addHours(startInterval, 1.0, new Cesium.JulianDate());
        var intervalPolyline = `${startInterval}/${endInterval}`;

        var packet = {
            "polyline": {
                "positions": [{
                    "interval": intervalPolyline,
                    "cartographicDegrees": [ sLon, sLat, 0, 
                                             eLon, eLat, 0 ]
                }],
                "material": "polylineGlow"
            }
        }
        czml.push(packet);
    }
    console.log(czml);
    return czml;
}

/** 
 * renderCZML()
 * @description This function renders the time-dynamic data from the CZML array
 * @param {Array} calls, emails or messages
 * @param {Cesium.Viewer} the viewer to render the CZML data
 */ 
function renderCZML(czmlArray, viewer) {
    // create Promise fro Czml Datasource
    var dataSourcePromise = Cesium.CzmlDataSource.load(czmlArray);
    // add datasource to viewer dataSources
    viewer.dataSources.add(dataSourcePromise);
    viewer.zoomTo(dataSourcePromise);
}

module.exports = {
    loadData: loadData,
    showPositionOnMouseOver: showPositionOnMouseOver,
    createAnonyomeOfficesBillboards: createAnonyomeOfficesBillboards,
    filterControls: filterControls,
    setWidgetTimezone: setWidgetTimezone
}

