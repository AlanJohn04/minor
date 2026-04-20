const express = require("express");
const router = express.Router();
const { db } = require("../firebase");

router.get("/", async (req, res) => {
  try {
    const scansSnapshot = await db.collection("scans")
      .orderBy("time", "desc")
      .limit(10)
      .get();
      
    const scans = [];
    scansSnapshot.forEach(doc => {
      scans.push(doc.data());
    });
    
    res.json(scans);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
