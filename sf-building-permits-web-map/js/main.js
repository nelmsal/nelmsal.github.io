/* eslint-disable dot-notation */
const apiHost = 'http://localhost:3000';
// const apiHost = 'https://philly-trail-waze.herokuapp.com';

/**
npm install
npx eslint exercise
npx http-server --port 3000
npm install -g localhost
localhost -p 3000
npm install -g serve
npx serve .
*/

const map = L.map('map').setView([37.758667, -122.440071], 12.25);
// let metricsLayer = null;
let metricsLayer = L.layerGroup().addTo(map);

let mbAccessToken = 'pk.eyJ1IjoibmVsbXMiLCJhIjoiY2wycWZldnQ0MDA0cTNscGE0bmdwZW1qNiJ9.WAtQnoSeY6VaN38L5X-lEA';
let mbID = 'nelms';
let mbStyle = 'cl2qgn76n000r15och2qhmsw8';
// MONOCHROME LIGHT GREY LABELS
L.tileLayer(`https://api.mapbox.com/styles/v1/${mbID}/${mbStyle}/tiles/256/{z}/{x}/{y}?access_token=${mbAccessToken}`, {
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
}).addTo(map);

// SET COLUMN BUTTONS
let titleFocus = (valueColumn) => {
  const valArray = valueColumn.split(".");
  var focusTitle = `${valArray[0]}`.replace('poc_linc', 'Change in<br>Low-Income<br>People of Color').replace('pop_dens_res', 'Population per<br>Residential Sq.Mi.').replace('occ_own', 'Owner Occupied').replace('wht', 'Change in<br>White Pop').replace("units", "New Housing Units")
  focusTitle = focusTitle.charAt(0).toUpperCase() + focusTitle.slice(1)
  return focusTitle
}
let titleColumn = (valueColumn) => {
  const valArray = valueColumn.split(".");
  focusTitle = titleFocus(valueColumn);
  var focusNum = valArray[1].replace('tot', 'Total').replace('pct', 'Percent');
  focusYears = `(20${valArray[2].replace('_','-')})`
  return focusNum + ' ' + focusTitle + ' ' + focusYears
}

let valueColumn = "evictions.tot.10_19"; // "units.tot.15_19";
let valueTitle = titleColumn(valueColumn);
let columnOptions = Object.keys(valueBins);

let chooseColumn = (choiceColumn) => {
  valueColumn = choiceColumn;
  valueTitle = titleColumn(valueColumn);
  metricsLayer.clearLayers();
  loadMetrics();
  loadHotSpot()
  info.addTo(map);
  legend.addTo(map);
}


var buttonColumns = L.control({position: 'bottomleft'});

buttonColumns.onAdd = function (map) {
  var div = L.DomUtil.create('div', 'info button');
  let buttonLabels = [];

  columnOptions.forEach(function (choiceColumn, index) {
    choiceFocus = titleFocus(choiceColumn)
    buttonString = `<button class="button" onClick="chooseColumn('${choiceColumn}')">${choiceFocus}</button>`
    div.innerHTML += buttonLabels.push(
      buttonString);
  });

  div.innerHTML = buttonLabels.join('<br>');
  return div;
};
buttonColumns.addTo(map);



// COLOR & LAYER STYLE FUNCTIONS
var colors;
var bins;
let getColors = (cmap, n) => colorbrewer[cmap][n];
let getColorBins = (column, binLength, cmap) => {
    cmap = cmap || valueBins[column].cmap;
    colors = getColors(cmap, binLength);
    return colors;
};
let getBinIndex = (bins, value) => {
    for (let i = 0; i <= bins.length; i++) {
      if (bins[i] > value) {
        return i-1;
      }
    }
    return 0;
  };
let getValueColor = (value, column) => {
    bins = valueBins[column].bins;
    colors = getColorBins(column, bins.length-1);
    let binIndex = getBinIndex(bins, value);
    return colors[binIndex];
};
let metricStyle = (feature) => ({
  weight: 1,
  opacity: 0.1,
  fillOpacity: 0.7,
  color: '#000000',
  fillColor: getValueColor(feature.properties[valueColumn], valueColumn),
});


