// API Configuration
const API_KEY = "2a8e2f9e014b4e8ff5f4a2cabf103dfe"; // Using the API key from the original app
const BASE_URL = "https://api.openweathermap.org/data/2.5";
const MAP_BASE_URL = "https://tile.openweathermap.org/map";
const CITIES_MAX = 5; // Maximum number of recent cities to store
// Update the API Configuration section in script.js
const NEWS_API_KEY = "91e0037b7ad2493dbcbbfe0ad594ff0c";
const ALERTS_API_KEY = "9b312e27568645c8a6849e5b8952f595";
const NEWS_API_URL = "https://newsapi.org/v2/everything";
const ALERTS_API_URL = "https://api.weatherbit.io/v2.0/alerts";
const AIR_QUALITY_URL = "https://api.openweathermap.org/data/2.5/air_pollution";


// Global State
let currentUnit = "metric"; // metric or imperial
let currentMapLayer = "temp_new";
let savedCities = [];
let weatherMap;
let mapMarkers = [];
let weatherAlerts = [];
let weatherNews = [];

// DOM Elements
// Sidebar
const sidebar = document.querySelector(".sidebar");
const sidebarToggleBtn = document.getElementById("sidebar-toggle");
const searchInput = document.getElementById("search-input");
const searchBtn = document.getElementById("search-btn");
const locationBtn = document.getElementById("location-btn");
const recentLocationsList = document.getElementById("recent-locations-list");
const darkModeToggle = document.getElementById("dark-mode-toggle");
const currentYearSpan = document.getElementById("current-year");
const weatherAlertsContainer = document.getElementById("weather-alerts-container");
const weatherNewsContainer = document.getElementById("weather-news-container");
const aqiValueElement = document.getElementById("aqi-value");
const aqiLevelElement = document.getElementById("aqi-level");
const aqiCoElement = document.getElementById("aqi-co");
const aqiNo2Element = document.getElementById("aqi-no2");
const aqiO3Element = document.getElementById("aqi-o3");
const aqiSo2Element = document.getElementById("aqi-so2");
const aqiPm25Element = document.getElementById("aqi-pm25");
const aqiPm10Element = document.getElementById("aqi-pm10");

// Main content
const cityNameElement = document.getElementById("city-name");
const currentDateElement = document.getElementById("current-date");
const currentTempElement = document.getElementById("current-temp");
const weatherIconElement = document.getElementById("weather-icon");
const weatherDescriptionElement = document.getElementById("weather-description");
const feelsLikeElement = document.getElementById("feels-like");
const humidityElement = document.getElementById("humidity");
const windSpeedElement = document.getElementById("wind-speed");
const pressureElement = document.getElementById("pressure");
const sunriseElement = document.getElementById("sunrise");
const sunsetElement = document.getElementById("sunset");
const forecastContainer = document.getElementById("forecast-container");
const hourlyForecastContainer = document.getElementById("hourly-forecast");

// Unit toggle
const celsiusBtn = document.getElementById("celsius-btn");
const fahrenheitBtn = document.getElementById("fahrenheit-btn");

// Weather map
const mapBtns = document.querySelectorAll(".map-btn");

// Loading overlay
const loadingOverlay = document.getElementById("loading-overlay");

// Initialize App
document.addEventListener("DOMContentLoaded", function() {
    // Set current year
    currentYearSpan.textContent = new Date().getFullYear();
    
    // Set current date
    updateCurrentDate();
    
    // Initialize dark mode
    initDarkMode();
    
    // Load saved cities from localStorage
    loadSavedCities();
    
    // Initialize map
    initWeatherMap();
    
    // Event listeners
    setupEventListeners();
    
    // Load default city or last saved city
    const defaultCity = savedCities.length > 0 ? savedCities[0].name : "London";
    fetchWeatherData(defaultCity);
});

