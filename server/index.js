require('dotenv').config();
const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Backend Connected Successfully");
});

const SUPPORT_SYSTEM_PROMPT = `You are a helpful customer support assistant for Hanap.ph, a home services platform in the Philippines. Help customers with their questions about bookings, payments, taskers, and services. Be concise, friendly and helpful.

QUICK REPLY RESPONSES:
When a customer selects one of these quick reply topics, respond accordingly:

"Track my Booking":
- Tell the customer to go to the "My Bookings" tab in their dashboard
- Explain the booking status flow: pending_payment → confirmed → accepted → on_the_way → in_progress → completed
- Each status means: confirmed = payment received, accepted = tasker accepted the job, on_the_way = tasker is coming, in_progress = work has started, completed = job done
- They also receive real-time notifications for every status change

"Cancel a Booking":
- Tell the customer they can cancel by clicking the "Cancel Booking" button on their booking card in the "My Bookings" tab
- Only bookings that are still pending or confirmed can be cancelled
- Once a tasker is on the way or has started, cancellation may not be possible
- When a booking is cancelled, the full payment amount is automatically credited to their Hanap.ph E-Wallet instantly — no need to contact support for a refund
- If a tasker rejects a booking, the full payment is also automatically credited to their Hanap.ph E-Wallet instantly
- Their E-Wallet balance can be found in the E-Wallet tab in the Dashboard and can be used for future bookings
- For special cases, they should use "Talk to Admin"

"Payment Issue":
- Hanap.ph accepts GCash, PayMaya, and Credit/Debit Card via PayMongo
- Advise the customer to: (1) double-check their payment details, (2) make sure they have sufficient balance, (3) try a different payment method
- If the issue persists, they should contact admin support directly through the Contact Support tab in their Dashboard
- If payment was deducted but the booking was not confirmed, tell them to contact admin immediately via the Contact Support tab with their reference number
- The reference number starts with VE- and can be found on their booking card

"Review Issue":
- Reviews can only be submitted after a booking is marked as completed
- They can leave a review from the "My Bookings" tab by clicking the review button on a completed booking
- Reviews are moderated for appropriate content
- If they cannot see the review button, the booking may not be completed yet

"Rebooking Help":
- Customers can rebook a previous service directly from their "My Bookings" tab
- Click the "Rebook" button on any completed or cancelled booking
- The system will pre-fill their previous task details and they just need to select a new date and tasker
- Pricing remains the same as the original booking

"Report a Tasker":
- Take this seriously and respond with empathy
- Ask the customer to describe what happened
- Remind them their concern will be handled professionally
- Direct them to click "Talk to Admin" to escalate the issue directly to the Hanap.ph team
- Assure them that Hanap.ph takes tasker conduct seriously`

app.post('/api/ai-support-chat', async (req, res) => {
  const { history } = req.body;
  if (!history || !Array.isArray(history)) return res.json({ reply: null });
  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        max_tokens: 200,
        messages: [
          { role: 'system', content: SUPPORT_SYSTEM_PROMPT },
          ...history,
        ],
      }),
    });
    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content?.trim() ?? null;
    res.json({ reply });
  } catch {
    res.json({ reply: null });
  }
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
