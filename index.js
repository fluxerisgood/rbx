const express = require("express");
const axios = require("axios");
const cheerio = require("cheerio");
const cors = require("cors");

const app = express();
app.use(cors());

async function getUserId(username) {
    console.log(`🔍 Looking up user ID for: ${username}`);
    const res = await axios.post(
        "https://users.roblox.com/v1/usernames/users",
        { usernames: [username], excludeBannedUsers: true },
        { headers: { "Content-Type": "application/json" } }
    );

    if (!res.data || !res.data.data || res.data.data.length === 0) {
        throw new Error("User not found");
    }

    const id = res.data.data[0].id;
    console.log(`✅ Found userId: ${id}`);
    return id;
}

async function scrapeGamepassesFromStore(userId) {
    console.log(`🧽 Scraping store page for userId: ${userId}`);
    const storeUrl = `https://www.roblox.com/users/${userId}/creations?view=store`;
    const res = await axios.get(storeUrl);
    const $ = require("cheerio").load(res.data);
    const gamepasses = [];

    $(".store-card").each((_, el) => {
        const name = $(el).find(".text-name").text().trim();
        const href = $(el).find("a").attr("href");
        const idMatch = href ? href.match(/catalog\/(\d+)/) : null;
        const id = idMatch ? idMatch[1] : null;
        const priceText = $(el).find(".text-robux").text().trim();
        const price = parseInt(priceText.replace(/[^\d]/g, "")) || 0;

        if (id && name) {
            gamepasses.push({ id, name, price });
        }
    });

    return gamepasses;
}

app.get("/gamepasses", async (req, res) => {
    const { username } = req.query;

    if (!username) {
        return res.status(400).send("Missing 'username' query parameter");
    }

    try {
        const userId = await getUserId(username);
        const passes = await scrapeGamepassesFromStore(userId);
        res.json(passes);
    } catch (err) {
        console.error("❌ Failed to fetch gamepasses:", err.message);
        res.status(500).send("Failed to fetch gamepasses: " + err.message);
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});
