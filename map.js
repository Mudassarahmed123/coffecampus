// Layer styles
const styles = {
    forest_presence_view: function(feature) {
        const forRPerc = feature.get('for_r_perc') || feature.get('FOR_R_PERC') || feature.get('for_r_perc');
        console.log('Forest presence value:', forRPerc);
        let color;
        
        if (forRPerc === '0%') {
            color = 'rgba(144, 238, 144, 0.6)';
        } else if (forRPerc === '0% - <=10%') {
            color = 'rgba(60, 179, 113, 0.6)';
        } else if (forRPerc === '10% - <=50%') {
            color = 'rgba(34, 139, 34, 0.6)';
        } else if (forRPerc === '50% - <=90%') {
            color = 'rgba(0, 100, 0, 0.6)';
        }
        
        return new ol.style.Style({
            fill: new ol.style.Fill({ color: color || 'rgba(200, 200, 200, 0.6)' }),
            stroke: new ol.style.Stroke({ color: '#000000', width: 1 })
        });
    },
    deforestation_view: function(feature) {
        const defRPerc = feature.get('def_r_perc') || feature.get('DEF_R_PERC') || feature.get('def_r_perc');
        console.log('Deforestation value:', defRPerc);
        let color;
        
        if (defRPerc === '0%') {
            color = 'rgba(255, 182, 193, 0.6)';
        } else if (defRPerc === '0% - <=1%') {
            color = 'rgba(255, 99, 71, 0.6)';
        } else if (defRPerc === '1% - <=5%') {
            color = 'rgba(220, 20, 60, 0.6)';
        }
        
        return new ol.style.Style({
            fill: new ol.style.Fill({ color: color || 'rgba(200, 200, 200, 0.6)' }),
            stroke: new ol.style.Stroke({ color: '#000000', width: 1 })
        });
    },
    coffee_regions_view: function(feature) {
        const coffeeReg = feature.get('coffee_reg') || feature.get('COFFEE_REG') || feature.get('coffee_region');
        console.log('Coffee region value:', coffeeReg);
        const color = coffeeReg === "Yes" ? 'rgba(139, 69, 19, 0.6)' : 'rgba(210, 180, 140, 0.6)';
        
        return new ol.style.Style({
            fill: new ol.style.Fill({ color }),
            stroke: new ol.style.Stroke({ color: '#000000', width: 1 })
        });
    },
    social_GHR: function(feature) {
        const value = feature.get('Ccrit_1_sc') || feature.get('CCRIT_1_SC') || feature.get('ccrit_1_sc');
        console.log('Social GHR value:', value);
        const color = value ? 'rgba(100, 0, 255, 0.3)' : 'rgba(100, 200, 200, 0.3)';
        
        return new ol.style.Style({
            fill: new ol.style.Fill({ color }),
            stroke: new ol.style.Stroke({ color: '#000000', width: 1 })
        });
    }
};

// Function to get legend items for each layer
function getLegendItems(layerName) {
    switch(layerName) {
        case 'forest_presence_view':
            return [
                { color: 'rgba(144, 238, 144, 0.6)', label: '0%' },
                { color: 'rgba(60, 179, 113, 0.6)', label: '0% - <=10%' },
                { color: 'rgba(34, 139, 34, 0.6)', label: '10% - <=50%' },
                { color: 'rgba(0, 100, 0, 0.6)', label: '50% - <=90%' }
            ];
        case 'deforestation_view':
            return [
                { color: 'rgba(255, 182, 193, 0.6)', label: '0%' },
                { color: 'rgba(255, 99, 71, 0.6)', label: '0% - <=1%' },
                { color: 'rgba(220, 20, 60, 0.6)', label: '1% - <=5%' }
            ];
        case 'social_GHR':
            return [
                { color: 'rgba(0, 0, 255, 0.3)', label: 'Governance and Human Rights' }
            ];
        case 'coffee_regions_view':
            return [
                { color: 'rgba(139, 69, 19, 0.6)', label: '1 = Coffee Region' },
                { color: 'rgba(210, 180, 140, 0.6)', label: '0 = Rest of the Country' }
            ];
        default:
            return [];
    }
}

// Function to build CQL filter string
function buildCQLFilter(layerName) {
    if (layerName === 'social_GHR') return '';
    
    let cqlFilter = `country='${config.getCurrentCountry()}'`;
    
    // Add state filter if states are selected
    if (window.selectedStates && window.selectedStates.size > 0) {
        const statesList = Array.from(window.selectedStates).map(state => `'${state}'`).join(',');
        cqlFilter += ` AND "StateName" IN (${statesList})`;
    }
    
    // Add municipality filter if municipalities are selected
    if (window.selectedMunicipalities && window.selectedMunicipalities.size > 0) {
        const muniList = Array.from(window.selectedMunicipalities).map(muni => `'${muni}'`).join(',');
        cqlFilter += ` AND "Muni_Name" IN (${muniList})`;
    }
    
    return cqlFilter;
}