// ======= EVENT LISTENERS =======
function setupEventListeners() {
    // Sidebar toggle
    sidebarToggleBtn.addEventListener("click", () => {
        sidebar.classList.toggle("collapsed");
    });
    
    // Search button
    searchBtn.addEventListener("click", handleSearch);
    
    // Search input on enter key
    searchInput.addEventListener("keyup", function(event) {
        if (event.key === "Enter") {
            handleSearch();
        }
    });
    
    // Current location button
    locationBtn.addEventListener("click", useCurrentLocation);
    
    // Unit toggle
    celsiusBtn.addEventListener("click", () => {
        setUnit("metric");
    });
    
    fahrenheitBtn.addEventListener("click", () => {
        setUnit("imperial");
    });
    
    // Dark mode toggle
    darkModeToggle.addEventListener("click", toggleDarkMode);
    
    // Map layer buttons
    mapBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            const layer = btn.dataset.layer;
            setMapLayer(layer);
        });
    });
}

// ======= SEARCH FUNCTIONALITY =======
function handleSearch() {
    const city = searchInput.value.trim();
    if (city !== "") {
        fetchWeatherData(city);
        searchInput.value = "";
    }
}

// ======= LOCATION FUNCTIONALITY =======
function useCurrentLocation() {
    if (navigator.geolocation) {
        showLoading(true);
        navigator.geolocation.getCurrentPosition(
            position => {
                const { latitude, longitude } = position.coords;
                fetchWeatherByCoords(latitude, longitude);
            },
            error => {
                console.error("Error getting location:", error);
                showLoading(false);
                alert("Unable to get your location. Please check your browser settings.");
            }
        );
    } else {
        alert("Geolocation is not supported by your browser.");
    }
}

// ======= WEATHER DATA FUNCTIONS =======
async function fetchWeatherData(city) {
    try {
        showLoading(true);
        
        // Fetch current weather
        const weatherResponse = await fetch(`${BASE_URL}/weather?q=${city}&appid=${API_KEY}&units=${currentUnit}`);
        
        if (!weatherResponse.ok) {
            throw new Error(`City not found: ${city}`);
        }
        
        const weatherData = await weatherResponse.json();
        
        // Fetch forecast
        const forecastResponse = await fetch(`${BASE_URL}/forecast?q=${city}&appid=${API_KEY}&units=${currentUnit}`);
        const forecastData = await forecastResponse.json();
        
        // Fetch air quality
        const aqiResponse = await fetch(`${AIR_QUALITY_URL}?lat=${weatherData.coord.lat}&lon=${weatherData.coord.lon}&appid=${API_KEY}`);
        const aqiData = await aqiResponse.json();
        
        // Update UI
        updateWeatherUI(weatherData);
        updateForecastUI(forecastData);
        updateAqiUI(aqiData);
        
        // Update map
        updateMapPosition(weatherData.coord.lat, weatherData.coord.lon, weatherData);
        
        // Add to recent searches
        addToRecentSearches({
            name: weatherData.name,
            country: weatherData.sys.country
        });
        
        // Fetch weather alerts and news
        fetchWeatherAlerts(weatherData.coord.lat, weatherData.coord.lon);
        fetchWeatherNews();
        
        showLoading(false);
    } catch (error) {
        console.error("Error fetching weather data:", error);
        showLoading(false);
        alert(`Error: ${error.message}`);
    }
}

async function fetchWeatherByCoords(lat, lon) {
    try {
        showLoading(true);
        
        const weatherResponse = await fetch(`${BASE_URL}/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=${currentUnit}`);
        const weatherData = await weatherResponse.json();
        
        const forecastResponse = await fetch(`${BASE_URL}/forecast?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=${currentUnit}`);
        const forecastData = await forecastResponse.json();
        
        const aqiResponse = await fetch(`${AIR_QUALITY_URL}?lat=${lat}&lon=${lon}&appid=${API_KEY}`);
        const aqiData = await aqiResponse.json();
        
        updateWeatherUI(weatherData);
        updateForecastUI(forecastData);
        updateAqiUI(aqiData);
        updateMapPosition(lat, lon, weatherData);
        
        addToRecentSearches({
            name: weatherData.name,
            country: weatherData.sys.country
        });
        
        fetchWeatherAlerts(lat, lon);
        fetchWeatherNews();
        
        showLoading(false);
    } catch (error) {
        console.error("Error fetching weather data by coordinates:", error);
        showLoading(false);
        alert("Error fetching weather data for your location.");
    }
}

