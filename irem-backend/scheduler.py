import time
import requests
from datetime import datetime

URL = "http://127.0.0.1:8000/check-reminders"

print("🤖 ROBOT İŞ BAŞI YAPTI...")


# Sonsuz Döngü (Kapatana kadar çalışır)
while True:
    try:
        # Şu anki saati al
        saat = datetime.now().strftime("%H:%M:%S")
        
        # 1. İstek At (GET)
        response = requests.get(URL)
        
        # 2. Cevabı Kontrol Et
        if response.status_code == 200:
            veri = response.json()
            
            # Eğer 'detay' listesi doluysa, mail atılmış demektir
            if "detay" in veri and veri["detay"]:
                print(f"[{saat}] 🚀 AKSİYON: {len(veri['detay'])} adet mail gönderildi!")
                print(f"   -> {veri['detay']}")
                print("-" * 30)
            else:
                print(f"[{saat}] 💤 Sakin: Sulanacak bitki yok.")
        else:
            print(f"[{saat}] ❌ Hata: Backend cevap vermiyor! Kod: {response.status_code}")

    except Exception as e:
        print(f"⚠️ BAĞLANTI KOPTU! Backend (uvicorn) çalışıyor mu?")
        print(f"   Hata: {e}")

    # 3.
    time.sleep(86400)