const express = require("express");
const router = express.Router();
const { db } = require("../firebase");

// Simple distance check (approx)
function isNearDestination(lat1, lng1, lat2, lng2) {
  const threshold = 0.01; // ~1km
  return Math.abs(lat1 - lat2) < threshold && Math.abs(lng1 - lng2) < threshold;
}

router.post("/", async (req, res) => {
  console.log(">>> POST /api/scan received:", JSON.stringify(req.body));
  try {
    const body = req.body;
    const busRef = db.collection("bus_status").doc("BUS101");

    // Fetch existing data for merge fallback
    let existingData = global.latestBusData;
    if (!existingData) {
      const busDoc = await busRef.get();
      existingData = busDoc.exists ? busDoc.data() : { passenger_count: 0, location: { lat: 0, lng: 0 }, speed: 0 };
    }

    const qr = body.qr || "BUS_UPDATE";
    const lat = body.lat !== undefined ? body.lat : (existingData.location?.lat || 0);
    const lng = body.lng !== undefined ? body.lng : (existingData.location?.lng || 0);
    const passengerCount = (body.count !== undefined) ? body.count : ((body.passenger_count !== undefined) ? body.passenger_count : (existingData.passenger_count || 0));
    const speed = body.speed !== undefined ? body.speed : (existingData.speed || 0);

    // If it's a hardware update (no qr field, or qr is BUS_UPDATE)
    if (qr === "BUS_UPDATE") {
      const updateObj = {
        passenger_count: passengerCount,
        location: { lat, lng },
        speed: speed,
        last_updated: new Date()
      };
      
      // Update cache
      global.latestBusData = updateObj;

      // Update Firestore (non-blocking for hardware speed)
      busRef.set(updateObj, { merge: true }).catch(e => console.error("Firebase sync delayed:", e.message));
      
      console.log(`>>> SYNC OK: count=${passengerCount}, lat=${lat}, lng=${lng}, speed=${speed}`);
      return res.json({ status: "SUCCESS", action: "SYNC" });
    }

    // Otherwise, handle it as a QR scan from the webapp
    const [userId, from, to] = qr.split("|");
    const ticketRef = db.collection("tickets").doc(userId || "GUEST");
    const ticketDoc = await ticketRef.get();

    let action = "UNKNOWN";
    let warning = "";

    if (ticketDoc.exists) {
      const ticket = ticketDoc.data();
      if (ticket.status === "NOT_USED") {
        action = "ENTRY";
        await ticketRef.update({ status: "IN_PROGRESS" });
      } else if (ticket.status === "IN_PROGRESS") {
        action = "EXIT";
        await ticketRef.update({ status: "COMPLETED" });
      }
    } else {
      action = "GUEST_SCAN";
    }

    // Update bus status
    await busRef.set({
      passenger_count: passengerCount,
      location: { lat, lng },
      last_updated: new Date()
    }, { merge: true });

    // Log the scan event
    await db.collection("scans").add({
      userId: userId || "GUEST",
      action,
      location: { lat, lng },
      time: new Date(),
      passenger_count: passengerCount
    });

    return res.json({
      status: "SUCCESS",
      action,
      warning
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;