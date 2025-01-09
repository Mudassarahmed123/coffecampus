// Layer styles
const styles = {
    forest_presence_view: function(feature) {
        const forRPerc = feature.get('for_r_perc') || feature.get('FOR_R_PERC') || feature.get('for_r_perc');
        console.log('Forest presence value:', forRPerc);
        let color;
        
        if (forRPerc === '0%') {
            color = 'rgba(128, 128, 128)';
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
            color = 'rgb(128, 128, 128)';  // Gray
        } else if (defRPerc === '0% - <=1%') {
            color = 'rgb(255, 255, 153)';  // Light yellow
        } else if (defRPerc === '1% - <=5%') {
            color = 'rgb(255, 178, 102)';  // Orange
        } else if (defRPerc === '>5%') {
            color = 'rgb(204, 102, 0)';  // Dark orange/brown
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
                { color: 'rgba(128, 128, 128)', label: '0%' },
                { color: 'rgba(60, 179, 113, 0.6)', label: '0% - <=10%' },
                { color: 'rgba(34, 139, 34, 0.6)', label: '10% - <=50%' },
                { color: 'rgba(0, 100, 0, 0.6)', label: '50% - <=90%' }
            ];
        case 'deforestation_view':
            return [
                { color: 'rgb(128, 128, 128)', label: '0' },
                { color: 'rgb(255, 255, 153)', label: '<1%' },
                { color: 'rgb(255, 178, 102)', label: '1% - 5%' },
                { color: 'rgb(204, 102, 0)', label: '>5%' }
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
            maxZoom: 24,
            tileSize: 512
        }),
        cacheSize: 256,
        preload: 2,
        overlaps: false
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
        preload: 2
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
    source: new ol.source.OSM(),
    visible: false
});

const satelliteLayer = new ol.layer.Tile({
    source: new ol.source.XYZ({
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        maxZoom: 21
    }),
    visible: true
});

// Get initial coordinates based on current country
const coordinates = {
    [config.COUNTRIES.KENYA]: [37.9062, 0.0236],
    [config.COUNTRIES.VIETNAM]: [108.2772, 14.0583]
};

const currentCountry = config.getCurrentCountry();
const initialCenter = coordinates[currentCountry] || [37.9062, 0.0236];

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
        center: ol.proj.fromLonLat(initialCenter),
        zoom: 6,
        projection: 'EPSG:3857'
    }),
    controls: ol.control.defaults.defaults().extend([
        new ol.control.Zoom()
    ])
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

// Make updateMapView available globally
window.updateMapView = updateMapView;

// Initialize map with correct country coordinates
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

// Function to add a marker at a location - moved to global scope
function addMarkerToMap(longitude, latitude, isCurrentLocation = false) {
    // Create marker feature
    const markerFeature = new ol.Feature({
        geometry: new ol.geom.Point(ol.proj.fromLonLat([longitude, latitude]))
    });
    
    let markerStyle;
    if (isCurrentLocation) {
        markerStyle = new ol.style.Style({
            image: new ol.style.Circle({
                radius: 30,  // Smaller radius
                fill: new ol.style.Fill({ color: 'red' }),
                stroke: new ol.style.Stroke({
                    color: ['red', 'rgba(255,0,0,0.2)'],
                    lineDash: [4],
                    lineDashOffset: 0,
                    width: 2
                })
            })
        });
    } else {
        // Use a default marker style with smaller size
        markerStyle = new ol.style.Style({
            image: new ol.style.RegularShape({
                points: 20,
                radius: 15,  // Smaller radius
                radius2: 0,
                angle: 0,
                fill: new ol.style.Fill({ color: '#E91E63' }),
                stroke: new ol.style.Stroke({
                    color: '#fff',
                    width: 2
                })
            })
        });
    }
    
    const markerSource = new ol.source.Vector({
        features: [markerFeature]
    });
    
    // Remove old marker layer if it exists
    const layerName = isCurrentLocation ? 'currentLocation' : 'searchMarker';
    const oldLayer = map.getLayers().getArray().find(layer => layer.get('name') === layerName);
    if (oldLayer) {
        map.removeLayer(oldLayer);
    }
    
    const markerLayer = new ol.layer.Vector({
        source: markerSource,
        style: markerStyle,
        name: layerName,
        zIndex: 1000
    });
    
    map.addLayer(markerLayer);
}

// Initialize current location functionality
function initializeCurrentLocation() {
    const currentLocationButton = document.getElementById('current-location-button');
    
    function handleLocationSuccess(position) {
        const { latitude, longitude } = position.coords;
        console.log('Got current location:', latitude, longitude);
        
        // Animate to the location
        map.getView().animate({
            center: ol.proj.fromLonLat([longitude, latitude]),
            zoom: 14,
            duration: 1000
        });
        
        currentLocationButton.classList.remove('loading');
        
        // Add marker for current location
        addMarkerToMap(longitude, latitude, true);
    }

    function handleLocationError(error) {
        console.error('Geolocation error:', error);
        currentLocationButton.classList.remove('loading');
        
        let errorMessage = 'Could not get your location';
        switch(error.code) {
            case error.PERMISSION_DENIED:
                errorMessage = `
                    Location access was denied. Please enable location access in your browser settings:
                    <br><br>
                    <strong>Chrome/Edge:</strong> Click the lock/info icon in the address bar → Site settings → Location → Allow
                    <br>
                    <strong>Firefox:</strong> Click the lock icon in the address bar → Clear setting → Allow location access
                    <br>
                    <strong>Safari:</strong> Safari menu → Preferences → Websites → Location → Allow
                `;
                break;
            case error.POSITION_UNAVAILABLE:
                errorMessage = 'Location information is unavailable';
                break;
            case error.TIMEOUT:
                errorMessage = 'Location request timed out';
                break;
        }
        
        const errorDiv = document.createElement('div');
        errorDiv.className = 'location-error-popup';
        errorDiv.innerHTML = `
            <div class="error-content">
                <h4>Location Access Required</h4>
                <p>${errorMessage}</p>
                <button onclick="this.parentElement.parentElement.remove()">Close</button>
            </div>
        `;
        document.body.appendChild(errorDiv);
    }

    if (currentLocationButton) {
        currentLocationButton.addEventListener('click', () => {
            if (!navigator.geolocation) {
                handleLocationError({ code: 0, message: 'Geolocation is not supported by your browser' });
                return;
            }
            
            currentLocationButton.classList.add('loading');
            
            // Force a new location request each time
            navigator.geolocation.getCurrentPosition(
                handleLocationSuccess,
                handleLocationError,
                {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 0,
                    prompt: true  // Force the permission prompt
                }
            );
        });
    }
}

