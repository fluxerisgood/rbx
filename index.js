const express = require("express");
const axios = require("axios");
const cors = require("cors");

const app = express();
app.use(cors());

async function getUserId(username) {
    console.log(`🔍 Getting user ID for ${username}`);
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

async function getUserGames(userId) {
    console.log(`🎮 Getting games for userId: ${userId}`);
    const res = await axios.get(`https://games.roblox.com/v2/users/${userId}/games?accessFilter=2&sortOrder=Asc&limit=10`);
    const gameIds = res.data.data.map(game => game.id);
    console.log(`✅ Found games: ${gameIds.join(", ")}`);
    return gameIds;
}

async function getGamepasses(username) {
    const userId = await getUserId(username);
    const gameIds = await getUserGames(userId);
    const gamepasses = [];

    for (const gameId of gameIds) {
        console.log(`🛍️ Fetching gamepasses for gameId: ${gameId}`);
        const res = await axios.get(`https://games.roblox.com/v1/games/${gameId}/game-passes`);
        const passes = res.data.data.map(pass => ({
            id: pass.id,
            name: pass.name,
            price: pass.price || 0
        }));
        console.log(`✅ Found ${passes.length} passes`);
        gamepasses.push(...passes);
    }

    return gamepasses;
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
        console.error("❌ Error fetching gamepasses:", err.message);
        res.status(500).send("Failed to fetch gamepasses: " + err.message);
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});
