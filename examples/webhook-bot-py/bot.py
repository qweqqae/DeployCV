import os

import requests
from dotenv import load_dotenv
from flask import Flask, request

load_dotenv()

app = Flask(__name__)
TOKEN = os.environ.get("BOT_TOKEN", "")
SECRET = os.environ.get("WEBHOOK_SECRET", "")
WEB_APP_URL = os.environ.get("WEB_APP_URL", "")
PORT = int(os.environ.get("PORT", "8080"))


@app.post("/telegram/webhook")
def telegram_webhook():
    if request.headers.get("X-Telegram-Bot-Api-Secret-Token") != SECRET:
        return "", 403

    update = request.get_json(silent=True) or {}
    message = update.get("message") or {}
    if message.get("text") == "/start" and TOKEN:
        chat_id = message["chat"]["id"]
        payload = {
            "chat_id": chat_id,
            "text": "Open the portfolio mini app from the menu button.",
        }
        if WEB_APP_URL:
            payload["reply_markup"] = {
                "inline_keyboard": [[
                    {"text": "Open app", "web_app": {"url": WEB_APP_URL}},
                ]],
            }
        requests.post(
            f"https://api.telegram.org/bot{TOKEN}/sendMessage",
            json=payload,
            timeout=30,
        )

    return {"ok": True}


@app.get("/health")
def health():
    return "ok", 200


if __name__ == "__main__":
    if not TOKEN or not SECRET:
        raise SystemExit("BOT_TOKEN and WEBHOOK_SECRET are required")
    app.run(host="0.0.0.0", port=PORT)
