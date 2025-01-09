document.addEventListener('DOMContentLoaded', function() {
    // Set a default country if not already set
    window.currentCountry = window.currentCountry || 'Kenya';

    const infoPanel = document.getElementById('info-panel');
    const infoToggle = document.getElementById('info-toggle');
    const contentWrapper = document.querySelector('.content-wrapper');

    // Set initial state - panel is visible by default
    infoPanel.classList.add('visible');
    contentWrapper.classList.remove('panel-hidden');
    infoToggle.classList.add('active');

    // Inline HTML content
    infoPanel.innerHTML = `
        <div class="info-header">
            <h3>EUDR Coffee Compass</h3>
            <div class="header-controls">
                <button id="panel-toggle" class="panel-toggle">
                    <span class="toggle-info active">Info</span>
                    <span class="toggle-widget">Filter</span>
                </button>
                <button id="info-close" class="info-close">✖</button>
            </div>
        </div>
        
        <div class="info-content">
            <div id="info-default-content">
                <h4>Kenya</h4>
                
                <p>Explore the interactive map featuring abstract risk assessment including:</p>
                
                <ul>
                    <li>- Presence of Forest
                        <br><span class="sublevel">(subnational level)</span>
                    </li>
                    <li>- Prevalence of Deforestation
                        <br><span class="sublevel">(subnational level)</span>
                    </li>
                    <li>- Presence of Indigenous area
                        <br><span class="sublevel">(subnational level)</span>
                    </li>
                    <li>- Governance & Human Rights
                        <br><span class="sublevel">(national level)</span>
                    </li>
                </ul>

                <p class="date">Jan 2024</p>

                <div class="map-guide">
                    <h4>Map Guide:</h4>
                    <p>Explore the different map functionalities</p>
                    <ul>
                        <li>📍 Map description</li>
                        <li>🗺️ Department/municipality selector panel</li>
                        <li>📊 Show legend panel</li>
                        <li>👁️ Show layer</li>
                        <li>❌ Hide layer</li>
                    </ul>
                </div>

                <p class="tutorial">To access the detailed tutorial, click <a href="#" class="here-link">here</a></p>

                <div class="developed-by">
                    <h4>Developed by</h4>
                    <div class="logo-placeholder">
                        <img src="images/2.jpg" alt="Developer Logo">
                    </div>
                </div>

                <p class="disclaimer">Note: The information displayed in this map is a supportive information to contribute to the risk assessment as required by the EUDR. As a stand-alone information, it does not completely fulfill the due diligence requirements for EUDR compliance. It is non-legally binding, non-exclusive and non-mandatory.</p>
            </div>

            <div id="filter-widget" style="display: none;">
                <div class="widget-sections">
                    <!-- States Section -->
                    <div class="widget-section">
                        <div class="widget-header">
                            <h4>States</h4>
                            <div class="flex items-center gap-2">
                                <button id="clear-states" class="text-blue-500">Clear</button>
                                <button id="lock-states" class="text-blue-500">Select All</button>
                            </div>
                        </div>
                        <div class="mt-2">
                            <input type="text" id="state-search" class="search-input" placeholder="Search states...">
                        </div>
                        <div class="selected-count">
                            <span class="text-sm text-gray-500">Selected: <span id="selected-states-count">0</span></span>
                        </div>
                        <div id="states-list" class="checkbox-list"></div>
                    </div>

                    <!-- Municipalities Section -->
                    <div class="widget-section mt-6">
                        <div class="widget-header">
                            <h4>Municipalities</h4>
                            <button id="all-municipalities" class="text-blue-500">Select All</button>
                        </div>
                        <div class="mt-2">
                            <input type="text" id="municipality-search" class="search-input" placeholder="Search municipalities...">
                        </div>
                        <div id="municipalities-list" class="checkbox-list"></div>
                    </div>
                </div>
            </div>
        </div>
    `;

    // State management
    let states = [];
    let municipalities = [];
    let isStatesLocked = false;
    let isLoading = false;
    let stateToMunicipalitiesMap = new Map();

    // Ensure we're using the global window variables for selections
    window.selectedStates = window.selectedStates || new Set();
    window.selectedMunicipalities = window.selectedMunicipalities || new Set();

    // Get DOM elements
    const panelToggle = document.getElementById('panel-toggle');
    const filterWidget = document.getElementById('filter-widget');
    const infoClose = document.getElementById('info-close');
    const infoDefaultContent = document.getElementById('info-default-content');

    // Show loading state
    function showLoading() {
        const statesList = document.getElementById('states-list');
        const municipalitiesList = document.getElementById('municipalities-list');
        
        if (statesList) {
            statesList.innerHTML = '<div class="loading">Loading states...</div>';
        }
        if (municipalitiesList) {
            municipalitiesList.innerHTML = '<div class="loading">Loading municipalities...</div>';
        }
    }

    // Fetch data from API
    // Replace the fetchRegionsData function in info-panel.js
    async function fetchRegionsData() {
        if (isLoading) return; // Prevent multiple simultaneous fetches
        
        try {
            isLoading = true;
            showLoading();
            
            // First check server health
            const healthCheck = await fetch(`${config.API_BASE_URL}/healthcheck`);
            const healthData = await healthCheck.json();
            
            if (!healthCheck.ok || healthData.status !== 'healthy') {
                throw new Error(healthData.error || 'Server health check failed');
            }

            // Fetch regions data
            const response = await fetch(`${config.API_BASE_URL}/regions?country=${window.currentCountry}`);
            
            let data;
            try {
                data = await response.json();
            } catch (error) {
                console.error('Failed to parse JSON response:', error);
                throw new Error('Invalid server response format');
            }
            
            if (!response.ok) {
                throw new Error(data.message || 'Failed to fetch regions data');
            }
            
            if (data.error) {
                throw new Error(data.message || `No data found for country: ${window.currentCountry}`);
            }
            
            if (!data.states || !data.municipalities) {
                throw new Error('Invalid data format: Missing states or municipalities');
            }
            
            // Process the data
            states = data.states;
            municipalities = data.municipalities;
            
            if (states.length === 0 || municipalities.length === 0) {
                throw new Error(`No states or municipalities found for country: ${window.currentCountry}`);
            }
            
            // Clear existing selections
            window.selectedStates.clear();
            window.selectedMunicipalities.clear();
            stateToMunicipalitiesMap.clear();
            
            // Select all states by default
            states.forEach(state => {
                window.selectedStates.add(state.statename);
            });
            
            // Group municipalities by state
            municipalities.forEach(muni => {
                if (!stateToMunicipalitiesMap.has(muni.state_name)) {
                    stateToMunicipalitiesMap.set(muni.state_name, []);
                }
                stateToMunicipalitiesMap.get(muni.state_name).push(muni);
                window.selectedMunicipalities.add(muni.muni_name);
            });
            
            // Update UI once
            updateStatesUI();
            updateMunicipalitiesUI();
            
            if (window.updateMapFilter) {
                window.updateMapFilter();
            }
        } catch (error) {
            console.error('Error fetching regions data:', error);
            
            const errorMessage = error.message || 'Unknown error occurred';
            
            const statesList = document.getElementById('states-list');
            const municipalitiesList = document.getElementById('municipalities-list');
            
            const errorHtml = `
                <div class="error-state">
                    <p>Error: ${errorMessage}</p>
                    <p>Please check your connection or try again later.</p>
                    <button onclick="location.reload()" class="retry-button">Retry</button>
                </div>
            `;
            
            if (statesList) statesList.innerHTML = errorHtml;
            if (municipalitiesList) municipalitiesList.innerHTML = errorHtml;
            
            throw error;
        } finally {
            isLoading = false;
        }
    }

    // Update states UI
    function updateStatesUI(searchTerm = '') {
        const statesList = document.getElementById('states-list');
        if (!statesList) return;

        const filteredStates = states.filter(state => 
            !searchTerm || state.statename.toLowerCase().includes(searchTerm.toLowerCase())
        );

        statesList.innerHTML = filteredStates.length ? filteredStates.map(state => `
            <div class="list-item ${window.selectedStates.has(state.statename) ? 'selected' : ''}">
                <label class="flex items-center justify-between w-full py-2 px-3 hover:bg-gray-50">
                    <div class="flex items-center">
                        <input type="checkbox" 
                            class="state-checkbox"
                            value="${state.statename}"
                            ${window.selectedStates.has(state.statename) ? 'checked' : ''}
                            ${isStatesLocked ? 'disabled' : ''}>
                        <span class="ml-2">${state.statename}</span>
                    </div>
                    <span class="count-badge">${state.region_count || 0}</span>
                </label>
            </div>
        `).join('') : '<div class="empty-state">No states found</div>';

        // Add event listeners to state checkboxes
        const stateCheckboxes = statesList.querySelectorAll('.state-checkbox');
        stateCheckboxes.forEach(checkbox => {
            checkbox.addEventListener('change', async function() {
                const stateName = this.value;
                
                if (this.checked) {
                    window.selectedStates.add(stateName);
                    const stateMunis = stateToMunicipalitiesMap.get(stateName) || [];
                    stateMunis.forEach(muni => {
                        window.selectedMunicipalities.add(muni.muni_name);
                    });
                } else {
                    window.selectedStates.delete(stateName);
                    const stateMunis = stateToMunicipalitiesMap.get(stateName) || [];
                    stateMunis.forEach(muni => {
                        window.selectedMunicipalities.delete(muni.muni_name);
                    });
                }
                
                updateMunicipalitiesUI();
                updateStatesUI();
                
                if (window.updateMapFilter) {
                    window.updateMapFilter();
                }
            });
        });

        const selectedStatesCount = document.getElementById('selected-states-count');
        if (selectedStatesCount) {
            selectedStatesCount.textContent = window.selectedStates.size;
        }
    }

    // Update municipalities UI
    function updateMunicipalitiesUI(searchTerm = '') {
        const municipalitiesList = document.getElementById('municipalities-list');
        if (!municipalitiesList) return;

        let availableMunicipalities = [];
        window.selectedStates.forEach(stateName => {
            const stateMunis = stateToMunicipalitiesMap.get(stateName) || [];
            availableMunicipalities = [...availableMunicipalities, ...stateMunis];
        });

        if (searchTerm) {
            availableMunicipalities = availableMunicipalities.filter(muni => 
                muni.muni_name.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        municipalitiesList.innerHTML = availableMunicipalities.length ? availableMunicipalities.map(muni => `
            <div class="list-item ${window.selectedMunicipalities.has(muni.muni_name) ? 'selected' : ''}">
                <label class="flex items-center justify-between w-full py-2 px-3">
                    <div class="flex items-center">
                        <input type="checkbox" 
                               class="municipality-checkbox"
                               value="${muni.muni_name}"
                               data-state="${muni.state_name}"
                               ${window.selectedMunicipalities.has(muni.muni_name) ? 'checked' : ''}>
                        <span class="ml-2">${muni.muni_name}</span>
                    </div>
                    <span class="count-badge">${muni.municipality_count || 0}</span>
                </label>
            </div>
        `).join('') : '<div class="empty-state">No municipalities available</div>';

        municipalitiesList.querySelectorAll('.municipality-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', function() {
                const muniName = this.value;
                
                if (this.checked) {
                    window.selectedMunicipalities.add(muniName);
                    this.closest('.list-item').classList.add('selected');
                } else {
                    window.selectedMunicipalities.delete(muniName);
                    this.closest('.list-item').classList.remove('selected');
                }
                
                if (window.updateMapFilter) {
                    window.updateMapFilter();
                }
            });
        });
    }

    // Update map filter - using the global function from map.js
    window.updateMapFilter = window.updateMapFilter || function() {
        console.error('updateMapFilter not loaded from map.js');
    };

    // Debounce function for search inputs
    function debounce(func, wait) {
        let timeout;
        return function(...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    }

    // Initialize the panel in info mode
    const toggleInfo = document.querySelector('.toggle-info');
    const toggleWidget = document.querySelector('.toggle-widget');
    
    if (toggleInfo && toggleWidget && infoDefaultContent && filterWidget) {
        toggleInfo.classList.add('active');
        toggleWidget.classList.remove('active');
        infoDefaultContent.style.display = 'block';
        filterWidget.style.display = 'none';
    }

    // Panel visibility toggles
    infoToggle?.addEventListener('click', () => {
        const isPanelVisible = infoPanel.classList.contains('visible');
        if (isPanelVisible) {
            // Close panel
            infoPanel.classList.remove('visible');
            contentWrapper.classList.add('panel-hidden');
            infoToggle.classList.remove('active');
        } else {
            // Open panel
            infoPanel.classList.add('visible');
            contentWrapper.classList.remove('panel-hidden');
            infoToggle.classList.add('active');
        }
        setTimeout(() => window.dispatchEvent(new Event('resize')), 300);
    });

    infoClose?.addEventListener('click', () => {
        infoPanel.classList.remove('visible');
        contentWrapper.classList.add('panel-hidden');
        infoToggle.classList.remove('active');
        setTimeout(() => window.dispatchEvent(new Event('resize')), 300);
    });

    // Initialize panel toggle functionality
    panelToggle?.addEventListener('click', function() {
        const toggleInfo = this.querySelector('.toggle-info');
        const toggleWidget = this.querySelector('.toggle-widget');
        
        if (infoDefaultContent.style.display !== 'none') {
            toggleWidget.classList.add('active');
            toggleInfo.classList.remove('active');
            filterWidget.style.display = 'block';
            infoDefaultContent.style.display = 'none';
            
            if (!states.length || !municipalities.length) {
                fetchRegionsData();
            }
        } else {
            toggleInfo.classList.add('active');
            toggleWidget.classList.remove('active');
            infoDefaultContent.style.display = 'block';
            filterWidget.style.display = 'none';
        }
    });

    // Initialize event listeners for filter controls
    document.getElementById('clear-states')?.addEventListener('click', () => {
        console.log('Clear button clicked - clearing all selections');
        window.selectedStates.clear();
        window.selectedMunicipalities.clear();
        updateStatesUI();
        updateMunicipalitiesUI();
        if (window.updateMapFilter) {
            window.updateMapFilter();
        }
    });

    // Change lock button to select all button
    const lockButton = document.getElementById('lock-states');
    if (lockButton) {
        lockButton.textContent = 'Select All';
        lockButton.addEventListener('click', function() {
            // Get all available states
            const allStates = states.map(state => state.statename);
            
            // If all states are already selected, clear the selection
            if (window.selectedStates.size === allStates.length) {
                console.log('Select All button clicked - all states were selected, clearing selections');
                window.selectedStates.clear();
                window.selectedMunicipalities.clear();
            } else {
                console.log('Select All button clicked - selecting all states and municipalities');
                // Otherwise, select all states
                allStates.forEach(state => window.selectedStates.add(state));
                // Also select all municipalities for these states
                municipalities.forEach(muni => {
                    if (window.selectedStates.has(muni.state_name)) {
                        window.selectedMunicipalities.add(muni.muni_name);
                    }
                });
            }
            
            updateStatesUI();
            updateMunicipalitiesUI();
            if (window.updateMapFilter) {
                window.updateMapFilter();
            }
        });
    }

    document.getElementById('all-municipalities')?.addEventListener('click', () => {
        // Get all municipalities for selected states
        const availableMunicipalities = municipalities.filter(muni => 
            window.selectedStates.has(muni.state_name)
        ).map(muni => muni.muni_name);

        // If all available municipalities are selected, clear them
        if (window.selectedMunicipalities.size === availableMunicipalities.length) {
            console.log('Select All Municipalities button clicked - all municipalities were selected, clearing selections');
            window.selectedMunicipalities.clear();
        } else {
            console.log('Select All Municipalities button clicked - selecting all available municipalities');
            // Otherwise select all available municipalities
            availableMunicipalities.forEach(muni => window.selectedMunicipalities.add(muni));
        }
        
        updateMunicipalitiesUI();
        if (window.updateMapFilter) {
            window.updateMapFilter();
        }
    });

    // Initialize search functionality
    const stateSearch = document.getElementById('state-search');
    const municipalitySearch = document.getElementById('municipality-search');

    if (stateSearch) {
        stateSearch.addEventListener('input', debounce(function() {
            updateStatesUI(this.value);
        }, 300));
    }

    if (municipalitySearch) {
        municipalitySearch.addEventListener('input', debounce(function() {
            updateMunicipalitiesUI(this.value);
        }, 300));
    }

    // Update map size when window resizes
    window.addEventListener('resize', () => {
        if (window.map) {
            window.map.updateSize();
        }
    });

    // Add custom styles
    const style = document.createElement('style');
    style.textContent = `
        .checkbox-list {
            max-height: 300px;
            overflow-y: auto;
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            margin-top: 8px;
        }

        .list-item {
            border-bottom: 1px solid #e2e8f0;
        }

        .list-item:last-child {
            border-bottom: none;
        }

        .list-item.selected {
            background-color: #e3f2fd;
        }

        .list-item label {
            cursor: pointer;
        }

        .count-badge {
            background-color: #f3f4f6;
            padding: 2px 8px;
            border-radius: 12px;
            font-size: 12px;
            color: #6b7280;
        }

        .others-section {
            margin-top: 12px;
            padding: 8px;
            background-color: #f9fafb;
            border-radius: 4px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .search-input {
            width: 100%;
            padding: 8px 12px;
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            font-size: 14px;
            margin-top: 8px;
        }

        .search-input:focus {
            outline: none;
            border-color: #2196F3;
            box-shadow: 0 0 0 2px rgba(33, 150, 243, 0.1);
        }

        .error-state {
            text-align: center;
            padding: 20px;
            color: #ef4444;
        }

        .loading {
            text-align: center;
            padding: 20px;
            color: #6b7280;
            position: relative;
        }

        .loading::after {
            content: '';
            position: absolute;
            width: 16px;
            height: 16px;
            top: 50%;
            left: 50%;
            margin-top: -8px;
            margin-left: -8px;
            border: 2px solid #f3f4f6;
            border-top-color: #3b82f6;
            border-radius: 50%;
            animation: loading-spinner 1s linear infinite;
        }

        @keyframes loading-spinner {
            to {
                transform: rotate(360deg);
            }
        }

        .empty-state {
            text-align: center;
            padding: 20px;
            color: #6b7280;
            font-size: 14px;
            background-color: #f9fafb;
            border-radius: 6px;
            margin: 8px 0;
        }

        .lock-button.active {
            background-color: #e3f2fd;
            color: #1976D2;
        }

        .text-blue-500.active {
            background-color: #e3f2fd;
        }

        /* Transitions */
        .list-item, .count-badge, .search-input, .button-blue {
            transition: all 0.2s ease;
        }

        /* Hover effects */
        .list-item:hover {
            background-color: #f8fafc;
        }

        .text-blue-500:hover {
            background-color: #e3f2fd;
            border-radius: 4px;
        }

        /* Scrollbar styling */
        .checkbox-list::-webkit-scrollbar {
            width: 6px;
        }

        .checkbox-list::-webkit-scrollbar-track {
            background: #f1f1f1;
            border-radius: 3px;
        }

        .checkbox-list::-webkit-scrollbar-thumb {
            background: #cbd5e0;
            border-radius: 3px;
        }

        .checkbox-list::-webkit-scrollbar-thumb:hover {
            background: #a0aec0;
        }
    `;
    document.head.appendChild(style);

    // Add filter widget HTML content
    document.getElementById('filter-widget').innerHTML = `
        <div class="widget-sections">
            <!-- States Section -->
            <div class="widget-section">
                <div class="widget-header">
                    <h4>States</h4>
                    <div class="flex items-center gap-2">
                        <button id="clear-states" class="text-blue-500">Clear</button>
                        <button id="lock-states" class="text-blue-500">Select All</button>
                    </div>
                </div>
                <div class="mt-2">
                    <input type="text" id="state-search" class="search-input" placeholder="Search states...">
                </div>
                <div class="selected-count">
                    <span class="text-sm text-gray-500">Selected: <span id="selected-states-count">0</span></span>
                </div>
                <div id="states-list" class="checkbox-list"></div>
            </div>

            <!-- Municipalities Section -->
            <div class="widget-section mt-6">
                <div class="widget-header">
                    <h4>Municipalities</h4>
                    <button id="all-municipalities" class="text-blue-500">Select All</button>
                </div>
                <div class="mt-2">
                    <input type="text" id="municipality-search" class="search-input" placeholder="Search municipalities...">
                </div>
                <div id="municipalities-list" class="checkbox-list"></div>
            </div>
        </div>
    `;

    // Initialize layer panel collapse functionality
    const layerControl = document.getElementById('layer-control');
    const toggleButton = document.querySelector('.collapse-toggle');
    
    if (toggleButton && layerControl) {
        toggleButton.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            layerControl.classList.toggle('collapsed');
            this.textContent = layerControl.classList.contains('collapsed') ? '→' : '←';
        });
    }

    // Initialize empty selection sets
    window.selectedStates = new Set();
    window.selectedMunicipalities = new Set();

    // Fetch initial data
    fetchRegionsData();
    
    // Initialize layer control and other components
    initializeLayerControl();
    initializeMapTypeToggle();
    initializePopup();
    initializeHoverInfo();
    initializeMap();
    
    // Make window.map available for other scripts
    window.map = map;

    // Layer control functionality
    if (document.getElementById('layer-control')) {
        const layerControl = document.getElementById('layer-control');
        const layersToggle = document.getElementById('layers-toggle');
        const layerCloseButton = layerControl.querySelector('.close-button');
        const layerContent = layerControl.querySelector('.layer-control-content');

        // Function to update layer control height
        function updateLayerControlHeight() {
            const checkedLayers = layerControl.querySelectorAll('input[type="checkbox"]:checked');
            if (checkedLayers.length === 0) {
                layerContent.style.maxHeight = 'fit-content';
                layerControl.style.height = 'auto';
            } else {
                layerContent.style.maxHeight = '80vh';
                layerControl.style.height = 'auto';
            }
        }

        // Show layers panel by default
        layerControl.classList.remove('collapsed');
        layersToggle.classList.add('hidden');

        // Show legends for checked layers by default
        const checkedLayers = layerControl.querySelectorAll('input[type="checkbox"]:checked');
        checkedLayers.forEach(checkbox => {
            const layerItem = checkbox.closest('.layer-item');
            const legend = layerItem.querySelector('.legend-items');
            if (legend) {
                legend.style.display = 'block';
            }
        });

        // Initial height update
        updateLayerControlHeight();

        // Handle checkbox changes to show/hide legends and update height
        const checkboxes = layerControl.querySelectorAll('input[type="checkbox"]');
        checkboxes.forEach(checkbox => {
            checkbox.addEventListener('change', function() {
                const layerItem = this.closest('.layer-item');
                const legend = layerItem.querySelector('.legend-items');
                if (legend) {
                    legend.style.display = this.checked ? 'block' : 'none';
                }
                updateLayerControlHeight();
            });
        });

        // Handle close button click
        layerCloseButton?.addEventListener('click', () => {
            layerControl.classList.add('collapsed');
            layersToggle.classList.remove('hidden');
        });

        // Handle layers toggle button click
        layersToggle?.addEventListener('click', () => {
            layerControl.classList.remove('collapsed');
            layersToggle.classList.add('hidden');
        });
    }
});