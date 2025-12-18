
const mongoose = require("mongoose");
// Helper function to create a day key (YYYY-MM-DD)
function toDayKey(d) {
  const x = new Date(d || Date.now());
  const y = x.getUTCFullYear();
  const m = String(x.getUTCMonth() + 1).padStart(2, "0"); // 01–12
  const dd = String(x.getUTCDate()).padStart(2, "0");     // 01–31
  return `${y}-${m}-${dd}`; // "2025-11-29"
}

// Water + fertilizer record for a single plant on a single day
const entrySchema = new mongoose.Schema(
  {
    // The user who owns this record
    userId: { type: String, required: true, index: true },

// WHICH PLANT IT BELONGS TO    
  plantId: {
  type: String,      // We are using a plain String instead of ObjectId
  required: true,
  index: true,
  },
// Amount of water
    waterAmount: { type: Number, required: true, min: 0 },
// Amount of fertilizer
    fertilizerAmount: { type: Number, required: true, min: 0 },

    // The date this record belongs to
    date: { type: Date, default: Date.now },

    // String key like "2025-11-29" (for single daily record control)
    dayKey: { type: String, index: true },
  },
  {
    // Automatically generate createdAt and updatedAt fields
    timestamps: true,
  }
);

// Automatically generate dayKey before validation if it doesn't exist
entrySchema.pre("validate", function (next) {
  if (!this.dayKey) {
    this.dayKey = toDayKey(this.date || Date.now());
  }
  next();
});

// Ensure the combination of User + Plant + Day is unique
// This prevents the same user from entering more than 1 record for the same plant on the same day
entrySchema.index(
  { userId: 1, plantId: 1, dayKey: 1 },
  { unique: true }
);

module.exports = mongoose.model("Entry", entrySchema);