// Initialize search functionality
function initializeSearch() {
    const searchInput = document.getElementById('place-search');
    const searchButton = document.getElementById('search-button');
    
    // Create suggestions container
    const suggestionsContainer = document.createElement('div');
    suggestionsContainer.id = 'search-suggestions';
    suggestionsContainer.className = 'search-suggestions';
    document.getElementById('search-container').appendChild(suggestionsContainer);

    let debounceTimer;
    
    async function searchPlaces(searchText) {
        if (!searchText.trim()) {
            suggestionsContainer.style.display = 'none';
            return;
        }
        
        try {
            console.log('Searching globally for:', searchText);
            const response = await fetch(
                `https://nominatim.openstreetmap.org/search?` +
                `format=json&` +
                `q=${encodeURIComponent(searchText)}&` +
                `limit=5&` +
                `addressdetails=1&` +
                `accept-language=en`,
                {
                    headers: {
                        'Accept-Language': 'en',
                        'User-Agent': 'EUDR Coffee Compass'
                    }
                }
            );
            
            if (!response.ok) throw new Error('Search failed');
            
            const results = await response.json();
            console.log('Search results:', results);
            
            if (results.length > 0) {
                suggestionsContainer.innerHTML = results.map(place => {
                    // Extract the main name and address parts
                    const mainName = place.name || place.display_name.split(',')[0];
                    const addressParts = place.display_name
                        .split(',')
                        .map(part => part.trim())
                        .filter(part => part !== mainName)
                        .join(', ');

                    return `
                        <div class="search-suggestion" data-lon="${place.lon}" data-lat="${place.lat}">
                            <strong>${mainName}</strong>
                            <small>${addressParts}</small>
                        </div>
                    `;
                }).join('');
                
                suggestionsContainer.style.display = 'block';
                
                // Add click handlers to suggestions
                document.querySelectorAll('.search-suggestion').forEach(suggestion => {
                    suggestion.addEventListener('click', () => {
                        const lon = parseFloat(suggestion.dataset.lon);
                        const lat = parseFloat(suggestion.dataset.lat);
                        
                        // Update input with selected place name
                        searchInput.value = suggestion.querySelector('strong').textContent;
                        
                        // Hide suggestions
                        suggestionsContainer.style.display = 'none';
                        
                        // Add marker to the map
                        addMarkerToMap(lon, lat);
                        
                        // Animate to location
                        map.getView().animate({
                            center: ol.proj.fromLonLat([lon, lat]),
                            zoom: 14,
                            duration: 1000
                        });
                    });
                });
                
                // Remove automatic selection of first result
            } else {
                suggestionsContainer.innerHTML = '<div class="no-results">No places found</div>';
                suggestionsContainer.style.display = 'block';
            }
        } catch (error) {
            console.error('Search error:', error);
            suggestionsContainer.innerHTML = '<div class="search-error">Search failed. Please try again.</div>';
            suggestionsContainer.style.display = 'block';
        }
    }

    // Add input event listener with debounce
    searchInput.addEventListener('input', (e) => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            searchPlaces(e.target.value);
        }, 300);
    });

    // Hide suggestions when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('#search-container')) {
            suggestionsContainer.style.display = 'none';
        }
    });

    // Handle search button click
    searchButton.addEventListener('click', () => {
        const searchText = searchInput.value.trim();
        if (searchText) {
            searchPlaces(searchText);
        }
    });

    // Handle Enter key
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            const searchText = searchInput.value.trim();
            if (searchText) {
                searchPlaces(searchText);
            }
        }
    });
}

// Initialize everything when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Initialize layer panel collapse functionality
    const layerControl = document.getElementById('layer-control');
    const layersToggle = document.getElementById('layers-toggle');
    const closeButton = layerControl.querySelector('.close-button');
    
    // Handle close button click
    if (closeButton && layerControl && layersToggle) {
        closeButton.addEventListener('click', () => {
            layerControl.classList.add('collapsed');
            layersToggle.classList.add('visible');
        });
    }

    // Handle layers toggle button click
    if (layersToggle && layerControl) {
        layersToggle.addEventListener('click', () => {
            layerControl.classList.remove('collapsed');
            layersToggle.classList.remove('visible');
        });
    }

    // Initialize empty selection sets
    window.selectedStates = new Set();
    window.selectedMunicipalities = new Set();

    initializeLayerControl();
    initializeMapTypeToggle();
    initializePopup();
    initializeHoverInfo();
    
    // Initialize map with correct country center
    initializeMap();
    
    initializeSearch();
    initializeCurrentLocation();
    
    // Make window.map available for other scripts
    window.map = map;
    
    // Initial map filter
    updateMapFilter();
});
