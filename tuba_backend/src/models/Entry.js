
const mongoose = require("mongoose");

// Günün key'ini (YYYY-MM-DD) oluşturan helper
function toDayKey(d) {
  const x = new Date(d || Date.now());
  const y = x.getUTCFullYear();
  const m = String(x.getUTCMonth() + 1).padStart(2, "0"); // 01–12
  const dd = String(x.getUTCDate()).padStart(2, "0");     // 01–31
  return `${y}-${m}-${dd}`; // "2025-11-29"
}

// Tek bir gün için, tek bir bitkiye ait su + gübre kaydı
const entrySchema = new mongoose.Schema(
  {
    // Bu kaydın sahibi olan kullanıcı
    userId: { type: String, required: true, index: true },

    // ⭐ HANGİ BİTKİYE AİT OLDUĞU
    plantId: {
  type: String,      // ObjectId yerine düz String tutuyoruz
  required: true,
  index: true,
  },

    // Su miktarı
    waterAmount: { type: Number, required: true, min: 0 },

    // Gübre miktarı
    fertilizerAmount: { type: Number, required: true, min: 0 },

    // Bu kaydın ait olduğu tarih
    date: { type: Date, default: Date.now },

    // "2025-11-29" gibi string key (günlük tek kayıt kontrolü için)
    dayKey: { type: String, index: true },
  },
  {
    // createdAt ve updatedAt otomatik gelsin
    timestamps: true,
  }
);

// Kayıt validate edilmeden önce dayKey yoksa otomatik üret
entrySchema.pre("validate", function (next) {
  if (!this.dayKey) {
    this.dayKey = toDayKey(this.date || Date.now());
  }
  next();
});

// ⭐ Kullanıcı + bitki + gün benzersiz olsun
// Yani aynı kullanıcı aynı bitki için bir günde sadece 1 kayıt girebilsin
entrySchema.index(
  { userId: 1, plantId: 1, dayKey: 1 },
  { unique: true }
);

module.exports = mongoose.model("Entry", entrySchema);