// Create vector tile layer
function createVectorTileLayer(layerName) {
    console.log(`Creating vector tile layer: ${layerName}`);
    
    const currentCountry = config.getCurrentCountry();
    console.log(`Current country: ${currentCountry}`);
    
    // Create source with country filter in URL and optimized settings
    const source = new ol.source.VectorTile({
        format: new ol.format.MVT(),
        url: `${config.GEOSERVER_BASE_URL}/geoserver/gwc/service/tms/1.0.0/it.geosolutions:${layerName}@EPSG%3A900913@pbf/{z}/{x}/{-y}.pbf?viewparams=country:${currentCountry}`,
        tileGrid: ol.tilegrid.createXYZ({
            maxZoom: 19,
            tileSize: 512, // Increased tile size for better performance
            extent: ol.proj.get('EPSG:3857').getExtent()
        }),
        cacheSize: 256, // Increased cache size
        preload: 2, // Preload nearby tiles
        overlaps: false // Disable overlaps for better performance
    });
    
    const layer = new ol.layer.VectorTile({
        source: source,
        visible: true,
        style: function(feature) {
            if (!feature || feature.get('country') !== currentCountry) {
                return null;
            }
            return styles[layerName](feature);
        },
        renderMode: 'vector',
        declutter: true,
        renderBuffer: 128,
        updateWhileAnimating: false,
        updateWhileInteracting: false,
        preload: 2,
        minZoom: 5, // Add zoom constraints
        maxZoom: 19
    });

    return layer;
}

// Initialize layer checkboxes
function initializeLayerControl() {
    const layerItems = document.querySelectorAll('.layer-item');
    
    layerItems.forEach((item) => {
        const checkbox = item.querySelector('input[type="checkbox"]');
        const layerName = checkbox.id;
        const legend = item.querySelector('.layer-legend');
        
        // Initialize legend for each layer
        updateLegend(layerName);

        checkbox.addEventListener('change', function() {
            const isChecked = this.checked;
            console.log(`Layer checkbox changed: ${layerName}`, { isChecked });
            
            let layer;
            
            switch(layerName) {
                case 'forest_presence_view':
                    layer = forestPresenceLayer;
                    break;
                case 'deforestation_view':
                    layer = deforestationLayer;
                    break;
                case 'social_GHR':
                    layer = socialGHRLayer;
                    break;
                case 'coffee_regions_view':
                    layer = coffeeRegionLayer;
                    break;
            }
            
            if (layer) {
                layer.setVisible(isChecked);
                if (isChecked) {
                    legend.classList.add('visible');
                } else {
                    legend.classList.remove('visible');
                }
                // Update the source when visibility changes
                updateMapFilter();
            }
        });
    });
}

// Initialize layer checkboxes
const forestPresenceLayer = createVectorTileLayer('forest_presence_view');
const deforestationLayer = createVectorTileLayer('deforestation_view');
const socialGHRLayer = createVectorTileLayer('social_GHR');
const coffeeRegionLayer = createVectorTileLayer('coffee_regions_view');

// Base layers with optimized settings
const osmLayer = new ol.layer.Tile({
    source: new ol.source.OSM({
        crossOrigin: 'anonymous',
        wrapX: true,
        tileLoadFunction: function(imageTile, src) {
            imageTile.getImage().src = src;
        },
        cacheSize: 512,
        preload: 2
    }),
    visible: true,
    preload: 2,
    minZoom: 1,
    maxZoom: 21
});

const satelliteLayer = new ol.layer.Tile({
    source: new ol.source.XYZ({
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        maxZoom: 21,
        crossOrigin: 'anonymous',
        wrapX: true,
        cacheSize: 512,
        preload: 2
    }),
    visible: false,
    preload: 2,
    minZoom: 1,
    maxZoom: 21
});

// Create map with optimized settings
const map = new ol.Map({
    target: 'map',
    layers: [
        osmLayer,
        satelliteLayer,
        forestPresenceLayer,
        deforestationLayer,
        socialGHRLayer,
        coffeeRegionLayer
    ],
    view: new ol.View({
        center: ol.proj.fromLonLat([37.9062, 0.0236]),
        zoom: 6,
        projection: 'EPSG:3857',
        maxZoom: 21,
        minZoom: 1,
        enableRotation: false,
        zoomDuration: 500, // Slower zoom animation
        constrainResolution: true
    }),
    loadTilesWhileAnimating: true,
    loadTilesWhileInteracting: true
});

// Initialize popups
const popup = new ol.Overlay({
    element: document.getElementById('popup'),
    autoPan: true,
    autoPanAnimation: { duration: 250 }
});

