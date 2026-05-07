export function createDailyRoom() {
  const roomName = `hanaph-${Math.random().toString(36).slice(2, 10)}`
  return Promise.resolve(`https://meet.jit.si/${roomName}`)
}
