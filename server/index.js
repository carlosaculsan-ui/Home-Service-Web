require('dotenv').config();
const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Backend Connected Successfully");
});

app.post('/api/moderate-review', async (req, res) => {
  const { comment } = req.body;
  if (!comment) return res.json({ result: 'clean' });
  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        max_tokens: 10,
        messages: [
          {
            role: 'system',
            content: `You are a content moderator for a Philippine home services app. Analyze the given review comment and respond with ONLY one word: "clean" if the content is appropriate, or "flagged" if it contains any of the following: profanity or swear words in English or Filipino/Tagalog, hate speech or discrimination, threats or violent language, sexually explicit content, spam or gibberish, personal attacks or harassment. Respond with ONLY "clean" or "flagged". Nothing else.`,
          },
          { role: 'user', content: comment },
        ],
      }),
    });
    const data = await response.json();
    const result = data.choices?.[0]?.message?.content?.trim()?.toLowerCase();
    res.json({ result: result === 'flagged' ? 'flagged' : 'clean' });
  } catch {
    res.json({ result: 'clean' });
  }
});

app.listen(5000, () => {
  console.log("Server running on port 5000");
});
