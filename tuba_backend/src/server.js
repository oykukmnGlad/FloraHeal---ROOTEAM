// src/server.js
require("dotenv").config();
const mongoose = require("mongoose");
const express = require("express");




const app = express();
app.use(express.json());
const cors = require("cors");
 app.use(cors());

// Model
const Entry = require("./models/Entry");

// Test endpointi
app.get("/", (req, res) => {
  res.send("Backend çalışıyor 🚀");
});

// MongoDB bağlantısı (dbName istersen sabitliyoruz)
mongoose
  .connect(process.env.MONGO_URI, { dbName: "floraheal" })
  .then(() => console.log("✅ MongoDB bağlantısı başarılı"))
  .catch((err) => console.error("❌ MongoDB bağlantı hatası:", err));
  // Eğer bağlantı sonrası index’leri otomatik oluşturmak i
mongoose.set("strictQuery", true);

// API

// Su + gübre kaydı ekleme (POST)
// Su + gübre kaydı ekleme (aynı güne tek kayıt olacak şekilde UPSERT)
// Su + gübre kaydı ekleme (BITKİYE ÖZEL, günde 1 kayıt)
app.post("/api/entries", async (req, res) => {
  try {
    // ⭐ plantId'yi de body'den alıyoruz
    const { userId, plantId, waterAmount, fertilizerAmount, date } = req.body;

    // Zorunlu alan kontrolleri
    if (!userId || !plantId || waterAmount == null || fertilizerAmount == null) {
      return res
        .status(400)
        .json({
          error: "userId, plantId, waterAmount, fertilizerAmount zorunlu",
        });
    }

    // Tarih yoksa bugünü kullan
    const d = date ? new Date(date) : new Date();
    const dayKey = d.toISOString().slice(0, 10); // YYYY-MM-DD

    // ⭐ Aynı kullanıcı + aynı bitki + aynı gün varsa GÜNCELLE, yoksa OLUŞTUR
    const doc = await Entry.findOneAndUpdate(
      { userId, plantId, dayKey },
      {
        userId,
        plantId,
        waterAmount: Number(waterAmount),
        fertilizerAmount: Number(fertilizerAmount),
        date: d,
        dayKey,
      },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
      }
    );

    res.status(201).json(doc);
  } catch (err) {
    // Unique index çakışırsa (index: userId+plantId+dayKey)
    if (err.code === 11000) {
      return res
        .status(409)
        .json({ error: "Bu bitki için bugün zaten bir kayıt var" });
    }

    console.error("POST /api/entries error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// Kullanıcının geçmiş verilerini alma (GET)
app.get("/api/entries/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const { from, to } = req.query; // opsiyonel tarih filtresi

    const q = { userId };
    if (from || to) {
      q.date = {};
      if (from) q.date.$gte = new Date(from);
      if (to) q.date.$lte = new Date(to);
    }

    const list = await Entry.find(q).sort({ date: -1 });
    res.json(list);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});
// Bugünün kaydı (tek kayıt)
app.get("/api/entries/:userId/today", async (req, res) => {
  const { userId } = req.params;
  const dayKey = new Date().toISOString().slice(0, 10);
  const doc = await Entry.findOne({ userId, dayKey });
  res.json(doc || null);
});
// Özet: son X gün toplamları (default 7)
app.get("/api/entries/:userId/summary", async (req, res) => {
  try {
    const { userId } = req.params;
    const days = Number(req.query.days || 7);
    const from = new Date(Date.now() - (days - 1) * 24 * 60 * 60 * 1000);

    const rows = await Entry.aggregate([
      { $match: { userId, date: { $gte: from } } },
      {
        $group: {
          _id: "$dayKey",
          totalWater: { $sum: "$waterAmount" },
          totalFertilizer: { $sum: "$fertilizerAmount" },
          date: { $first: "$date" }
        }
      },
      { $sort: { date: 1 } }
    ]);

    const totals = rows.reduce(
      (acc, r) => ({
        water: acc.water + r.totalWater,
        fert: acc.fert + r.totalFertilizer,
      }),
      { water: 0, fert: 0 }
    );

    res.json({ periodDays: days, totals, days: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});


// Kayıt güncelle (PATCH)
app.patch("/api/entries/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const updates = {};
    if (req.body.waterAmount != null) updates.waterAmount = Number(req.body.waterAmount);
    if (req.body.fertilizerAmount != null) updates.fertilizerAmount = Number(req.body.fertilizerAmount);
    if (req.body.date) updates.date = new Date(req.body.date);

    const updated = await Entry.findByIdAndUpdate(id, updates, { new: true });
    if (!updated) return res.status(404).json({ error: "Kayıt bulunamadı" });

    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// Kayıt sil (DELETE)
app.delete("/api/entries/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Entry.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ error: "Kayıt bulunamadı" });
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// ===================== PLANTS API =====================

// Add a new plant for a user (POST)
// Body example:
// {
//   "userId": "123",
//   "name": "Aloe vera",
//   "species": "Aloe vera",
//   "nickname": "Sunny",
//   "location": "Bedroom window",
//   "notes": "Likes bright indirect light"
// }
app.post("/api/plants", async (req, res) => {
  try {
    const { userId, name, species, nickname, location, notes } = req.body;

    if (!userId || !name) {
      return res
        .status(400)
        .json({ error: "userId and name are required fields" });
    }

    const plant = await Plant.create({
      userId,
      name,
      species,
      nickname,
      location,
      notes,
    });

    res.status(201).json(plant);
  } catch (err) {
    console.error("POST /api/plants error:", err);
    res.status(500).json({ error: "Server error" });
  }
});


// Model

const Plant = require("./models/Plant"); // NEW: plant model

// Add a new plant for a user (POST)
app.post("/api/plants", async (req, res) => {
  try {
    const { userId, name, species, nickname, location, notes } = req.body;

    if (!userId || !name) {
      return res
        .status(400)
        .json({ error: "userId and name are required fields" });
    }

    const plant = await Plant.create({
      userId,
      name,
      species,
      nickname,
      location,
      notes,
    });

    res.status(201).json(plant);
  } catch (err) {
    console.error("POST /api/plants error:", err);
    res.status(500).json({ error: "Server error" });
  }
});


// Get all plants for a user (GET)
// Example: GET /api/plants?userId=123
app.get("/api/plants", async (req, res) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: "userId query param is required" });
    }

    const plants = await Plant.find({ userId }).sort({ createdAt: 1 }).lean();

    res.json(plants);
  } catch (err) {
    console.error("GET /api/plants error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// Optional: delete a plant by id (for future "remove plant" feature)
// DELETE /api/plants/:id
app.delete("/api/plants/:id", async (req, res) => {
  try {
    const { id } = req.params;

    await Plant.findByIdAndDelete(id);

    res.json({ message: "Plant deleted" });
  } catch (err) {
    console.error("DELETE /api/plants/:id error:", err);
    res.status(500).json({ error: "Server error" });
  }
});




const PORT = 4000; // sabit 4000 kullan

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

