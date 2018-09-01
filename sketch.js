/* 
 * StreetsOfVienna, a JS street guessing game
 * (c) 2018 Benjamin Reimitz
 */

var data;
var tempdata;
var bezirksgrenzen;
var playarea;
var mymap;
var marker;
var guess;
var guessmarker = new L.marker();
var street;
var error;
var nearestpoint;
var errorline;
var drawnStreet;
var wien = new L.LatLng(48.2110, 16.3725);
var defaultdistricts = new Set([10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 21, 22, 23]);
var restricteddistricts = new Set();
var unrestricteddistricts = new Set([1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23]);
var districtcontrol;
var districts = {};
var state = false;

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
    districtcontrol = new L.control.layers();
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
    var submitb = L.control.custom({
        position: 'bottomright',
        content : '<button name="guess" type="button" class="btn btn-success btn-lg">'+
                '<i class="glyphicon glyphicon-ok"></i>'+
                '</button>',
        classes : 'btn-group-horizontal btn-group-lg',
        style   :
        {
            margin: '10px',
            padding: '0px 0 0 0',
            cursor: 'pointer'
        },
        events:
        {
            click: function()
            {
                guess = marker.getLatLng();
                drawStreet(street);
                error = 9999999;
                drawnStreet.eachLayer(function (layer) {
                    layer._latlngs.forEach(function (teil) {
                        teil.forEach(function (ll) {
                            var dist = ll.distanceTo(guess);
                            if (dist < error) {
                                error = dist;
                                nearestpoint = ll;
                                }
                            // console.log(ll.distanceTo(guess))
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
        position: 'bottomleft',
        content : '<button name="new" type="button" class="btn btn-warning btn-lg">'+
                '<i class="glyphicon glyphicon-refresh"></i>'+
                '</button>',
        classes : 'btn-group-horizontal btn-group-lg',
        style   :
        {
            margin: '30px',
            padding: '0px 0 0 0',
            cursor: 'pointer'
        },
        events:
        {
            click: function(data) {
                console.log('refresh clicked');
                playarea = new L.featureGroup(activeDistricts());
                mymap.fitBounds(playarea.getBounds());
                // mymap.setView(wien, 13);
                street = getRandomStreet();
                info.update();
                mymap.removeLayer(labellayer);
                drawnStreet.remove();
                guessmarker.remove();
                errorline.remove();
            },
        }
        })
        .addTo(mymap);

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