// NUMBER FUNCTIONS
function numberWithCommas(x) {
  return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}
function percentage(partialValue) {
  return `${Math.round(partialValue)}%`;
}
function checkNumber(value) {
  if (Number.isFinite(value)) {
    if (valueColumn.includes('pct')) {
      value = percentage(value);
    } else if (value > 1000) {
      value = numberWithCommas(value)
    }
  }
  return value
}

// CLICK FUNCTIONS
var info = L.control();
info.onAdd = function (map) {
  this._div = L.DomUtil.create('div', 'info');
  this.update();
  return this._div;
};
info.update = function (props) {
  this._div.innerHTML = '<h4>San Francisco</h4>' +  (props ?
    '<b>' + valueTitle + '</b><br />' + checkNumber(props[valueColumn]) + '' : 'Hover over a Block Group');
    //  people / mi <sup>2</sup>
};
info.addTo(map);

// tool tip
const loadToolTip = (layer) => {
  ToolTipValue = layer.feature.properties[valueColumn];
  ToolTipValue = checkNumber(ToolTipValue);
  ToolTipValue = `${ToolTipValue}`
  return ToolTipValue;
}
function highlightFeature(e) {
  var layer = e.target;

  // layer.setStyle({
  //    weight: 20,
  //    color: '#666',
  //    dashArray: '',
  //    fillOpacity: 0.7
  //});

  if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) {
      layer.bringToFront();
  }
  info.update(layer.feature.properties);
}
var geojson;

function resetHighlight(e) {
  var layer = e.target;
  layer.setStyle(metricStyle(e.target));
}
function zoomToFeature(e) {
  map.fitBounds(e.target.getBounds());
}
function onEachFeature(feature, layer) {
  layer.on({
      mouseover: highlightFeature,
      // mouseout: metricStyle,
      click: zoomToFeature
  });
}
function loadGeoJson() {
  fetch(`${apiHost}/data/sf_permit_metrics.geojson`)
    .then(resp => resp.json())
    .then(data => {
      return data
    });
}
geojson = L.geoJson(loadGeoJson());

function loadMetrics() {
  fetch(`${apiHost}/data/sf_permit_metrics.geojson`)
    .then(resp => resp.json())
    .then(data => {
      metricsLayer = L.geoJSON(data, {
        style: metricStyle,
        onEachFeature: onEachFeature,
        riseOnHover: true
      });
      metricsLayer.bindTooltip(layer => loadToolTip(layer), { sticky: true });
      metricsLayer.addTo(map).bringToBack();
    });
}

loadMetrics()

var legend = L.control({position: 'bottomright'});

legend.onAdd = function (map) {

    var div = L.DomUtil.create('div', 'info legend');
    let labels = [`<strong>${valueTitle}</strong>`];
    var from;
    var to;

    bins = valueBins[valueColumn].bins
    binLabels = valueBins[valueColumn].labels
    colors = getColorBins(valueColumn, bins.length-1);

    for (var i = 0; i < bins.length-1; i++) {
			from = checkNumber(bins[i]);
			to = checkNumber(bins[i + 1]);
      toFrom = `${from} - ${to}`
      color = colors[i]
      if (binLabels.length > 0){
        toFrom = binLabels[i]
      }

      div.innerHTML += labels.push(
				`<i class="circle" style="background:${color}"></i> ${toFrom}`);
		}

		div.innerHTML = labels.join('<br>');
		return div;
};

legend.addTo(map);

// UNITS HOT SPOT
function loadHotSpot() {
  fetch(`${apiHost}/data/sf_units_hotspots.geojson`)
    .then(resp => resp.json())
    .then(data => {
      hotspotLayer = L.geoJSON(data, {
        style: {
          weight: 3,
          opacity: 0.75,
          fillOpacity: 0,
          color: '#000000',
          fillColor: '#FFFFFF',
        },
        interactive: false
      });
      hotspotLayer.addTo(map).bringToFront();
    });
}
loadHotSpot()