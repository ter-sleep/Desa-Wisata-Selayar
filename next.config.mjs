/** @type {import('next').NextConfig} */
const nextConfig = {
  // Keep remote images usable while the existing content is migrated.
  // Remote image allowlisting can be tightened when image hosting is standardized.
  images: {
    unoptimized: true,
  },
  // Server Actions menerima foto hingga 8 MiB; beri ruang untuk multipart overhead.
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
}

export default nextConfig
