const express = require("express");
const router = express.Router();
const { db } = require("../firebase");

// Simple distance check (approx)
function isNearDestination(lat1, lng1, lat2, lng2) {
  const threshold = 0.01; // ~1km
  return Math.abs(lat1 - lat2) < threshold && Math.abs(lng1 - lng2) < threshold;
}

router.post("/", async (req, res) => {
  try {
    const { qr, lat, lng } = req.body;

    const [userId, from, to] = qr.split("|");

    const ticketRef = db.collection("tickets").doc(userId);
    const busRef = db.collection("bus_status").doc("BUS101");

    const ticketDoc = await ticketRef.get();
    const busDoc = await busRef.get();

    if (!ticketDoc.exists) {
      return res.json({ status: "INVALID_TICKET" });
    }

    let passengerCount = busDoc.exists ? busDoc.data().passenger_count : 0;
    const ticket = ticketDoc.data();

    let action = "";
    let warning = "";

    // ENTRY
    if (ticket.status === "NOT_USED") {
      action = "ENTRY";
      passengerCount++;

      await ticketRef.update({ status: "IN_PROGRESS" });

    // EXIT
    } else if (ticket.status === "IN_PROGRESS") {

      // get destination coordinates
      const destDoc = await db.collection("stops").doc(to).get();

      if (destDoc.exists) {
        const dest = destDoc.data();

        if (isNearDestination(lat, lng, dest.lat, dest.lng)) {
          action = "EXIT";
          passengerCount--;

          await ticketRef.update({ status: "COMPLETED" });
        } else {
          warning = "WRONG_STOP_EXIT";
        }
      } else {
        warning = "DEST_NOT_FOUND";
      }

    } else {
      return res.json({ status: "ALREADY_USED" });
    }

    // Update bus status
    await busRef.set({
      passenger_count: passengerCount,
      location: { lat, lng },
      last_updated: new Date()
    });

    // Log scan
    await db.collection("scans").add({
      userId,
      from,
      to,
      action,
      lat,
      lng,
      warning,
      time: new Date()
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