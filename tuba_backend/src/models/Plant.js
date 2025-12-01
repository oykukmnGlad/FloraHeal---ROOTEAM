// models/Plant.js
const mongoose = require("mongoose");

/**
 * Schema for a single plant that belongs to a user.
 * This is NOT daily like water/fertilizer entry.
 * The user can add a plant once and see it later in "My Plants".
 */
const plantSchema = new mongoose.Schema(
  {
    // Which user owns this plant
    userId: {
      type: String,
      required: true,
      index: true,
    },

    // Main display name of the plant (what the user sees in the list)
    name: {
      type: String,
      required: true,
      trim: true,
    },

    // Optional: species / type (e.g. "Monstera deliciosa", "Aloe vera")
    species: {
      type: String,
      trim: true,
    },

    // Optional: a cute nickname given by the user (e.g. "Mini Monster")
    nickname: {
      type: String,
      trim: true,
    },

    // Optional: where the plant is located (e.g. "Living room window")
    location: {
      type: String,
      trim: true,
    },

    // Optional: free text notes about this plant
    notes: {
      type: String,
      trim: true,
    },
  },
  {
    // Adds createdAt and updatedAt automatically
    timestamps: true,
  }
);

module.exports = mongoose.model("Plant", plantSchema);