// ======= UI UPDATE FUNCTIONS =======
function updateWeatherUI(data) {
    // Update city name
    cityNameElement.textContent = `${data.name}, ${data.sys.country}`;
    
    // Update current weather
    currentTempElement.textContent = Math.round(data.main.temp);
    weatherDescriptionElement.textContent = data.weather[0].description;
    
    // Update weather icon
    const iconCode = data.weather[0].icon;
    weatherIconElement.innerHTML = `<i class="${getWeatherIconClass(iconCode)}"></i>`;
    
    // Update details
    feelsLikeElement.textContent = `${Math.round(data.main.feels_like)}°${currentUnit === "metric" ? "C" : "F"}`;
    humidityElement.textContent = `${data.main.humidity}%`;
    windSpeedElement.textContent = `${Math.round(data.wind.speed)} ${currentUnit === "metric" ? "m/s" : "mph"}`;
    pressureElement.textContent = `${data.main.pressure} hPa`;
    
    // Update sunrise and sunset
    const sunrise = new Date(data.sys.sunrise * 1000);
    const sunset = new Date(data.sys.sunset * 1000);
    
    sunriseElement.textContent = sunrise.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    sunsetElement.textContent = sunset.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    // Update temperature unit display
    document.querySelectorAll(".temp-unit").forEach(el => {
        el.textContent = currentUnit === "metric" ? "°C" : "°F";
    });
}

function updateAqiUI(aqiData) {
    if (!aqiData || !aqiData.list || aqiData.list.length === 0) return;
    
    const aqi = aqiData.list[0].main.aqi;
    const components = aqiData.list[0].components;
    
    // Update AQI value and level
    aqiValueElement.textContent = aqi;
    aqiLevelElement.textContent = getAqiLevelText(aqi);
    
    // Set AQI color based on level
    aqiValueElement.className = "aqi-value";
    aqiValueElement.classList.add(`aqi-${getAqiLevelClass(aqi)}`);
    
    // Update component values
    aqiCoElement.textContent = components.co.toFixed(2);
    aqiNo2Element.textContent = components.no2.toFixed(2);
    aqiO3Element.textContent = components.o3.toFixed(2);
    aqiSo2Element.textContent = components.so2.toFixed(2);
    aqiPm25Element.textContent = components.pm2_5.toFixed(2);
    aqiPm10Element.textContent = components.pm10.toFixed(2);
}

function getAqiLevelText(aqi) {
    switch(aqi) {
        case 1: return "Good";
        case 2: return "Fair";
        case 3: return "Moderate";
        case 4: return "Poor";
        case 5: return "Very Poor";
        default: return "Unknown";
    }
}

function getAqiLevelClass(aqi) {
    switch(aqi) {
        case 1: return "good";
        case 2: return "fair";
        case 3: return "moderate";
        case 4: return "poor";
        case 5: return "very-poor";
        default: return "good";
    }
}

function updateForecastUI(data) {
    // Group by day
    const dailyData = groupForecastByDay(data.list);
    
    // Update 5-day forecast
    updateDailyForecast(dailyData);
    
    // Update hourly forecast
    updateHourlyForecast(data.list.slice(0, 8)); // Next 24 hours (3-hour steps)
}

function updateDailyForecast(dailyData) {
    forecastContainer.innerHTML = "";
    
    // Take 5 days
    const fiveDayForecast = Object.values(dailyData).slice(0, 5);
    
    fiveDayForecast.forEach(day => {
        const date = new Date(day.date);
        const dayName = date.toLocaleDateString([], { weekday: 'short' });
        const monthDay = date.toLocaleDateString([], { month: 'short', day: 'numeric' });
        
        const card = document.createElement("div");
        card.className = "forecast-card";
        card.innerHTML = `
            <div class="forecast-date">${dayName}, ${monthDay}</div>
            <div class="forecast-icon">
                <i class="${getWeatherIconClass(day.icon)}"></i>
            </div>
            <div class="forecast-temps">
                <span class="forecast-max">${Math.round(day.maxTemp)}°</span>
                <span class="forecast-min">${Math.round(day.minTemp)}°</span>
            </div>
            <div class="forecast-description">${day.description}</div>
        `;
        
        forecastContainer.appendChild(card);
    });
}

