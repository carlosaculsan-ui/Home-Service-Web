export async function sendEmail(type, userId, data = {}) {
  try {
    await fetch('/api/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, userId, data }),
    })
  } catch {}
}
