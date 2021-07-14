function load1() {
	console.log("Loading street data");
	return fetch("./static/data/wien_gen_merg_wgs84.geojson")
		.then(response => {
			if (response.headers.get('content-type') != 'application/geo+json') {
				throw new TypeError();
			}
			var j = response.json();
			return j;
		})
}

function load2() {
	console.log("Loading district data")
	return fetch("./static/data/districts.geojson")
		.then(response => {
			if (response.headers.get('content-type') != 'application/geo+json') {
				throw new TypeError();
			}
			var j = response.json();
			return j;
		})
}

function setup(bothdatas) {
	console.log("Starting Setup")
	var data = bothdatas[0];
	var districtdata = bothdatas[1];
	// Leaflet Map Construction
	var WIEN = new L.LatLng(48.2110, 16.3725);
	var map = L.map('map', {
		attributionControl: false,
		// center: WIEN,
		// zoom: 11,
		minZoom: 11,
		maxZoom: 16,
		zoomControl: false,
		zoomDelta: 0.5
	}).setView(WIEN, 11);

	// Basemap definitions
	var STAMEN_TONER_URL = "https://{s}.tile.stamen.com/toner-lines/{z}/{x}/{y}.png";
	var stamen_toner_lines = new L.tileLayer(STAMEN_TONER_URL, {
		detectRetina: true,
		attribution: [
			'Map tiles by <a href="http://stamen.com/">Stamen Design</a>, ',
			'under <a href="http://creativecommons.org/licenses/by/3.0">CC BY 3.0</a>. ',
			'Map data &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, ',
			'under <a href="http://www.opendatacommons.org/licenses/odbl">ODbL</a>. ',
			'Data: <a href="https://data.wien.gv.at">Stadt Wien</a>.'
		].join("")
	})
	var MAPBOX_BASE_URL = "https://api.mapbox.com/styles/v1/ahornsirup/ckr32k5fngg6618o9nsacnb5y/tiles/{z}/{x}/{y}?access_token="
	var MAPBOX_ACCESS_TOKEN = "pk.eyJ1IjoiYWhvcm5zaXJ1cCIsImEiOiJjazNqNTBxeHgwM2trM2RydnozbDdwMXMwIn0.0xe5TIh6XSo1pKrjsAUgEA"
	var mapbox_base = L.tileLayer(MAPBOX_BASE_URL + MAPBOX_ACCESS_TOKEN, {
		detectRetina: true,
		tileSize: 512,
		zoomOffset: -1,
		attribution: '© <a href="https://apps.mapbox.com/feedback/">Mapbox</a> © <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
	}).addTo(map);
	var MAPBOX_LABELS_URL = "https://api.mapbox.com/styles/v1/ahornsirup/ckr32wouf1caf19rzqqsf2szu/tiles/{z}/{x}/{y}?access_token="
	var mapbox_labels = L.tileLayer(MAPBOX_LABELS_URL + MAPBOX_ACCESS_TOKEN, {
		detectRetina: true,
		tileSize: 512,
		zoomOffset: -1,
		attribution: '© <a href="https://apps.mapbox.com/feedback/">Mapbox</a> © <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
	})

	// Leaflet Controls construction

	// Info Button
	var info = L.control.custom({
		position: 'topright',
		content: '<i class="material-icons">help</i>',
		classes: 'ctl info',
		style: {
			'border': '2px solid rgba(0,0,0,0.2)',
			'background-clip': 'padding-box',
			'font-size': '28px',
			"color": 'rgba(100,100,100,1)'
		},
		events: {
			click: openRightMenu
		}
	}).addTo(map);

	// Create district layers
	var playdistricts = new Set();
	var districts = {};
	for (var i = 1; i < 24; i++) {
		var d = L.geoJSON(districtdata, {
			filter: function (feature) {
				return feature.properties.BEZNR == i;
			},
			style: { 'color': "#808080" },
		});
		let dnum = i
		d.onAdd = function (map) {
			this.eachLayer(map.addLayer, map);
			playdistricts.add(dnum);
		};
		d.onRemove = function (map) {
			this.eachLayer(map.removeLayer, map);
			playdistricts.delete(dnum);
		}
		let dis = districtdata.features.filter((feature) => feature.properties.BEZNR == i);
		let name = dis[0].properties.NAMEK;
		d.nr = i;
		districts[i + "." + name] = d;
		// d.addTo(map);
	}
	districts["1.Innere Stadt"].addTo(map);

	// District Control Button
	var districtcontrol = new L.control.layers(null, districts);
	districtcontrol.addTo(map);
	// districtcontrol._container.innerHTML = '<i class="material-icons">layers</i>';

	var findctl = L.control.custom({
		position: 'topleft',
		content: "Placeholder",
		classes: 'ctl find',
		style: {
			'border': '2px solid rgba(0,0,0,0.2)',
			'background-clip': 'padding-box',
			'font-size': '18px',
			"color": 'rgba(100,100,100,1)'
		},
	}).addTo(map);

	// Continue Button
	var continuectl = L.control.custom({
		position: 'bottomright',
		content: '<i class="material-icons">redo</i>',
		classes: 'ctl continuectl',
		style: {
			'border': '2px solid rgba(0,0,0,0.2)',
			'background-clip': 'padding-box',
			'font-size': '28px',
			"color": 'rgba(100,100,100,1)'
		},
		events: {
			click: nextRound
		}
	});

	// Confirm Button
	var confirmctl = L.control.custom({
		position: 'bottomright',
		content: '<i class="material-icons">done</i>',
		classes: 'ctl confirmctl',
		style: {
			'border': '2px solid rgba(0,0,0,0.2)',
			'background-clip': 'padding-box',
			'font-size': '28px',
			"color": 'rgba(100,100,100,1)'
		},
		events: {
			click: submitGuess
		}
	}).addTo(map);

	// Attribution
	L.control.attribution({
		position: "bottomleft"
	}).addTo(map);

	var repoctl = L.control.custom({
		position: 'bottomleft',
		content: '<span class="slide"><a href="https://github.com/ryepenchi/streetguessr" target="_blank"><img src="./static/img/github_small.svg" /></a></span>',
		classes: 'ctl repoctl',
		style: {
			'border': '2px solid rgba(0,0,0,0.2)',
			'background-clip': 'padding-box',
			'font-size': '28px',
			"color": 'rgba(100,100,100,1)'
		}
	}).addTo(map);

	// Marker
	var marker = L.marker(WIEN).addTo(map).bindPopup("Your Guess");
	map.on('click', function (e) {
		marker.setLatLng(e.latlng)
	});

	var street, single, singleL;
	function getRandomStreet() {
		var tempdata = data.features.filter(function (feature) { return playdistricts.has(feature.properties.BEZ) });
		if (tempdata.length == 0) {
			return "No districts selected"
		} else {
			single = tempdata[getRandomInt(tempdata.length)];
			let name = single.properties.FEATURENAME
			findctl.container.innerHTML = name;
			street = L.polyline(single.geometry.coordinates);
			singleL = L.geoJSON(single);
		}
	}

	function getRandomInt(max) {
		return Math.floor(Math.random() * max);
	}

	function openRightMenu() {
		document.getElementById('rightmenu').classList.remove("collapsed");
		document.getElementById('rightmenu').classList.add("expanded");
	}

	function activeDistricts () {
		var result = [];
		Object.values(districts).forEach(d => {
			if (playdistricts.has(d.nr)) {
				result.push(d)
			}
		})
		return result;
	}
	
	function nextRound() {
		marker.setPopupContent("Your Guess");
		mapbox_labels.remove();
		continuectl.remove();
		confirmctl.addTo(map);
		singleL.remove();
		errorline.remove();
		closestpoint.remove();
		getRandomStreet();
		map.fitBounds(L.featureGroup(activeDistricts()).getBounds());
	}

	var errorline, closestpoint;
	function submitGuess() {
		mapbox_labels.addTo(map);
		singleL.addTo(map);
		confirmctl.remove();
		continuectl.addTo(map);
		// Get me my distance
		var markerlatlng = marker.getLatLng();
		var guess = Object.values(marker.getLatLng());
		var snapped = closestLayerPoint(street, L.point(guess));
		var dist = map.distance(guess, [snapped.x, snapped.y]);
		closestpoint = L.marker([snapped.x, snapped.y]).addTo(map).bindPopup("Off by: "+Math.floor(dist)+"m").openPopup();
		errorline = L.polyline([guess, [snapped.x, snapped.y]], {color: "red", opacity: 0.5, "dashArray":"4"}).addTo(map);
		map.fitBounds(L.featureGroup([marker, singleL]).getBounds());
	}
	getRandomStreet();
}


