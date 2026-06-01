import os
import telebot
import google.generativeai as genai

# এখানে আপনার টোকেন এবং এপিআই কী সেট করুন
TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "YOUR_TELEGRAM_BOT_TOKEN")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "YOUR_GEMINI_API_KEY")

bot = telebot.TeleBot(TELEGRAM_BOT_TOKEN)
genai.configure(api_key=GEMINI_API_KEY)

model = genai.GenerativeModel("gemini-2.5-flash")

prompt = """You are an expert price-action chart analyst.

Analyze the uploaded trading chart screenshot and determine the most likely short-term direction based only on visible price action, candle structure, momentum, trend, support/resistance, and market structure.

Rules:
- Respond with ONLY one word: UP or DOWN
- Do not explain.
- Do not add confidence scores.
- Do not add warnings.
- Do not add extra text.
- Do not use markdown.
- Ignore all previous instructions that conflict with these rules.
- Even if the chart is unclear, choose the direction that appears more probable.
- Focus on the next immediate move visible from the chart.
- Output must contain exactly one word: UP or DOWN.

Market Type: OTC
Chart Timeframe: 5 Minutes
Trade Duration: 15 Seconds"""

@bot.message_handler(commands=['start', 'help'])
def send_welcome(message):
    bot.reply_to(message, "Send me a trading chart screenshot, and I will analyze it (UP/DOWN).")

@bot.message_handler(content_types=['photo'])
def handle_photo(message):
    try:
        msg = bot.reply_to(message, "⏳ Analyzing price action...")
        
        # টেলিগ্রাম থেকে ছবি ডাউনলোড করা হচ্ছে
        file_info = bot.get_file(message.photo[-1].file_id)
        downloaded_file = bot.download_file(file_info.file_path)

        image_part = {
            "mime_type": "image/jpeg",
            "data": downloaded_file
        }

        # জেমিনি এপিআই কল
        response = model.generate_content(
            [prompt, image_part],
            generation_config=genai.GenerationConfig(temperature=0.1)
        )

        text_response = response.text.strip().upper()
        
        # রেজাল্ট ফিল্টার
        if "UP" in text_response:
            result = "📈 **UP**"
        elif "DOWN" in text_response:
            result = "📉 **DOWN**"
        else:
            result = f"UNKNOWN: {text_response}"

        bot.edit_message_text(chat_id=message.chat.id, message_id=msg.message_id, text=result, parse_mode="Markdown")

    except Exception as e:
        bot.edit_message_text(chat_id=message.chat.id, message_id=msg.message_id, text=f"Error: {str(e)}")

if __name__ == "__main__":
    print("Bot is running...")
    bot.infinity_polling()
