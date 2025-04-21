const express = require("express");
const axios = require("axios");
const cheerio = require("cheerio");
const cors = require("cors");

const app = express();
app.use(cors());

async function getUserId(username) {
    const res = await axios.post(
        "https://users.roblox.com/v1/usernames/users",
        { usernames: [username], excludeBannedUsers: true },
        { headers: { "Content-Type": "application/json" } }
    );

    if (!res.data || !res.data.data || res.data.data.length === 0) {
        throw new Error("User not found");
    }

    return res.data.data[0].id;
}

async function getGamepasses(username) {
    const userId = await getUserId(username);
    const storeUrl = `https://www.roblox.com/users/${userId}/creations?view=store`;
    const storePage = await axios.get(storeUrl);
    const $ = cheerio.load(storePage.data);
    const passes = [];

    $(".store-card").each((i, el) => {
        const name = $(el).find(".text-name").text().trim();
        const href = $(el).find("a").attr("href");
        const id = href ? href.split("/")[2] : null;
        const priceText = $(el).find(".text-robux").text().replace(/[^\d]/g, "");
        const price = parseInt(priceText || "0");

        if (id && name) {
            passes.push({ id, name, price });
        }
    });

    return passes;
}

app.get("/gamepasses", async (req, res) => {
    const { username } = req.query;

    if (!username) {
        return res.status(400).send("Missing 'username' query parameter");
    }

    try {
        const passes = await getGamepasses(username);
        res.json(passes);
    } catch (err) {
        res.status(500).send("Failed to fetch gamepasses: " + err.message);
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log("Server running on port " + PORT);
});
