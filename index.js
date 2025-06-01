import fetch from "node-fetch";

const TOKEN = "BOT_TOKEN";
const ADMIN_IDS = ["7904914145","0987654321"];
const API = `https://api.telegram.org/bot${TOKEN}`;

let forbiddenWords = [];

export default async (req, res) => {
  if (req.method !== "POST") return res.status(405).end();
  const update = req.body;
  if (!update.message) return res.status(200).end();

  const msg = update.message;
  const chatId = msg.chat.id;
  const messageId = msg.message_id;
  const userId = msg.from.id.toString();
  const userFirstName = msg.from.first_name || "Unknown";
  const userLastName = msg.from.last_name || "";
  const userFullName = `${userFirstName} ${userLastName}`.trim();
  const userText = msg.text || "Media/Sticker";
  const chatTitle = msg.chat.title || "Private Chat";
  const chatType = msg.chat.type;
  const chatTypeLabel = chatType === "private" ? "Private Chat" : chatType === "group" ? "Group" : chatType === "supergroup" ? "Supergroup" : "Channel";
  const text = (userText).toLowerCase().normalize("NFKD").replace(/\p{Diacritic}/gu, "");
  const isAdmin = ADMIN_IDS.includes(userId);

  if (text.startsWith("/add ") && isAdmin) {
    const word = text.slice(5).trim();
    if (word && !forbiddenWords.includes(word)) {
      forbiddenWords.push(word);
      await send(chatId, `✅ Added forbidden word: \`${word}\``, messageId);
    } else {
      await send(chatId, `⚠️ Word already exists or invalid.`, messageId);
    }
    return res.status(200).end();
  }

  if (text.startsWith("/remove ") && isAdmin) {
    const word = text.slice(8).trim();
    forbiddenWords = forbiddenWords.filter(w => w !== word);
    await send(chatId, `🗑️ Removed forbidden word: \`${word}\``, messageId);
    return res.status(200).end();
  }

  if (text.startsWith("/list") && isAdmin) {
    const list = forbiddenWords.length ? forbiddenWords.map(w => `\`${w}\``).join(", ") : "_No forbidden words_";
    await send(chatId, `📃 Forbidden words:\n${list}`, messageId, "Markdown");
    return res.status(200).end();
  }

  if (isAdmin || !text) return res.status(200).end();

  for (const word of forbiddenWords) {
    const w = word.toLowerCase().normalize("NFKD").replace(/\p{Diacritic}/gu, "");
    if (text.includes(w)) {
      await deleteMsg(chatId, messageId);

      for (const adminId of ADMIN_IDS) {
        if (!adminId.startsWith("-")) {
          const notifyText = `🚫 *Message Deleted*\n\n👤 User: [${userFullName}](tg://user?id=${userId})\n🆔 User ID: \`${userId}\`\n\n🗨️ Message: \`${userText}\`\n\n🏷️ Group: *${chatTitle}*\n🆔 Group ID: \`${chatId}\`\n📂 Type: *${chatTypeLabel}*`;
          await send(adminId, notifyText, null, "Markdown");
        }
      }

      return res.status(200).end();
    }
  }

  return res.status(200).end();
};

async function send(chat_id, text, reply_to_message_id = null, parse_mode = "Markdown") {
  const body = { chat_id, text, parse_mode };
  if (reply_to_message_id) body.reply_to_message_id = reply_to_message_id;
  await fetch(`${API}/sendMessage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function deleteMsg(chat_id, message_id) {
  await fetch(`${API}/deleteMessage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ chat_id, message_id }),
  });
}
