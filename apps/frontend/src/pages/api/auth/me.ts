import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const backendUrl = 'http://localhost:4000'

  const response = await fetch(`${backendUrl}/auth/me`, {
    method: 'GET',
    headers: {
      cookie: req.headers.cookie || '',
    },
    credentials: 'include',
  })

  const data = await response.json()
  if (!response.ok) {
    return res.status(response.status).json(data)
  }
  return res.status(200).json(data)
} 