function updateHourlyForecast(hourlyData) {
    hourlyForecastContainer.innerHTML = "";
    
    hourlyData.forEach(hour => {
        const date = new Date(hour.dt * 1000);
        const hourStr = date.toLocaleTimeString([], { hour: '2-digit' });
        
        const item = document.createElement("div");
        item.className = "hourly-item";
        item.innerHTML = `
            <div class="hourly-time">${hourStr}</div>
            <div class="hourly-icon">
                <i class="${getWeatherIconClass(hour.weather[0].icon)}"></i>
            </div>
            <div class="hourly-temp">${Math.round(hour.main.temp)}°</div>
        `;
        
        hourlyForecastContainer.appendChild(item);
    });
}

function updateCurrentDate() {
    const now = new Date();
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    currentDateElement.textContent = now.toLocaleDateString([], options);
}

// ======= MAP FUNCTIONS =======
function initWeatherMap() {
    weatherMap = L.map('weather-map').setView([51.505, -0.09], 13);
    
    // Add the base map layer (OpenStreetMap)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(weatherMap);
    
    // Add initial weather layer
    addWeatherLayer(currentMapLayer);
}

function updateMapPosition(lat, lon, weatherData) {
    weatherMap.setView([lat, lon], 10);
    
    // Clear previous markers
    mapMarkers.forEach(marker => weatherMap.removeLayer(marker));
    mapMarkers = [];
    
    // Add marker for current location
    const marker = createCustomMarker([lat, lon], weatherData);
    marker.addTo(weatherMap);
    mapMarkers.push(marker);
}

function createCustomMarker(latlng, weatherData) {
    const temp = Math.round(weatherData.main.temp);
    const iconClass = getWeatherIconClass(weatherData.weather[0].icon);
    
    const customIcon = L.divIcon({
        className: 'custom-marker',
        html: `
            <div class="map-marker">
                <i class="${iconClass}"></i>
                <span>${temp}°${currentUnit === "metric" ? "C" : "F"}</span>
            </div>
        `,
        iconSize: [40, 40],
        iconAnchor: [20, 40]
    });
    
    return L.marker(latlng, { icon: customIcon });
}

function setMapLayer(layer) {
    // Update active button
    mapBtns.forEach(btn => {
        btn.classList.toggle("active", btn.dataset.layer === layer);
    });
    
    // Update map
    currentMapLayer = layer;
    addWeatherLayer(layer);
}

function addWeatherLayer(layer) {
    // Remove existing weather layers
    weatherMap.eachLayer(mapLayer => {
        if (mapLayer instanceof L.TileLayer && mapLayer._url.includes(MAP_BASE_URL)) {
            weatherMap.removeLayer(mapLayer);
        }
    });
    
    // Add new weather layer
    L.tileLayer(`${MAP_BASE_URL}/${layer}/{z}/{x}/{y}.png?appid=${API_KEY}`, {
        attribution: '&copy; OpenWeatherMap',
        maxZoom: 18
    }).addTo(weatherMap);
}

// ======= WEATHER ALERTS AND NEWS =======
async function fetchWeatherAlerts(lat, lon) {
    try {
        const response = await fetch(`${ALERTS_API_URL}?lat=${lat}&lon=${lon}&key=${ALERTS_API_KEY}`);
        const data = await response.json();
        
        if (data.alerts) {
            weatherAlerts = data.alerts;
            updateWeatherAlertsUI();
        } else if (data.error) {
            console.error("Weather alerts API error:", data.error);
            showNoAlertsMessage();
        }
    } catch (error) {
        console.error("Error fetching weather alerts:", error);
        showNoAlertsMessage();
    }
}

function showNoAlertsMessage() {
    weatherAlertsContainer.innerHTML = `
        <div class="alert-card info">
            <div class="alert-header">
                <i class="fas fa-info-circle alert-icon"></i>
                <h4 class="alert-title">No Active Alerts</h4>
            </div>
            <p class="alert-description">There are no active weather alerts for this location or we couldn't fetch them at this time.</p>
        </div>
    `;
}

