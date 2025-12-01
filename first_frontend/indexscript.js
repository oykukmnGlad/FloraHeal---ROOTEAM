// 1. SAYFA YÜKLENİNCE ÇALIŞACAKLAR (Profil ve İsim)
document.addEventListener("DOMContentLoaded", function() {
    // İsmi Getir
    const savedName = localStorage.getItem('currentUser');
    if (savedName) {
        // Hata almamak için önce element var mı diye kontrol edelim
        const nameElement = document.getElementById('profileName');
        if (nameElement) nameElement.textContent = savedName;
    }

    // Resmi Getir
    const savedAvatar = localStorage.getItem('userAvatar');
    if (savedAvatar) {
        const imgElement = document.getElementById('profileImage');
        if (imgElement) imgElement.src = savedAvatar;
    }
});

// 2. BİTKİ RESİMLERİ VERİSİ
const plantImages = [
    "https://images.unsplash.com/photo-1459411552884-841db9b3cc2a?w=400&q=80",
    "https://images.unsplash.com/photo-1485955900006-10f4d324d411?w=400&q=80",
    "https://images.unsplash.com/photo-1501004318641-b39e6451bec6?w=400&q=80",
    "https://images.unsplash.com/photo-1520412099551-62b6bafeb5bb?w=400&q=80",
    "https://images.unsplash.com/photo-1463936575829-25148e1db1b8?w=400&q=80"
];

const gallery = document.getElementById('plantGallery');
const emptyMsg = document.getElementById('emptyMsg');

// --- YENİ BİTKİ EKLEME FONKSİYONU ---
function addPlant() {
    if (emptyMsg) { emptyMsg.style.display = 'none'; }

    const card = document.createElement('div');
    card.className = 'plant-card';

    // Resim Seçimi
    const newImg = document.createElement('img');
    const randomIndex = Math.floor(Math.random() * plantImages.length);
    newImg.src = plantImages[randomIndex];
    newImg.className = 'card-img';

    // Rastgele İsim
    const isimler = ["Paşa Kılıcı", "Deve Tabanı", "Orkide", "Kaktüs", "Aloe Vera", "Begonya"];
    const rastgeleIsim = isimler[Math.floor(Math.random() * isimler.length)];

    const infoDiv = document.createElement('div');
    infoDiv.className = 'card-info';
    
    // HTML Yapısı: Hem Su hem Gübre durumu var
    infoDiv.innerHTML = `
        <h4>${rastgeleIsim}</h4>
        
        <div class="status-row">
            <p>💧 Su: <span class="water-stat" style="color:orange">Eksik</span></p>
            <p>💊 Gübre: <span class="fert-stat" style="color:orange">Eksik</span></p>
        </div>

        <div class="btn-group">
            <button onclick="waterPlant(this)" class="btn-water">Sula</button>
            <button onclick="fertilizePlant(this)" class="btn-fert">Gübrele</button>
        </div>
    `;

    card.appendChild(newImg);
    card.appendChild(infoDiv);
    gallery.appendChild(card);
}

// --- SULAMA FONKSİYONU ---
function waterPlant(btn) {
    const card = btn.closest('.card-info'); 
    const span = card.querySelector('.water-stat');
    
    // Eğer butonun üzerinde "Sula" yazıyorsa işlemi yap
    if (btn.innerText === "Sula") {
        span.innerText = 'Tamam 💙';
        span.style.color = '#2196F3'; // Mavi
        
        // Butonu "Geri Al" moduna çevir
        btn.innerText = "Geri Al";
        btn.classList.add('btn-undo'); // Gri renk için sınıf ekle
    } 
    // Eğer "Geri Al" yazıyorsa işlemi geri al (Undo)
    else {
        span.innerText = 'Eksik';
        span.style.color = 'orange';
        
        // Butonu eski haline çevir
        btn.innerText = "Sula";
        btn.classList.remove('btn-undo');
    }
}

// --- GÜBRELEME FONKSİYONU ---
function fertilizePlant(btn) {
    const card = btn.closest('.card-info'); 
    const span = card.querySelector('.fert-stat');
    
    if (btn.innerText === "Gübrele") {
        span.innerText = 'Verildi 🤎';
        span.style.color = '#795548'; // Kahverengi
        
        btn.innerText = "Geri Al";
        btn.classList.add('btn-undo');
    } else {
        span.innerText = 'Eksik';
        span.style.color = 'orange';
        
        btn.innerText = "Gübrele";
        btn.classList.remove('btn-undo');
    }
}

// 4. BİTKİ SİLME FONKSİYONU
function removePlant() {
    const lastPlant = gallery.lastElementChild;
    // emptyMsg id'li yazı silinmesin diye kontrol ediyoruz
    if (lastPlant && lastPlant.id !== 'emptyMsg') {
        gallery.removeChild(lastPlant);
    } else {
        alert("Silinecek bitki yok!");
    }
    
    // Eğer sadece yazı kaldıysa onu görünür yap
    if (gallery.children.length === 1 && gallery.children[0].id === 'emptyMsg') {
        emptyMsg.style.display = 'block';
    }
}


// 6. GECE MODU (DARK MODE) FONKSİYONU - EN DIŞTA OLACAK
function toggleTheme() {
    console.log("Gece modu tıklandı!"); // Çalışıp çalışmadığını anlamak için
    document.body.classList.toggle("dark-mode");
}