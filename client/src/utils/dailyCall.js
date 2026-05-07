export async function createDailyRoom() {
  const res = await fetch('https://api.daily.co/v1/rooms', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${import.meta.env.VITE_DAILY_API_KEY}`,
    },
    body: JSON.stringify({
      properties: { exp: Math.round(Date.now() / 1000) + 3600 },
    }),
  })
  if (!res.ok) throw new Error('Failed to create call room')
  const { url } = await res.json()
  return url
}