const hoverInfo = new ol.Overlay({
    element: document.getElementById('hover-info'),
    positioning: 'bottom-left',
    offset: [10, 10]
});

map.addOverlay(popup);
map.addOverlay(hoverInfo);

// Initialize popup functionality
function initializePopup() {
    const popupElement = document.getElementById('popup');
    const popupContent = document.getElementById('popup-content');
    const popupCloser = document.getElementById('popup-closer');
    
    popupCloser.onclick = function() {
        popup.setPosition(undefined);
        return false;
    };

    map.on('click', function(evt) {
        const features = [];
        map.forEachFeatureAtPixel(evt.pixel, function(feature) {
            features.push(feature);
        });
        
        if (features.length > 0) {
            const feature = features[0];
            const properties = feature.getProperties();
            let content = '<table>';
            
            for (const [key, value] of Object.entries(properties)) {
                if (key !== 'geometry') {
                    content += `<tr><th>${key}</th><td>${value}</td></tr>`;
                }
            }
            
            content += '</table>';
            popupContent.innerHTML = content;
            popup.setPosition(evt.coordinate);
        } else {
            popup.setPosition(undefined);
        }
    });
}

// Initialize hover info
function initializeHoverInfo() {
    const hoverInfoElement = document.getElementById('hover-info');
    
    map.on('pointermove', function(evt) {
        if (evt.dragging) {
            hoverInfoElement.style.display = 'none';
            return;
        }
        
        const pixel = map.getEventPixel(evt.originalEvent);
        const features = [];
        map.forEachFeatureAtPixel(pixel, function(feature) {
            features.push(feature);
        });
        
        if (features.length > 0) {
            const feature = features[0];
            const properties = feature.getProperties();
            let content = '';
            
            for (const [key, value] of Object.entries(properties)) {
                if (key !== 'geometry') {
                    content += `${key}: ${value}<br>`;
                }
            }
            
            hoverInfoElement.innerHTML = content;
            hoverInfoElement.style.display = 'block';
            hoverInfo.setPosition(evt.coordinate);
        } else {
            hoverInfoElement.style.display = 'none';
        }
    });
}

// Update the updateLegend function to not automatically show the legend
function updateLegend(layerName) {
    const legendContainer = document.getElementById(`${layerName}-legend`);
    if (!legendContainer) return;

    legendContainer.innerHTML = '';
    const legendItems = getLegendItems(layerName);
    
    legendItems.forEach(item => {
        const legendItem = document.createElement('div');
        legendItem.className = 'legend-item';
        legendItem.innerHTML = `
            <div class="legend-color" style="background-color: ${item.color}"></div>
            <span class="legend-label">${item.label}</span>
        `;
        legendContainer.appendChild(legendItem);
    });

    // Don't automatically add visible class
    const checkbox = document.getElementById(layerName);
    if (checkbox && checkbox.checked) {
        legendContainer.classList.add('visible');
    } else {
        legendContainer.classList.remove('visible');
    }
}

// Map type toggle
function initializeMapTypeToggle() {
    const buttons = document.querySelectorAll('#map-type-toggle button');
    buttons.forEach(button => {
        button.addEventListener('click', function() {
            const isMap = this.textContent.trim().toLowerCase() === 'map';
            osmLayer.setVisible(isMap);
            satelliteLayer.setVisible(!isMap);
            buttons.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
        });
    });
}

// Add map render event logging
map.on('postrender', function(event) {
    console.log('Map rendered:', {
        forestVisible: forestPresenceLayer.getVisible(),
        deforestationVisible: deforestationLayer.getVisible(),
        socialVisible: socialGHRLayer.getVisible(),
        coffeeVisible: coffeeRegionLayer.getVisible()
    });
});

