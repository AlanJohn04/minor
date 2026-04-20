const express = require("express");
const router = express.Router();
const { db } = require("../firebase");

router.get("/", async (req, res) => {
  console.log("GET /api/bus received");
  
  // Helper to wait with timeout
  const withTimeout = (promise, ms) => {
    return Promise.race([
      promise,
      new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), ms))
    ]);
  };

  try {
    // ZER0-LATENCY OVERRIDE: Pull instantly from local memory if available
    if (global.latestBusData) {
      return res.json(global.latestBusData);
    }

    const busDoc = await withTimeout(db.collection("bus_status").doc("BUS101").get(), 10000);
    console.log("Bus doc retrieved from Firestore");
    if (busDoc.exists) {
      res.json(busDoc.data());
    } else {
      res.json({ passenger_count: 0, location: { lat: 13.0827, lng: 80.2707 } });
    }
  } catch (err) {
    console.log("Using mock data due to error/timeout:", err.message);
    // Fallback to mock data for demonstration
    res.json({ 
      passenger_count: 12, 
      location: { lat: 13.0827, lng: 80.2707 },
      mock: true 
    });
  }
});

module.exports = router;