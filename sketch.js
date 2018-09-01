/* 
 * StreetsOfVienna, a JS street guessing game
 * (c) 2018 Benjamin Reimitz
 */

var data, tempdata,
    bezirksgrenzen,
    playarea,
    mymap,
    marker,
    guess,
    guessmarker = new L.marker(),
    error,
    drawnStreet,
    wien = new L.LatLng(48.2110, 16.3725),
    defaultdistricts = new Set(Array.from({length: 14}, (x,i) => i+10)),
    restricteddistricts = new Set(),
    unrestricteddistricts = new Set(Array.from({length: 23}, (x,i) => i+1)),
    districtcontrol,
    districts = {};

districts.getKeyByValue = function( value ) {
    for( var prop in this ) {
        if( this.hasOwnProperty( prop ) ) {
             if( this[ prop ] === value )
                 return prop;
        }
    }
};

function preload() {
    // var url = "https://data.wien.gv.at/daten/geo?service=WFS&request=GetFeature&version=1.1.0&typeName=ogdwien:STRASSENGRAPHOGD&srsName=EPSG:4326&outputFormat=json"
    // data = loadJSON(url)
    // Data: Stadt Wien – data.wien.gv.at
    data = loadJSON("streets.json");
    bezirksgrenzen = loadJSON("bezirke.json");
}

function setup() {
    // MAP
    // possible layers = ["toner", "toner-lines", "terrain","terrain-lines", "watercolor"];
    var layer = "toner-lines";
    mymap = new L.Map(layer, {
        center: wien,
        zoom: 11,
        minZoom: 11,
        maxZoom: 16,
        zoomControl: false,
        zoomDelta: 0.5
    });
    var linelayer = new L.StamenTileLayer(layer, {
        detectRetina: true
    });
    mymap.addLayer(linelayer);
    var labellayer = new L.StamenTileLayer("toner-labels",{
        detectRetina: true
    });

    mymap.setMaxBounds(mymap.getBounds());
    mymap.setZoom(12);

    // Marker
    marker = new L.marker(wien).addTo(mymap);
    
    // District Control Button
    districtcontrol = new L.control.layers(null, null);
    for (var i = 1; i < 24; i++) {
        districts[i]= new L.geoJSON(bezirksgrenzen, {filter: function(feature) {return feature.properties.BEZNR == i;}, style: {'color': "#707070"}});
        districtcontrol.addOverlay(districts[i], '<span class="glyphicon glyphicon-ban-circle"></span> '+i+". Bez.");
        districts[i].onAdd = function (map) {
            this.eachLayer(map.addLayer, map);
            restricteddistricts.add(Number(districts.getKeyByValue(this)));
            unrestricteddistricts.delete(Number(districts.getKeyByValue(this)));
        };
        districts[i].onRemove = function (map) {
            this.eachLayer(map.removeLayer, map);
            restricteddistricts.delete(Number(districts.getKeyByValue(this)));
            unrestricteddistricts.add(Number(districts.getKeyByValue(this)));
        };
        if (defaultdistricts.has(i)) {
            districts[i].addTo(mymap);
        };
    };
    districtcontrol.addTo(mymap);

    // Info
    var street;
	var info = L.control({position: "topleft"});
	info.onAdd = function () {
        this._div = L.DomUtil.create('div', 'info');
        street = getRandomStreet();
		this.update();
		return this._div;
	};
    info.update = function () {
        this._div.innerHTML = 'Find: </br>'+street;
    };
    info.addTo(mymap);

    // Submit Button
    var errorline;
    var submitb = L.control.custom({
        position: 'bottomright',
        content : '<button name="guess" type="button" class="btn btn-success btn-lg">'+
                '<i class="glyphicon glyphicon-ok"></i>'+
                '</button>',
        events:
        {
            click: function()
            {
                submitb.remove();
                resetb.addTo(mymap);
                guess = marker.getLatLng();
                marker.remove();
                drawStreet(street);
                error = 9999999;
                var nearestpoint;
                drawnStreet.eachLayer(function (layer) {
                    layer._latlngs.forEach(function (teil) {
                        teil.forEach(function (ll) {
                            var dist = ll.distanceTo(guess);
                            if (dist < error) {
                                error = dist;
                                nearestpoint = ll;
                                }
                        })
                    })
                });
                guessmarker.setLatLng(guess).addTo(mymap);
                guessmarker.bindPopup("Your Guess</br>off by: "+Math.round(error)+"m").openPopup();
                console.log('ok clicked');
                mymap.addLayer(labellayer);
                mymap.fitBounds(L.featureGroup([guessmarker, drawnStreet]).getBounds());
                errorline = L.polyline([guess, nearestpoint], {color: "red", opacity: 0.5}).addTo(mymap);
            },
        }});
        submitb.addTo(mymap);

    // Reset Button
    var resetb = L.control.custom({
        position: 'bottomright',
        content : '<button name="reset" type="button" class="btn btn-primary btn-lg">'+
                '<i class="glyphicon glyphicon-share-alt"></i>'+
                '</button>',
        events:
        {
            click: function(data) {
                resetb.remove();
                submitb.addTo(mymap);
                marker.addTo(mymap);
                console.log('refresh clicked');
                playarea = new L.featureGroup(activeDistricts());
                mymap.fitBounds(playarea.getBounds());
                street = getRandomStreet();
                info.update();
                mymap.removeLayer(labellayer);
                drawnStreet.remove();
                guessmarker.remove();
                errorline.remove();
            },
        }
    });
}

function drawStreet(name) {
    drawnStreet = L.geoJSON(data, {filter: function(feature) {return feature.properties.FEATURENAME == name && !restricteddistricts.has(Number(feature.properties.BEZIRK.slice(3,5)));}, 
                                    style: {'color': "#0033FF"}}).addTo(mymap);
}

function activeDistricts () {
    var result = [];
    console.log(result);
    for (var i = 1; i < 24; i++) {
        if (!restricteddistricts.has(i)) {
            result.push(districts[i]);
        }
    }
    return result;
}

function getRandomStreet() {
    tempdata = data.features.filter(function (feature) {return !restricteddistricts.has(Number(feature.properties.BEZIRK.slice(3,5)))});
    var temp = tempdata[floor(random(tempdata.length))].properties.FEATURENAME;
    if (temp != "Unbenannte Verkehrsfläche" && temp != "B14" && temp != "B227") {
        console.log(temp)
        return temp;
    } else {
        return getRandomStreet();
    }
}

function draw() {
    marker.setLatLng(mymap.getCenter());
}
