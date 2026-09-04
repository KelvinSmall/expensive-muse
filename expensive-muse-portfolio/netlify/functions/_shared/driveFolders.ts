/**
 * Finds a folder by exact name under a given parent, creating it if it
 * doesn't already exist. Called with the same names every time a Drive
 * account is (re)connected, so it is safe to run repeatedly — it will
 * never create duplicates.
 */
export async function findOrCreateFolder(
  accessToken: string,
  name: string,
  parentId: string | null
): Promise<string> {
  const parentClause = parentId ? ` and '${parentId}' in parents` : " and 'root' in parents"
  const q = encodeURIComponent(
    `name = '${escapeForQuery(name)}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false${parentClause}`
  )
  const searchRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name)`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!searchRes.ok) throw new Error('Google Drive folder lookup failed')
  const searchJson = (await searchRes.json()) as { files?: { id: string; name: string }[] }
  if (searchJson.files?.length) return searchJson.files[0].id as string

  const createRes = await fetch('https://www.googleapis.com/drive/v3/files?fields=id', {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name,
      mimeType: 'application/vnd.google-apps.folder',
      parents: parentId ? [parentId] : undefined,
    }),
  })
  if (!createRes.ok) throw new Error('Failed to create Google Drive folder: ' + name)
  const createJson = (await createRes.json()) as { id: string }
  return createJson.id as string
}

function escapeForQuery(s: string) {
  return s.replace(/'/g, "\\'")
}