async function fetchWeatherNews() {
    try {
        const response = await fetch(`${NEWS_API_URL}?q=weather&language=en&sortBy=publishedAt&apiKey=${NEWS_API_KEY}`);
        const data = await response.json();
        
        if (data.articles) {
            weatherNews = data.articles.slice(0, 4); // Get top 4 news articles
            updateWeatherNewsUI();
        } else if (data.message) {
            console.error("News API error:", data.message);
            showNewsError();
        }
    } catch (error) {
        console.error("Error fetching weather news:", error);
        showNewsError();
    }
}

function showNewsError() {
    weatherNewsContainer.innerHTML = `
        <div class="alert-card info" style="grid-column: 1/-1">
            <div class="alert-header">
                <i class="fas fa-info-circle alert-icon"></i>
                <h4 class="alert-title">Weather News Unavailable</h4>
            </div>
            <p class="alert-description">We couldn't fetch weather news at this time. Please try again later.</p>
        </div>
    `;
}

function updateWeatherAlertsUI() {
    weatherAlertsContainer.innerHTML = "";
    
    if (weatherAlerts.length === 0) {
        showNoAlertsMessage();
        return;
    }
    
    weatherAlerts.forEach(alert => {
        const alertDate = new Date(alert.effective_local);
        const alertCard = document.createElement("div");
        alertCard.className = `alert-card ${alert.severity.toLowerCase()}`;
        alertCard.innerHTML = `
            <div class="alert-header">
                <i class="fas ${getAlertIcon(alert.severity)} alert-icon"></i>
                <h4 class="alert-title">${alert.title}</h4>
            </div>
            <p class="alert-date">${alertDate.toLocaleString()}</p>
            <p class="alert-description">${alert.description}</p>
        `;
        weatherAlertsContainer.appendChild(alertCard);
    });
}

function updateWeatherNewsUI() {
    weatherNewsContainer.innerHTML = "";
    
    weatherNews.forEach(news => {
        const newsDate = new Date(news.publishedAt);
        const newsCard = document.createElement("div");
        newsCard.className = "news-card";
        newsCard.innerHTML = `
            <img src="${news.urlToImage || 'https://via.placeholder.com/300x180?text=Weather+News'}" alt="${news.title}" class="news-image">
            <div class="news-content">
                <span class="news-source">
                    <i class="fas fa-newspaper"></i>
                    ${news.source.name}
                </span>
                <h4 class="news-title">${news.title}</h4>
                <p class="news-description">${news.description || ''}</p>
                <div class="news-footer">
                    <span class="news-date">${newsDate.toLocaleDateString()}</span>
                    <a href="${news.url}" target="_blank" class="read-more">Read more →</a>
                </div>
            </div>
        `;
        weatherNewsContainer.appendChild(newsCard);
    });
}

function getAlertIcon(severity) {
    switch (severity.toLowerCase()) {
        case 'warning': return 'fa-exclamation-triangle';
        case 'watch': return 'fa-binoculars';
        case 'advisory': return 'fa-info-circle';
        default: return 'fa-exclamation-circle';
    }
}

// ======= UTILITY FUNCTIONS =======
function groupForecastByDay(forecastList) {
    const dailyData = {};
    
    forecastList.forEach(item => {
        const date = new Date(item.dt * 1000);
        const day = date.toISOString().split('T')[0];
        
        if (!dailyData[day]) {
            dailyData[day] = {
                date: day,
                minTemp: item.main.temp_min,
                maxTemp: item.main.temp_max,
                icon: item.weather[0].icon,
                description: item.weather[0].description
            };
        } else {
            if (item.main.temp_min < dailyData[day].minTemp) {
                dailyData[day].minTemp = item.main.temp_min;
            }
            if (item.main.temp_max > dailyData[day].maxTemp) {
                dailyData[day].maxTemp = item.main.temp_max;
            }
        }
    });
    
    return dailyData;
}

