var data;
var tempdata;
var bezirksgrenzen;
var playarea;
var mymap;
var marker;
var guess;
var guessmarker = new L.marker();
// var guessLatLng;
var street;
// var errorline;
var drawnStreet;
var wien = new L.LatLng(48.2110, 16.3725);
var defaultdistricts = new Set([10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 21, 22, 23]);
var restricteddistricts = new Set();
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
        zoomControl: false
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
    var i;
    for (i = 1; i < 24; i++) {
        districts[i]= new L.geoJSON(bezirksgrenzen, {filter: function(feature) {return feature.properties.BEZNR == i;}, style: {'color': "#707070"}});
        districtcontrol.addOverlay(districts[i], i.toString());
        districts[i].onAdd = function (map) {
            this.eachLayer(map.addLayer, map);
            restricteddistricts.add(Number(districts.getKeyByValue(this)));
        };
        districts[i].onRemove = function (map) {
            this.eachLayer(map.removeLayer, map);
            restricteddistricts.delete(Number(districts.getKeyByValue(this)));
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
                guessmarker.setLatLng(guess).addTo(mymap);
                guessmarker.bindPopup("Your Guess").openPopup();
                console.log('ok clicked');
                mymap.addLayer(labellayer);
                drawStreet(street);
                mymap.fitBounds(L.featureGroup([guessmarker, drawnStreet]).getBounds());
                // mymap.fitBounds(drawnStreet.getBounds());
                // var really = marker._latlng;
                // errorline = L.polyline([guess, really]).addTo(mymap);
                // var errordist = mymap.distance(guess, really);
                // console.log(errordist);
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
                // playarea = L.featureGroup([activeDistricts()]);
                // mymap.fitBounds(playarea);
                mymap.setView(wien, 13);
                street = getRandomStreet();
                info.update();
                mymap.removeLayer(labellayer);
                drawnStreet.remove();
                guessmarker.remove();
                // errorline.remove();
            },
        }
        })
        .addTo(mymap);

}

function drawStreet(name) {
    drawnStreet = L.geoJSON(data, {filter: function(feature) {return feature.properties.FEATURENAME == name;}, 
                                    style: {'color': "#0033FF"}}).addTo(mymap);
    // drawnStreet.addData(marker.toGeoJSON());
}

// function activeDistricts () {
//     var result = [];
//     for (i = 1; i < 24; i++) {
//         if (!restricteddistricts.has(i)) {
//             result.push(districts[i]);
//         }
//     }
//     return result;
// }

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
