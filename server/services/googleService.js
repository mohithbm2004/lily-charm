import { OAuth2Client } from 'google-auth-library'

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID)

export async function verifyGoogleToken(idTokenOrAccessToken) {
  if (!idTokenOrAccessToken) {
    throw new Error('Google authentication token is required')
  }

  // Extract raw token string if object was passed
  const token = typeof idTokenOrAccessToken === 'object' 
    ? (idTokenOrAccessToken.access_token || idTokenOrAccessToken.credential || idTokenOrAccessToken.id_token || idTokenOrAccessToken.token)
    : String(idTokenOrAccessToken).trim()

  if (!token) {
    throw new Error('Invalid Google authentication payload format.')
  }

  // 1. Try verifying Google ID Token (from @react-oauth/google GoogleLogin credential)
  try {
    const googleClientId = process.env.GOOGLE_CLIENT_ID
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: googleClientId && !googleClientId.includes('your-google-client-id') ? googleClientId : undefined,
    })
    const payload = ticket.getPayload()
    if (payload && payload.email) {
      return {
        googleId: payload.sub,
        email: payload.email.toLowerCase().trim(),
        name: payload.name || payload.email.split('@')[0],
        avatar: payload.picture || '',
        profilePicture: payload.picture || '',
      }
    }
  } catch (err) {
    console.warn('[GOOGLE ID TOKEN VERIFY NOTICE]: Trying access_token / userinfo fallback:', err.message)
  }

  // 2. Try fetching Google UserInfo endpoint (for OAuth access_token from popup flow)
  try {
    const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (res.ok) {
      const data = await res.json()
      if (data.email) {
        return {
          googleId: data.sub,
          email: data.email.toLowerCase().trim(),
          name: data.name || data.email.split('@')[0],
          avatar: data.picture || '',
          profilePicture: data.picture || '',
        }
      }
    }
  } catch (err) {
    console.warn('[GOOGLE USERINFO FETCH NOTICE]:', err.message)
  }

  throw new Error('Failed to verify Google Authentication Token.')
}
