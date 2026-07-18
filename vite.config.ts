import { defineConfig, loadEnv, type Connect } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

function createGalleryMiddleware(env: Record<string, string>): Connect.NextHandleFunction {
  return async (req, res, next) => {
    if (!req.url?.startsWith('/api/gallery')) {
      return next()
    }

    // Expose Cloudinary env vars to the shared gallery helper
    process.env.VITE_CLOUDINARY_CLOUD_NAME =
      process.env.VITE_CLOUDINARY_CLOUD_NAME || env.VITE_CLOUDINARY_CLOUD_NAME
    process.env.CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY || env.CLOUDINARY_API_KEY
    process.env.CLOUDINARY_API_SECRET =
      process.env.CLOUDINARY_API_SECRET || env.CLOUDINARY_API_SECRET

    try {
      const url = new URL(req.url, 'http://localhost')
      const folderParam = url.searchParams.get('folder') || url.searchParams.get('source') || undefined
      const { fetchGalleryImagesByFolder, resolveGalleryFolder } = await import(
        './api/_lib/cloudinaryGallery.js'
      )
      const folder = resolveGalleryFolder(folderParam)
      if (!folder) {
        res.statusCode = 400
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ error: 'Invalid gallery folder.' }))
        return
      }

      const images = await fetchGalleryImagesByFolder(folder)
      res.statusCode = 200
      res.setHeader('Content-Type', 'application/json')
      res.setHeader('Cache-Control', 'public, max-age=60')
      res.end(JSON.stringify({ images, folder }))
    } catch (error) {
      res.statusCode = 502
      res.setHeader('Content-Type', 'application/json')
      res.end(
        JSON.stringify({
          error: error instanceof Error ? error.message : 'Failed to load Cloudinary gallery.',
        }),
      )
    }
  }
}

function galleryIntegration(env: Record<string, string>) {
  return {
    name: 'cloudinary-gallery-integration',
    configureServer(server: { middlewares: Connect.Server }) {
      server.middlewares.use(createGalleryMiddleware(env))
    },
    configurePreviewServer(server: { middlewares: Connect.Server }) {
      server.middlewares.use(createGalleryMiddleware(env))
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

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [
      galleryIntegration(env),
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
  }
})
