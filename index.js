const express = require("express");
const axios = require("axios");
const cheerio = require("cheerio");
const cors = require("cors");

const app = express();
app.use(cors());

async function getUserId(username) {
    const res = await axios.post(
        "https://users.roblox.com/v1/usernames/users",
        { usernames: [username] },
        { headers: { "Content-Type": "application/json" } }
    );

    if (!res.data || !res.data.data || res.data.data.length === 0) {
        throw new Error("User not found");
    }

    return res.data.data[0].id;
}


async function scrapeGamepassesFromStore(userId) {
    const storeUrl = `https://www.roblox.com/users/${userId}/creations?view=store`;
    console.log("🔗 Scraping URL:", storeUrl);

    try {
        const res = await axios.get(storeUrl, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
            }
        });

        const $ = cheerio.load(res.data);
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

        console.log(`✅ Scraped ${gamepasses.length} gamepasses`);
        return gamepasses;
    } catch (err) {
        console.error("❌ Error scraping store page:", err.message);
        throw new Error("Failed to load store page: " + err.message);
    }
}

app.get("/gamepasses", async (req, res) => {
    const { username } = req.query;

    if (!username) {
        return res.status(400).send("Missing username");
    }

    try {
        console.log(`🔍 Looking up user ID for: ${username}`);
        const userId = await getUserId(username);
        console.log(`✅ Found userId: ${userId}`);

        console.log(`🧽 Scraping store page for userId: ${userId}`);
        const passes = await scrapeGamepassesFromStore(userId);
        res.json(passes);
    } catch (err) {
        console.error("❌ Failed to fetch gamepasses:", err.message);
        res.status(500).send("Failed to fetch gamepasses: " + err.message);
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});
