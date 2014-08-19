// Extent of the map in units of the projection
var extent = [-3276800, -3276800, 3276800, 3276800];

// Fixed resolutions to display the map at
var resolutions = [1600,800,400,200,100,50,25,10,5,2.5,1,0.5,0.25,0.125,0.0625];

// Define British National Grid Proj4js projection (copied from http://epsg.io/27700.js)
proj4.defs("EPSG:27700","+proj=tmerc +lat_0=49 +lon_0=-2 +k=0.9996012717 +x_0=400000 +y_0=-100000 +ellps=airy +towgs84=446.448,-125.157,542.06,0.15,0.247,0.842,-20.489 +units=m +no_defs");

// Define a projection based on the included Proj4js projection definition.
// Include the extent here and specify the resolutions as a property of the
// View to specify the zoom levels that are available to the user.
var bng = ol.proj.get('EPSG:27700');
bng.setExtent(extent);

var map = new ol.Map({
    target: 'map',
    layers: [
        new ol.layer.Tile({
            source: new ol.source.TileWMS({
                url: 'http://t0.ads.astuntechnology.com/astuntechnology/osopen/service?',
                attributions: [
                    new ol.Attribution({html: 'Astun Data Service &copy; Ordnance Survey.'})
                ],
                params: {
                    'LAYERS': 'osopen',
                    'FORMAT': 'image/png',
                    'TILED': true
                },
                // Define a TileGrid to ensure that WMS requests are made for
                // tiles at the correct resolutions and tile boundaries
                tileGrid: new ol.tilegrid.TileGrid({
                    origin: extent.slice(0, 2),
                    resolutions: resolutions
                })
            })
        })
    ],
    view: new ol.View({
        projection: bng,
        resolutions: resolutions,
        center: [413674, 289141],
        zoom: 0
    })
});

var districtLayer = new ol.layer.Image({
    source: new ol.source.ImageWMS({
        url: 'http://ec2-54-216-41-47.eu-west-1.compute.amazonaws.com/geoserver/osgb/wms?',
        params: {
            'LAYERS': 'osgb:district_borough_unitary_region'
        },
        extent: extent
    })
});
map.addLayer(districtLayer);

var planningAppsLayer = new ol.layer.Vector({
    source: new ol.source.GeoJSON({
        'projection': map.getView().getProjection()
    }),
    style: new ol.style.Style({
        image: new ol.style.Icon(({
            anchor: [0.5, 40],
            anchorXUnits: 'fraction',
            anchorYUnits: 'pixels',
            src: 'marker-icon.png'
        }))
    })
});
map.addLayer(planningAppsLayer);

// Define the URL used to fetch GeoJSON features
var url = 'http://hub-dev.astun.co.uk/developmentcontrol/0.1/applications/search?status=live&gss_code=E07000214';
reqwest({url: url, type: 'jsonp'}).then(function (data) {
    planningAppsLayer.getSource().addFeatures(planningAppsLayer.getSource().readFeatures(data));
    map.getView().fitExtent(planningAppsLayer.getSource().getExtent(), map.getSize());
});

// Create a popup overlay which will be used to display feature info
var popup = new ol.Popup();
map.addOverlay(popup);

map.on('click', function(evt) {
    popup.container.className = 'ol-popup';
    // Attempt to find a marker from the appsLayer
    var feature = map.forEachFeatureAtPixel(evt.pixel, function(feature, layer) {
        return feature;
    });
    if (feature) {
        var geometry = feature.getGeometry();
        var coord = geometry.getCoordinates();
        popup.container.className = 'ol-popup marker';
        popup.show(coord, "<h2><a href='" + feature.get('caseurl') + "'>" + feature.get('casereference') + "</a></h2><p>" + feature.get('locationtext') + "</p><p>Status: " + feature.get('status') + "</p>");
    } else {
        // popup.hide();
        var url = districtLayer.getSource().getGetFeatureInfoUrl(evt.coordinate, map.getView().getResolution(), map.getView().getProjection(), {'INFO_FORMAT': 'text/javascript', 'format_options': 'callback:results', propertyName: 'NAME,AREA_CODE,DESCRIPTIO'});
        reqwest({
            url: url,
            type: 'jsonp',
            jsonpCallbackName: 'results'
        }).then(function (data) {
            var feature = data.features[0];
            popup.show(evt.coordinate, "<h2>" + feature.properties.NAME + "</h2><p>" + feature.properties.DESCRIPTIO + "</p>");
        });
    }
});
