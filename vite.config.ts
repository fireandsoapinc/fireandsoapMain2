import { defineConfig, type Connect } from 'vite'
import path from 'path'
import fs from 'fs'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { INSTAGRAM_APP_ID, parseProfileResponse } from './src/lib/instagram'

const DEFAULT_INSTAGRAM_USERNAME = 'fireandsoap'

function createInstagramMiddleware(): Connect.NextHandleFunction {
  return async (req, res, next) => {
    if (req.url?.startsWith('/api/instagram/profile')) {
      const requestUrl = new URL(req.url, 'http://localhost')
      const username = requestUrl.searchParams.get('username') || DEFAULT_INSTAGRAM_USERNAME

      try {
        const response = await fetch(
          `https://i.instagram.com/api/v1/users/web_profile_info/?username=${encodeURIComponent(username)}`,
          {
            headers: {
              'User-Agent': 'Instagram 76.0.0.11.384',
              'X-IG-App-ID': INSTAGRAM_APP_ID,
            },
          },
        )

        const body = await response.text()
        res.statusCode = response.status
        res.setHeader('Content-Type', 'application/json')
        res.end(body)
      } catch {
        res.statusCode = 502
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ error: 'Failed to fetch Instagram profile.' }))
      }
      return
    }

    if (req.url?.startsWith('/api/instagram/image')) {
      const requestUrl = new URL(req.url, 'http://localhost')
      const imageUrl = requestUrl.searchParams.get('url')

      if (!imageUrl) {
        res.statusCode = 400
        res.end('Missing image url.')
        return
      }

      try {
        const response = await fetch(decodeURIComponent(imageUrl), {
          headers: {
            'User-Agent': 'Mozilla/5.0',
            Referer: 'https://www.instagram.com/',
          },
        })

        if (!response.ok) {
          res.statusCode = response.status
          res.end('Unable to fetch Instagram image.')
          return
        }

        const buffer = Buffer.from(await response.arrayBuffer())
        res.statusCode = 200
        res.setHeader('Content-Type', response.headers.get('content-type') || 'image/jpeg')
        res.setHeader('Cache-Control', 'public, max-age=3600')
        res.end(buffer)
      } catch {
        res.statusCode = 502
        res.end('Failed to proxy Instagram image.')
      }
      return
    }

    return next()
  }
}

async function writeInstagramFeedFile(username = DEFAULT_INSTAGRAM_USERNAME) {
  const outputPath = path.resolve(__dirname, 'public/instagram-feed.json')

  try {
    const response = await fetch(
      `https://i.instagram.com/api/v1/users/web_profile_info/?username=${encodeURIComponent(username)}`,
      {
        headers: {
          'User-Agent': 'Instagram 76.0.0.11.384',
          'X-IG-App-ID': INSTAGRAM_APP_ID,
        },
      },
    )

    if (!response.ok) return

    const json = await response.json()
    const posts = parseProfileResponse(json)
    const payload = {
      username,
      fetchedAt: new Date().toISOString(),
      posts,
    }

    fs.writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`)
  } catch {
    // Keep the existing feed file when Instagram is unreachable during build.
  }
}

function instagramIntegration() {
  return {
    name: 'instagram-integration',
    configureServer(server: { middlewares: Connect.Server }) {
      server.middlewares.use(createInstagramMiddleware())
    },
    configurePreviewServer(server: { middlewares: Connect.Server }) {
      server.middlewares.use(createInstagramMiddleware())
    },
    async buildStart() {
      await writeInstagramFeedFile()
    },
  }
}

function figmaAssetResolver() {
  return {
    name: 'figma-asset-resolver',
    resolveId(id) {
      if (id.startsWith('figma:asset/')) {
        const filename = id.replace('figma:asset/', '')
        return path.resolve(__dirname, 'src/assets', filename)
      }
    },
  }
}

export default defineConfig({
  plugins: [
    instagramIntegration(),
    figmaAssetResolver(),
    // The React and Tailwind plugins are both required for Make, even if
    // Tailwind is not being actively used – do not remove them
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      // Alias @ to the src directory
      '@': path.resolve(__dirname, './src'),
    },
  },

  // File types to support raw imports. Never add .css, .tsx, or .ts files to this.
  assetsInclude: ['**/*.svg', '**/*.csv'],
})