// Update map filter
async function updateMapFilter() {
    const layers = {
        'forest_presence_view': forestPresenceLayer,
        'deforestation_view': deforestationLayer,
        'coffee_regions_view': coffeeRegionLayer,
        'social_GHR': socialGHRLayer
    };
    
    const currentCountry = config.getCurrentCountry();
    console.log(`Updating map filter for country: ${currentCountry}`);
    console.log('Selected states:', Array.from(window.selectedStates || []));
    console.log('Selected municipalities:', Array.from(window.selectedMunicipalities || []));
    
    // Get selected states and municipalities
    const states = Array.from(window.selectedStates || []);
    const municipalities = Array.from(window.selectedMunicipalities || []);
    
    // Update each layer
    for (const [layerName, layer] of Object.entries(layers)) {
        if (!layer || !layer.getSource) {
            console.log(`Skipping layer ${layerName} - invalid layer object`);
            continue;
        }
        
        const checkbox = document.getElementById(layerName);
        if (!checkbox) {
            console.log(`Skipping layer ${layerName} - checkbox not found`);
            continue;
        }

        // Only update visibility based on checkbox state
        const isVisible = checkbox.checked;
        console.log(`Setting ${layerName} visibility to ${isVisible}`);
        layer.setVisible(isVisible);
        
        if (isVisible) {
            // Special handling for social_GHR layer - only filter by country
            if (layerName === 'social_GHR') {
                layer.setStyle(function(feature) {
                    if (!feature) return null;
                    
                    const featureCountry = feature.get('country') || feature.get('Country');
                    const matchesCountry = featureCountry === currentCountry;
                    
                    if (matchesCountry) {
                        return styles[layerName](feature);
                    }
                    return null;
                });
            } else {
                // Update layer style to filter features for other layers
                layer.setStyle(function(feature) {
                    if (!feature) return null;
                    
                    const featureCountry = feature.get('country') || feature.get('Country');
                    const featureState = feature.get('StateName') || feature.get('state_name');
                    const featureMuni = feature.get('Muni_Name') || feature.get('muni_name');
                    
                    // Check if feature should be visible based on filters
                    const matchesCountry = featureCountry === currentCountry;
                    
                    // Show all states if none are selected, otherwise show only selected states
                    const matchesState = states.length === 0 || states.includes(featureState);
                    
                    // Show all municipalities if none are selected, otherwise show only selected municipalities
                    const matchesMuni = municipalities.length === 0 || municipalities.includes(featureMuni);
                    
                    const isVisible = matchesCountry && matchesState && matchesMuni;
                    
                    if (isVisible) {
                        return styles[layerName](feature);
                    }
                    return null;
                });
            }
            
            // Force redraw
            layer.getSource().changed();
            layer.changed();
        }
    }
    
    // Force map render
    if (window.map) {
        window.map.render();
    }
}

function updateMapView() {
    const coordinates = {
        [config.COUNTRIES.KENYA]: [37.9062, 0.0236],
        [config.COUNTRIES.VIETNAM]: [108.2772, 14.0583]
    };
    
    const currentCountry = config.getCurrentCountry();
    const center = coordinates[currentCountry];

    if (!center) {
        console.error(`No coordinates defined for country: ${currentCountry}`);
        return;
    }

    console.log(`Updating map view for ${currentCountry}`, center);
    map.getView().animate({
        center: ol.proj.fromLonLat(center),
        zoom: 6,
        duration: 1000
    });
}

function initializeMap() {
    const coordinates = {
        [config.COUNTRIES.KENYA]: [37.9062, 0.0236],
        [config.COUNTRIES.VIETNAM]: [108.2772, 14.0583]
    };
    
    const currentCountry = config.getCurrentCountry();
    const center = coordinates[currentCountry];

    if (!center) {
        console.error(`No coordinates defined for country: ${currentCountry}`);
        return;
    }

    map.getView().setCenter(ol.proj.fromLonLat(center));
    map.getView().setZoom(6);
}

// Add layer loading indicator
let loadingLayerCount = 0;
const loadingIndicator = document.createElement('div');
loadingIndicator.className = 'loading-indicator';
loadingIndicator.style.display = 'none';
document.body.appendChild(loadingIndicator);

function updateLoadingIndicator() {
    loadingIndicator.style.display = loadingLayerCount > 0 ? 'block' : 'none';
}

// Track tile loading
function trackTileLoad(layer) {
    const source = layer.getSource();
    source.on('tileloadstart', function() {
        loadingLayerCount++;
        updateLoadingIndicator();
    });
    source.on('tileloadend', function() {
        loadingLayerCount--;
        updateLoadingIndicator();
    });
    source.on('tileloaderror', function() {
        loadingLayerCount--;
        updateLoadingIndicator();
    });
}

// Track loading for all layers
[osmLayer, satelliteLayer, forestPresenceLayer, deforestationLayer, socialGHRLayer, coffeeRegionLayer].forEach(trackTileLoad);

// Initialize everything when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Initialize layer panel collapse functionality
    const layerControl = document.getElementById('layer-control');
    const toggleButton = document.querySelector('.collapse-toggle');
    
    if (toggleButton && layerControl) {
        toggleButton.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            layerControl.classList.toggle('collapsed');
            // Update button text based on state
            this.textContent = layerControl.classList.contains('collapsed') ? '→' : '←';
        });
    }

    // Initialize empty selection sets
    window.selectedStates = new Set();
    window.selectedMunicipalities = new Set();

    initializeLayerControl();
    initializeMapTypeToggle();
    initializePopup();
    initializeHoverInfo();
    initializeMap();
    
    // Make window.map available for other scripts
    window.map = map;
    
    // Initial map filter
    updateMapFilter();
});