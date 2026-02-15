let spotifyToken: string | null = null
let spotifyTokenExpiry = 0

async function getSpotifyToken(): Promise<string> {
  if (spotifyToken && Date.now() < spotifyTokenExpiry) return spotifyToken
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': 'Basic ' + Buffer.from(
        process.env.SPOTIFY_CLIENT_ID + ':' + process.env.SPOTIFY_CLIENT_SECRET
      ).toString('base64'),
    },
    body: 'grant_type=client_credentials',
  })
  const data = await res.json()
  spotifyToken = data.access_token
  spotifyTokenExpiry = Date.now() + (data.expires_in - 60) * 1000
  return spotifyToken!
}

export async function fetchAlbumArt(songTitle: string): Promise<string | null> {
  const query = songTitle.replace(/[^a-zA-Z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim()
  if (!query) return null

  const token = await getSpotifyToken()
  const res = await fetch(
    `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=1`,
    { headers: { 'Authorization': `Bearer ${token}` } },
  )
  const data = await res.json()
  const track = data.tracks?.items?.[0]
  return track?.album?.images?.[0]?.url ?? null
}
