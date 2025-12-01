// server.js
const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();
const PORT = 3000;

// Orijin sorunlarını engellemek için
app.use(cors());
app.use(express.json());

// Eğer ileride public klasöründen resim vs. servis etmek istersen:
// app.use("/public", express.static(path.join(__dirname, "public")));

// ---- VERİLERİ YÜKLE ----
const plants = require("./data/plants.json");
const treatments = require("./data/treatments.json");

// Küçük yardımcı: slug'dan bitki bul
function findPlantBySlug(slug) {
  return plants.find((p) => p.slug === slug);
}

// Küçük yardımcı: slug'dan tedavi key'ini bul
// 1) plant.treatmentKey varsa onu kullan
// 2) yoksa treatments.json anahtarları içinde Türkçe/İngilizce isme göre arama yap
function findTreatmentKeyForPlant(plant) {
  if (!plant) return null;

  // 1) Eğer bitkinin treatmentKey alanı varsa direkt onu kullan
  if (plant.treatmentKey) {
    if (treatments[plant.treatmentKey]) {
      return plant.treatmentKey;
    }
  }

  const trName = Array.isArray(plant.names?.tr) ? plant.names.tr[0] : plant.names?.tr;
  const enName = plant.names?.en;
  const keys = Object.keys(treatments);

  // 2) Tam Türkçe isim eşleşmesi
  if (trName) {
    const directTr = keys.find((k) => k === trName);
    if (directTr) return directTr;
  }

  // 3) Anahtar içinde Türkçe isim geçiyorsa (ör: "Sarmaşık (English Ivy – Hedera helix)")
  if (trName) {
    const containsTr = keys.find((k) => k.includes(trName));
    if (containsTr) return containsTr;
  }

  // 4) Anahtar içinde İngilizce isim geçiyorsa
  if (enName) {
    const containsEn = keys.find((k) => k.includes(enName));
    if (containsEn) return containsEn;
  }

  // Hiçbiri bulunamazsa null dön
  return null;
}

// ---- BASİT HEALTH CHECK ----
app.get("/", (req, res) => {
  res.send("FloraHeal backend ayakta 🌿");
});

// ---- TÜM BİTKİLER ----
// Örn: GET http://localhost:3000/api/plants
app.get("/api/plants", (req, res) => {
  res.json(plants);
});

// ---- TEK BİTKİ DETAY ----
// Örn: GET http://localhost:3000/api/plants/aloe-vera
app.get("/api/plants/:slug", (req, res) => {
  const slug = req.params.slug;
  const plant = findPlantBySlug(slug);

  if (!plant) {
    return res.status(404).json({ error: "Bitki bulunamadı" });
  }

  res.json(plant);
});

// ---- SADECE CARE (sulama, güneş, budama) ----
// Örn: GET http://localhost:3000/api/plants/aloe-vera/care
app.get("/api/plants/:slug/care", (req, res) => {
  const slug = req.params.slug;
  const plant = findPlantBySlug(slug);

  if (!plant) {
    return res.status(404).json({ error: "Bitki bulunamadı" });
  }

  // care alanı yoksa boş obje dön
  res.json(plant.care || {});
});

// ---- BİTKİ İÇİN SEÇİLEBİLİR HASTALIKLAR ----
// Örn: GET http://localhost:3000/api/plants/aloe-vera/issues
// Frontend burada checkbox listesi için kullanılabilir.
app.get("/api/plants/:slug/issues", (req, res) => {
  const slug = req.params.slug;
  const plant = findPlantBySlug(slug);

  if (!plant) {
    return res.status(404).json({ error: "Bitki bulunamadı" });
  }

  const treatmentKey = findTreatmentKeyForPlant(plant);

  if (!treatmentKey || !treatments[treatmentKey]) {
    return res.status(404).json({
      error: "Bu bitki için tedavi bilgisi bulunamadı",
    });
  }

  // Örn: ["root_rot", "leaf_yellowing", "mealybugs", ...]
  const issueKeys = Object.keys(treatments[treatmentKey]);

  res.json({
    treatmentKey, // frontend isterse başlıkta gösterebilir
    issues: issueKeys,
  });
});

// ---- BELİRLİ BİR HASTALIK İÇİN TEDAVİ METNİ ----
// Örn: GET http://localhost:3000/api/plants/aloe-vera/treatments/root_rot
app.get("/api/plants/:slug/treatments/:issueKey", (req, res) => {
  const { slug, issueKey } = req.params;
  const plant = findPlantBySlug(slug);

  if (!plant) {
    return res.status(404).json({ error: "Bitki bulunamadı" });
  }

  const treatmentKey = findTreatmentKeyForPlant(plant);

  if (!treatmentKey || !treatments[treatmentKey]) {
    return res.status(404).json({
      error: "Bu bitki için tedavi bilgisi bulunamadı",
    });
  }

  const plantTreatments = treatments[treatmentKey];
  const treatmentText = plantTreatments[issueKey];

  if (!treatmentText) {
    return res.status(404).json({
      error: "Bu hastalık için tedavi metni bulunamadı",
    });
  }

  res.json({
    plantSlug: slug,
    treatmentKey,
    issueKey,
    treatment: treatmentText,
  });
});

// ---- SERVER'I BAŞLAT ----
app.listen(PORT, () => {
  console.log(`Server ${PORT} portunda çalışıyor 🌱`);
});