function getWeatherIconClass(iconCode) {
    // Map OpenWeatherMap icon codes to Weather Icons classes
    const iconMap = {
        '01d': 'wi wi-day-sunny',
        '01n': 'wi wi-night-clear',
        '02d': 'wi wi-day-cloudy',
        '02n': 'wi wi-night-alt-cloudy',
        '03d': 'wi wi-cloud',
        '03n': 'wi wi-cloud',
        '04d': 'wi wi-cloudy',
        '04n': 'wi wi-cloudy',
        '09d': 'wi wi-day-showers',
        '09n': 'wi wi-night-alt-showers',
        '10d': 'wi wi-day-rain',
        '10n': 'wi wi-night-alt-rain',
        '11d': 'wi wi-day-thunderstorm',
        '11n': 'wi wi-night-alt-thunderstorm',
        '13d': 'wi wi-day-snow',
        '13n': 'wi wi-night-alt-snow',
        '50d': 'wi wi-day-fog',
        '50n': 'wi wi-night-fog'
    };
    
    return iconMap[iconCode] || 'wi wi-na';
}

function setUnit(unit) {
    if (currentUnit === unit) return;
    
    currentUnit = unit;
    
    // Update UI
    celsiusBtn.classList.toggle("active", unit === "metric");
    fahrenheitBtn.classList.toggle("active", unit === "imperial");
    
    // Reload weather data
    const cityName = cityNameElement.textContent.split(',')[0].trim();
    fetchWeatherData(cityName);
}

// ======= LOCAL STORAGE FUNCTIONS =======
function loadSavedCities() {
    const savedData = localStorage.getItem("weatherWaveSavedCities");
    if (savedData) {
        savedCities = JSON.parse(savedData);
        updateRecentCitiesList();
    }
}

function addToRecentSearches(city) {
    // Remove if already exists
    savedCities = savedCities.filter(c => c.name !== city.name);
    
    // Add to beginning
    savedCities.unshift(city);
    
    // Limit to CITIES_MAX
    if (savedCities.length > CITIES_MAX) {
        savedCities = savedCities.slice(0, CITIES_MAX);
    }
    
    // Save to localStorage
    localStorage.setItem("weatherWaveSavedCities", JSON.stringify(savedCities));
    
    // Update UI
    updateRecentCitiesList();
}

function updateRecentCitiesList() {
    recentLocationsList.innerHTML = "";
    
    savedCities.forEach(city => {
        const li = document.createElement("li");
        li.className = "location-item";
        li.innerHTML = `
            <span class="location-item-name">${city.name}, ${city.country}</span>
            <button class="location-item-remove" aria-label="Remove from recent searches">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        // Add click event for the city
        li.addEventListener("click", (e) => {
            if (!e.target.closest(".location-item-remove")) {
                fetchWeatherData(city.name);
            }
        });
        
        // Add click event for remove button
        const removeBtn = li.querySelector(".location-item-remove");
        removeBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            removeRecentCity(city.name);
        });
        
        recentLocationsList.appendChild(li);
    });
}

function removeRecentCity(cityName) {
    savedCities = savedCities.filter(city => city.name !== cityName);
    localStorage.setItem("weatherWaveSavedCities", JSON.stringify(savedCities));
    updateRecentCitiesList();
}

// ======= DARK MODE =======
function initDarkMode() {
    // Check for saved preference
    const darkModeEnabled = localStorage.getItem("weatherWaveDarkMode") === "true";
    
    if (darkModeEnabled) {
        document.body.classList.add("dark-mode");
        updateDarkModeToggle(true);
    }
}

function toggleDarkMode() {
    const isDarkMode = document.body.classList.toggle("dark-mode");
    localStorage.setItem("weatherWaveDarkMode", isDarkMode);
    updateDarkModeToggle(isDarkMode);
}

function updateDarkModeToggle(isDarkMode) {
    // Update icon and text
    const icon = darkModeToggle.querySelector("i");
    if (isDarkMode) {
        icon.classList.remove("fa-moon");
        icon.classList.add("fa-sun");
        darkModeToggle.querySelector("span").textContent = "Light Mode";
    } else {
        icon.classList.remove("fa-sun");
        icon.classList.add("fa-moon");
        darkModeToggle.querySelector("span").textContent = "Dark Mode";
    }
}

// ======= LOADING STATE =======
function showLoading(isLoading) {
    loadingOverlay.style.display = isLoading ? "flex" : "none";
}