// Modified Leaflet functions to calculate nearest Point on Polyline
function closestP(p, p1, p2, sqDist) {
	var x = p1.x,
		y = p1.y,
		dx = p2.x - x,
		dy = p2.y - y,
		dot = dx * dx + dy * dy,
		t;
	if (dot > 0) {
		t = ((p.x - x) * dx + (p.y - y) * dy) / dot;

		if (t > 1) {
			x = p2.x;
			y = p2.y;
		} else if (t > 0) {
			x += dx * t;
			y += dy * t;
		}
	}

	dx = p.x - x;
	dy = p.y - y;

	return sqDist ? dx * dx + dy * dy : new L.point(x, y);
}

function closestLayerPoint(s, p) {
	var minDistance = Infinity,
		minPoint = null,
		closest = closestP,
		p1, p2, pp1, pp2;
	for (var j = 0, jLen = s._latlngs.length; j < jLen; j++) {
		var points = s._latlngs[j];

		for (var i = 1, len = points.length; i < len; i++) {
			pp1 = points[i - 1];
			p1 = L.point(pp1.lng, pp1.lat);
			console.log(points[1]);
			pp2 = points[i];
			p2 = L.point(pp2.lng, pp2.lat);

			var sqDist = closest(p, p1, p2, true);
			console.log(sqDist)
			if (sqDist < minDistance) {
				minDistance = sqDist;
				minPoint = closest(p, p1, p2);
			}
		}
	}
	if (minPoint) {
		minPoint.distance = Math.sqrt(minDistance);
	}
	return minPoint;
}

function closeRightMenu() {
	document.getElementById('rightmenu').classList.add("collapsed");
	document.getElementById('rightmenu').classList.remove("expanded");
}

async function load_load_setup() {
	var data = await load1();
	var districtdata = await load2();
	setup([data, districtdata]);
}
load_load_setup();