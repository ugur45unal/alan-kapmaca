// HTML elemanlarını seçiyoruz
const startButton = document.getElementById('startButton');
const finishButton = document.getElementById('finishButton');
const mapElement = document.getElementById('map');
const statsPanel = document.getElementById('statsPanel');
const distanceDisplay = document.getElementById('distance');
const timerDisplay = document.getElementById('timer');
const modal = document.getElementById('resultsModal');
const closeModalButton = document.getElementById('closeModal');

// Değişkenlerimizi tanımlıyoruz
let map;
let isTracking = false;
let watchId;
let userPath = []; 
let pathPolyline;
let startMarker;
let startPosition;

// Canlı veri değişkenleri
let totalDistance = 0;
let seconds = 0;
let timerInterval;

// Haritayı başlatan fonksiyon
function initializeMap(position) {
    const { latitude, longitude } = position.coords;
    if (map) {
        map.setView([latitude, longitude], 17);
        return;
    }
    map = L.map(mapElement).setView([latitude, longitude], 17);

    // Daha şık bir harita katmanı seçiyoruz (CartoDB Positron)
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
    }).addTo(map);
}

// Takibi başlatan olay
startButton.addEventListener('click', () => {
    if (!navigator.geolocation) {
        alert("Tarayıcınız konum servislerini desteklemiyor.");
        return;
    }
    navigator.geolocation.getCurrentPosition(position => {
        initializeMap(position);
        startTracking(position);
    }, handleError);
});

// Takip mekaniği
function startTracking(position) {
    // Reset everything
    resetState();
    
    isTracking = true;
    statsPanel.classList.remove('hidden');
    startButton.disabled = true;

    startPosition = { lat: position.coords.latitude, lng: position.coords.longitude };
    userPath = [[startPosition.lat, startPosition.lng]];
    
    // Animasyonlu özel ikon oluşturma
    const pulsingIcon = L.divIcon({
        className: 'pulsing-icon',
        iconSize: [16, 16]
    });
    
    if(startMarker) map.removeLayer(startMarker);
    startMarker = L.marker([startPosition.lat, startPosition.lng], { icon: pulsingIcon }).addTo(map)
        .bindPopup('<b>Başlangıç Noktası</b>').openPopup();

    pathPolyline = L.polyline(userPath, { color: '#3498db', weight: 5 }).addTo(map);

    startTimer();
    
    watchId = navigator.geolocation.watchPosition(updatePosition, handleError, { enableHighAccuracy: true });
}

// Konum güncelleme
function updatePosition(position) {
    if (!isTracking) return;

    const newCoord = [position.coords.latitude, position.coords.longitude];
    const lastCoord = userPath[userPath.length - 1];

    // Toplam mesafeyi hesapla
    totalDistance += L.latLng(lastCoord).distanceTo(L.latLng(newCoord));
    distanceDisplay.textContent = `Mesafe: ${Math.round(totalDistance)} m`;

    userPath.push(newCoord);
    pathPolyline.addLatLng(newCoord);
    map.panTo(newCoord);

    // Başlangıca yakınlık kontrolü
    const distanceToStart = L.latLng(newCoord).distanceTo(L.latLng(startPosition));
    if (distanceToStart < 25) { // 25 metre eşiği
        finishButton.disabled = false;
    } else {
        finishButton.disabled = true;
    }
}

// Turu bitirme
finishButton.addEventListener('click', () => {
    if (!isTracking || userPath.length < 3) return;

    // Takibi durdur
    navigator.geolocation.clearWatch(watchId);
    isTracking = false;
    stopTimer();

    // Çizgiyi kaldırıp yerine alanı (poligon) çiz
    map.removeLayer(pathPolyline);
    const areaPolygon = L.polygon(userPath, { color: '#e74c3c', fillColor: '#f1948a', fillOpacity: 0.6 }).addTo(map);
    map.fitBounds(areaPolygon.getBounds());

    // Alanı hesapla (L.GeometryUtil eklentisi ile)
    const area = L.GeometryUtil.geodesicArea(userPath);
    
    // Sonuçları modalda göster
    document.getElementById('resultArea').textContent = area.toFixed(2);
    document.getElementById('resultDistance').textContent = totalDistance.toFixed(2);
    document.getElementById('resultTime').textContent = timerDisplay.textContent.replace('Süre: ', '');
    modal.classList.remove('hidden');

    resetState();
});

// Modal kapatma
closeModalButton.addEventListener('click', () => {
    modal.classList.add('hidden');
});

// Sayaç fonksiyonları
function startTimer() {
    timerInterval = setInterval(() => {
        seconds++;
        const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
        const secs = (seconds % 60).toString().padStart(2, '0');
        timerDisplay.textContent = `Süre: ${mins}:${secs}`;
    }, 1000);
}

function stopTimer() {
    clearInterval(timerInterval);
}

// Durumu sıfırlama fonksiyonu
function resetState() {
    startButton.disabled = false;
    finishButton.disabled = true;
    statsPanel.classList.add('hidden');
    totalDistance = 0;
    seconds = 0;
    distanceDisplay.textContent = 'Mesafe: 0 m';
    timerDisplay.textContent = 'Süre: 00:00';
    if(timerInterval) stopTimer();
    // Haritadaki eski çizimleri temizle (opsiyonel)
}

function handleError(error) {
    console.error(`HATA(${error.code}): ${error.message}`);
    alert("Konum bilgisi alınamadı. Lütfen tarayıcınızdan konum izni verdiğinizden emin olun.");
}
