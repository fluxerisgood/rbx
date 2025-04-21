const express = require("express");
const axios = require("axios");
const cheerio = require("cheerio");
const cors = require("cors");

const app = express();
app.use(cors());

// ✅ Uses official, modern Roblox API — works on Render
async function getUserId(username) {
    const res = await axios.post("https://users.roblox.com/v1/usernames/users", {
        usernames: [username],
        excludeBannedUsers: true
    });
    if (!res.data || res.data.data.length === 0) {
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
        const id = $(el).find("a").attr("href").split("/")[2];
        const price = parseInt($(el).find(".text-robux").text().replace(/[^\d]/g, ""));
        passes.push({ id, name, price });
    });

    return passes;
}

app.get("/gamepasses", async (req, res) => {
    const { username } = req.query;
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
