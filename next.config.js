/** @type {import('next').NextConfig} */
const nextConfig = {
  // Other config...
  
  webpack: (config, { isServer }) => {
    // Fix for Tesseract.js in Next.js
    if (isServer) {
      config.externals.push({
        'tesseract.js': 'commonjs tesseract.js'
      })
    }
    
    // Handle worker files
    config.resolve.alias = {
      ...config.resolve.alias,
    }
    
    return config
  },
  
  // For handling WASM files if needed
  experimental: {
    serverComponentsExternalPackages: ['tesseract.js']
  }
}

module.exports = nextConfig