// HTML elemanlarını seçiyoruz
const startButton = document.getElementById('startButton');
const finishButton = document.getElementById('finishButton');
const mapElement = document.getElementById('map');

// Değişkenlerimizi tanımlıyoruz
let map;
let isTracking = false;
let watchId;
let userPath = []; // Kullanıcının rotasını tutacak koordinat dizisi
let pathPolyline;  // Haritada çizilen yol
let startMarker;   // Başlangıç noktasını gösteren işaretçi
let startPosition; // Başlangıç koordinatları

// Haritayı başlatan fonksiyon
function initializeMap(position) {
    const { latitude, longitude } = position.coords;
    
    // Eğer harita zaten varsa tekrar oluşturma
    if (map) {
        map.setView([latitude, longitude], 16);
        return;
    }

    // Haritayı oluştur ve başlangıç konumuna odakla
    map = L.map(mapElement).setView([latitude, longitude], 16);

    // OpenStreetMap katmanını haritaya ekle
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);
}

// Takip başladığında çalışacak fonksiyon
startButton.addEventListener('click', () => {
    // Tarayıcının konum servisleri desteği var mı kontrol et
    if (!navigator.geolocation) {
        alert("Tarayıcınız konum servislerini desteklemiyor.");
        return;
    }

    // Kullanıcının mevcut konumunu al
    navigator.geolocation.getCurrentPosition(position => {
        // Haritayı bu konumla başlat
        initializeMap(position);

        startPosition = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
        };

        // Rota dizisini temizle ve başlangıç noktasını ekle
        userPath = [[startPosition.lat, startPosition.lng]];

        // Başlangıç noktasına bir işaretçi koy
        if(startMarker) map.removeLayer(startMarker);
        startMarker = L.marker([startPosition.lat, startPosition.lng]).addTo(map)
            .bindPopup('<b>Başlangıç Noktası</b>').openPopup();

        // Rota için boş bir polyline oluştur
        pathPolyline = L.polyline(userPath, { color: 'blue' }).addTo(map);

        isTracking = true;
        startButton.disabled = true;
        
        // Konum değişikliklerini izlemeye başla
        watchId = navigator.geolocation.watchPosition(updatePosition, handleError, {
            enableHighAccuracy: true,
            timeout: 5000,
            maximumAge: 0
        });

    }, handleError);
});

// Konum her değiştiğinde çalışacak fonksiyon
function updatePosition(position) {
    if (!isTracking) return;

    const newCoord = [position.coords.latitude, position.coords.longitude];
    
    // Yeni koordinatı rota dizisine ekle
    userPath.push(newCoord);
    
    // Haritadaki çizgiyi güncelle
    pathPolyline.addLatLng(newCoord);
    
    // Haritayı kullanıcının yeni konumuna ortala
    map.panTo(newCoord);

    // Başlangıç noktasına yeterince yaklaşıldı mı kontrol et
    const distanceToStart = map.distance(newCoord, [startPosition.lat, startPosition.lng]);
    
    // Örneğin 20 metreden daha yakınsa bitirme butonunu aktif et
    if (distanceToStart < 20) {
        finishButton.disabled = false;
    } else {
        finishButton.disabled = true;
    }
}

// Turu bitirme fonksiyonu
finishButton.addEventListener('click', () => {
    if (!isTracking) return;

    // Takibi durdur
    navigator.geolocation.clearWatch(watchId);
    isTracking = false;

    // Çizgiyi kaldır
    map.removeLayer(pathPolyline);
    
    // Rotanın kapalı alanını (polygon) oluştur ve haritaya ekle
    const areaPolygon = L.polygon(userPath, { color: 'red', fillColor: '#f03', fillOpacity: 0.5 }).addTo(map);

    // Haritayı oluşturulan alana sığdır
    map.fitBounds(areaPolygon.getBounds());

    alert("Tebrikler! Alanınız başarıyla işaretlendi.");

    // Butonları başlangıç durumuna getir
    startButton.disabled = false;
    finishButton.disabled = true;
});

// Konum alırken hata olursa çalışacak fonksiyon
function handleError(error) {
    console.error(`HATA(${error.code}): ${error.message}`);
    alert("Konum bilgisi alınamadı. Lütfen tarayıcınızdan konum izni verdiğinizden emin olun.");
}