const config = {
    SERVER: {
        HOST: '3.122.192.184',
        API_PORT: '5001',
        GEOSERVER_PORT: '8080'
    },
    COUNTRIES: {
        KENYA: 'Kenya',
        VIETNAM: 'Vietnam'
    },
    // Set the current country here
    CURRENT_COUNTRY: 'Kenya', // Change this to 'Vietnam' to switch countries
    AVAILABLE_COUNTRIES: ['Kenya', 'Vietnam'],
    get API_BASE_URL() {
        return `http://${this.SERVER.HOST}:${this.SERVER.API_PORT}/api`;
    },
    get GEOSERVER_BASE_URL() {
        return `http://${this.SERVER.HOST}:${this.SERVER.GEOSERVER_PORT}`;
    },
    // Function to update current country
    setCurrentCountry(country) {
        if (this.AVAILABLE_COUNTRIES.includes(country)) {
            this.CURRENT_COUNTRY = country;
            // Update window.currentCountry for compatibility
            if (typeof window !== 'undefined') {
                window.currentCountry = country;
                // Update map view first
                if (window.updateMapView) {
                    window.updateMapView();
                }
                // Then update filters and data
                if (window.updateMapFilter) {
                    window.updateMapFilter();
                }
                // Clear existing selections
                if (window.selectedStates) {
                    window.selectedStates.clear();
                }
                if (window.selectedMunicipalities) {
                    window.selectedMunicipalities.clear();
                }
                // Fetch new regions data if the function exists
                if (typeof window.fetchRegionsData === 'function') {
                    window.fetchRegionsData();
                }
            }
            return true;
        }
        console.error(`Invalid country: ${country}. Available countries: ${this.AVAILABLE_COUNTRIES.join(', ')}`);
        return false;
    },
    // Function to get current country
    getCurrentCountry() {
        return this.CURRENT_COUNTRY;
    }
};

// For browser
if (typeof window !== 'undefined') {
    window.config = config;
    // Set default country
    window.currentCountry = config.CURRENT_COUNTRY;
}

// For Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = config;
}
