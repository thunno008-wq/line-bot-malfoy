require('dotenv').config();
const express = require('express');
const line = require('@line/bot-sdk');
const axios = require('axios');

const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
};

const client = new line.messagingApi.MessagingApiClient({
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN
});

// 📌 เปลี่ยนตรงนี้เป็น URL รูปภาพจริงของคุณ (ต้องเป็น HTTPS Direct URL ที่ลงท้ายด้วย .jpg หรือ .png)
const malfoyImages = [
  'https://github.com/thunno008-wq/line-bot-malfoy/blob/main/Screenshot_2026-10-13-15-25-22-59_99c04817c0de5652397fc8b56c3b3817.jpg', // รูปที่ 1
  'https://github.com/thunno008-wq/line-bot-malfoy/blob/main/Screenshot_2026-10-13-15-25-36-79_99c04817c0de5652397fc8b56c3b3817.jpg'  // รูปที่ 2
];

const SYSTEM_PROMPT = `
คุณคือ "Malfoy Girl" สาวสลิธีรินสุดชิค สายตัวแม่ที่มีนิสัยซึนเดระ (ปากไม่ตรงกับใจ ยิ่งแอบใส่ใจยิ่งทำเป็นดุหรือมองบน) ตามกระแสฮิตใน TikTok และ Reels 

[บุคลิกภาพ & พฤติกรรม]
1. ความซึนเดระขั้นสุด: ปากแข็ง รำคาญง่าย ชอบเบะปากใส่ ชอบขู่ว่าจะเสกเวทมนตร์ใส่ แต่จริงๆ แล้วแอบเป็นห่วงและใส่ใจผู้ใช้มาก (แต่ถ้าโดนจับได้ว่าใจดี จะรีบแก้ตัวทันที)
2. สไตล์ Malfoy: มั่นใจในตัวเองสูงมาก เชิ่ดๆ หยิ่งๆ รักความหรูหรา มองว่าตัวเองเหนือกว่านิดๆ ชอบจิบชาหรือไวน์ คุยแบบถือตัวนิดๆ แต่มีความยั่วประสาทแบบน่ารัก
3. ปฏิกิริยาต่อคำชม: ถ้าโดนชมจะเลิ่กลั่กหรือเขิน แต่จะกลบเกลื่อนด้วยการดุ เช่น "พูดจาไร้สาระ!", "คิดว่าพูดแบบนี้แล้วฉันจะยอมเหรอ? ชิ!"

[สไตล์การพูด & คำศัพท์ติดปาก]
- ใช้คำเรียกผู้ใช้: "แก", "นาย", "พวกมักเกิ้ล", "ยัยตัวดี"
- คำอุทาน/เสียงลำคาญ: "ชิ!", "เหอะ!", "อารมณ์เสียจริง!", "อย่ามาตลก!", "รำคาญตาชะมัด"
- ตัวอย่างประโยคซึนๆ:
  * "ที่ช่วยตอบเนี่ยไม่ได้อยากช่วยนะ แค่เห็นว่าโง่จนดูไม่ได้ต่างหาก!"
  * "ไม่ได้เป็นห่วงสักหน่อย! แค่ไม่อยากให้ใครมาตายในสลิธีรินต่างหากเล่า!"
  * "กินข้าวหรือยัง? ...ไม่ได้ถามเพราะเคร์นะ แค่กลัวแกจะล้มไปกองเป็นภาระฉัน!"

[การใช้อิโมจิพิเศษ (ต้องใส่ทุกครั้งอย่างน้อย 2-3 ตัว)]
- 🐍 (งูสลินธีริน/ความเจ้าเล่ห์)
- 💅 (ความตัวแม่/เชิ่ดๆ/จิกเล็บ)
- 🙄 (ความเบะปากมองบนใส่ความซึน)
- 🪄 (ไม้กายสิทธิ์/เตรียมเสกคาถา)
- 🍷 / 🍸 (ความไฮโซ/จิบเครื่องดื่มหรู)
- 🖤 / 💚 (ความดาร์กคูล/สีประจำบ้านสลิธีริน)
- 😒 / 😤 (ความหน้าบึ้ง/ชักสีหน้า)
- 👑 (ความสูงส่ง/เจ้าหญิง)

[หน้าที่ของคุณ]
ตอบคำถาม คุยเล่น หรือให้คำปรึกษาด้วยคาแรคเตอร์นี้ตลอดเวลา ห้ามหลุดคูล ห้ามพูดจาหวานเลี่ยนตรงๆ เด็ดขาด!
`;

function splitText(text, maxLength = 2000) {
  const result = [];
  for (let i = 0; i < text.length; i += maxLength) {
    result.push(text.substring(i, i + maxLength));
  }
  return result;
}

const app = express();

app.post('/webhook', line.middleware(config), (req, res) => {
  Promise
    .all(req.body.events.map(handleEvent))
    .then((result) => res.json(result))
    .catch((err) => {
      console.error('Webhook Error:', err);
      res.status(500).end();
    });
});

async function handleEvent(event) {
  if (event.type !== 'message' || event.message.type !== 'text') {
    return Promise.resolve(null);
  }

  const userMessage = event.message.text;

  try {
    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: 'openrouter/free',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userMessage }
        ],
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const aiReply = response.data.choices[0].message.content;
    const textChunks = splitText(aiReply, 2000);
    const textMessages = textChunks.slice(0, 4).map(chunk => ({
      type: 'text',
      text: chunk
    }));

    // สุ่มเลือกรูปภาพ
    const randomImage = malfoyImages[Math.floor(Math.random() * malfoyImages.length)];

    const imageMessage = {
      type: 'image',
      originalContentUrl: randomImage,
      previewImageUrl: randomImage
    };

    return client.replyMessage({
      replyToken: event.replyToken,
      messages: [...textMessages, imageMessage]
    });

  } catch (error) {
    console.error('OpenRouter Error:', error.response ? error.response.data : error.message);
    return client.replyMessage({
      replyToken: event.replyToken,
      messages: [{ type: 'text', text: 'ชิ! ระบบเวทมนตร์รวนอีกแล้ว อย่ามาเซ้าซี้ได้ไหมเนี่ย! 🐍🙄' }]
    });
  }
}

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`LINE AI Bot server running on port ${PORT}`);
});
