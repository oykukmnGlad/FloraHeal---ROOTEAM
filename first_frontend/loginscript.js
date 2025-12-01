// GLOBAL DEĞİŞKEN
let profilePicData = ""; 

// 1. PROFİL RESMİ SEÇİLİNCE ÇALIŞAN KOD
// (Eğer bu element yoksa hata vermemesi için if kontrolü ekledim)
const avatarInput = document.getElementById('avatarInput');
if (avatarInput) {
    avatarInput.addEventListener('change', function(event) {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                profilePicData = e.target.result;
            };
            reader.readAsDataURL(file);
        }
    });
}

// 2. NORMAL GİRİŞ YAP BUTONUNA BASINCA ÇALIŞAN KOD
document.getElementById('loginForm').addEventListener('submit', function(event) {
    event.preventDefault(); 

    const username = document.getElementById('username').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const errorDiv = document.getElementById('errorMsg');

    if(username === "" || email === "" || password === "") {
        errorDiv.style.display = "block";
        errorDiv.textContent = "Lütfen zorunlu alanları doldurunuz.";
    } else {
        errorDiv.style.display = "none";
        
        localStorage.setItem('currentUser', username);

        if (profilePicData !== "") {
            localStorage.setItem('userAvatar', profilePicData);
        } else {
            localStorage.removeItem('userAvatar'); 
        }

        alert("Giriş başarılı! Yönlendiriliyorsunuz...");
        window.location.href = "index.html";
    }
});

// ---------------------------------------------------------
// 3. GOOGLE GİRİŞ FONKSİYONU (EN DIŞTA VE BAĞIMSIZ OLMALI)
// ---------------------------------------------------------
function googleLogin() {
    console.log("Google butonuna basıldı!"); // Kontrol için

    // Simülasyon Kullanıcısı
    const googleUser = {
        name: "Ahmet (Google)", 
        email: "ahmet.efe@gmail.com",
        // Google logosunu geçici profil resmi yapalım
        avatar: "https://upload.wikimedia.org/wikipedia/commons/5/53/Google_%22G%22_Logo.svg" 
    };

    // Bilgileri Kaydet
    localStorage.setItem('currentUser', googleUser.name);
    localStorage.setItem('userAvatar', googleUser.avatar);

    // Mesaj ver ve yönlendir
    alert("Google ile bağlanıldı: " + googleUser.name);
    window.location.href = "index.html";
}