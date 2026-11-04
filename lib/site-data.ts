export type VerifiedCoordinates = {
  latitude: number
  longitude: number
  accuracyMeters?: number
  source: string
  verificationStatus: 'verified'
  verifiedAt?: string
}

export type Destination = {
  slug: string
  name: string
  category: string
  eyebrow: string
  description: string
  image: string
  status: string
  details: string[]
  /** Set only after coordinates are checked against a reliable field/source record. */
  coordinates: VerifiedCoordinates | null
  /** Human-readable reference used by the public data center. */
  dataSource: string
  dataStatus: string
  updatedYear: string
  /** Display order managed by administrators; lower values appear first. */
  sortOrder?: number
}

export const destinations: Destination[] = [
  { slug: 'puncak-tanadoang', name: 'Puncak Tanadoang', category: 'Alam', eyebrow: 'Ikon desa wisata', description: 'Perbukitan sejuk dengan kabut, sunset, dan pandangan ke laut lepas Pulau Selayar.', image: 'https://bontomarannu.com.patikarya.desa.id/assets/gambar/fa8d51ad391005a0cae1eed7461157a3.jpg', status: 'Fasilitas perlu dikonfirmasi', details: ['Panorama perbukitan', 'Camping dan ruang terbuka', 'Pemandangan Kota Benteng'], coordinates: null, dataSource: 'Dossier riset & RIPPARKAB', dataStatus: 'Terverifikasi sebagian', updatedYear: '2026' },
  { slug: 'hutan-kenari-gojang', name: 'Hutan Kenari Gojang', category: 'Agrowisata', eyebrow: 'Hutan & ekonomi lokal', description: 'Ekowisata berbasis masyarakat yang mempertemukan pepohonan kenari, aliran air, dan pengetahuan panen tradisional.', image: 'https://sulsel.jadesta.com/imgpost/126187.jpg', status: 'Aktivitas perlu dikonfirmasi', details: ['Interpretasi hutan', 'Kenari dan hasil alam', 'Edukasi konservasi'], coordinates: null, dataSource: 'Dossier riset', dataStatus: 'Perlu survei lapangan', updatedYear: '2026' },
  { slug: 'gantarang-lalang-bata', name: 'Kampung Tua Gantarang Lalang Bata', category: 'Sejarah', eyebrow: 'Jejak permukiman tua', description: 'Lanskap kampung tua dengan susunan batu, cerita pintu masuk, dan narasi sejarah Gantarang.', image: 'https://sulsel.jadesta.com/imgpost/116798.jpg', status: 'Dokumentasi perlu dilengkapi', details: ['Sejarah dan arkeologi', 'Jalur kampung', 'Cerita masyarakat'], coordinates: null, dataSource: 'PPKD Kebudayaan', dataStatus: 'Terverifikasi sebagian', updatedYear: '2026' },
  { slug: 'masjid-tua-awaluddin', name: 'Masjid Tua Gantarang', category: 'Budaya', eyebrow: 'Warisan religi', description: 'Masjid bersejarah di Kampung Gantarang Lalang Bata yang perlu dikunjungi dengan hormat pada fungsi ibadahnya.', image: 'https://kumparan.com/jejak-jelata/berkunjung-ke-masjid-tua-gantarang-lalang-bata-di-pulau-selayar-1rXC8kXFPiV', status: 'Aturan kunjungan perlu dikonfirmasi', details: ['Warisan Islam', 'Arsitektur dan sejarah', 'Etika kunjungan'], coordinates: null, dataSource: 'PPKD Kebudayaan', dataStatus: 'Perlu konfirmasi', updatedYear: '2026' },
  { slug: 'pantai-baubere', name: 'Pantai Babaere', category: 'Bahari', eyebrow: 'Pesisir Bontomarannu', description: 'Pantai yang tercatat dalam rencana pariwisata kabupaten sebagai potensi rekreasi pesisir.', image: 'https://turisian.com/wp-content/uploads/2022/08/Puncak-Tanadoang-Selayar.jpg', status: 'Nama dan keselamatan perlu diverifikasi', details: ['Bentang pesisir', 'Potensi snorkeling', 'Catatan keselamatan'], coordinates: null, dataSource: 'RIPPARKAB 2023–2025', dataStatus: 'Perlu verifikasi nama', updatedYear: '2026' },
  { slug: 'air-terjun-kelong', name: "Air Terjun & Sungai Ke'long", category: 'Alam', eyebrow: 'Jelajah air', description: 'Atraksi alam yang tercatat dalam direktori wisata; detail jalur dan kondisi lapangan belum tersedia.', image: 'https://sulsel.jadesta.com/imgpost/126187.jpg', status: 'Data lapangan belum tersedia', details: ['Jelajah sungai', 'Musim dan debit air', 'Akses perlu survei'], coordinates: null, dataSource: 'Direktori wisata', dataStatus: 'Data awal', updatedYear: '2026' },
]

export const navItems = [
  { href: '/', label: 'Beranda' }, { href: '/destinasi', label: 'Destinasi' }, { href: '/profil', label: 'Profil Desa' }, { href: '/sejarah-budaya', label: 'Sejarah & Budaya' }, { href: '/agrowisata', label: 'Agrowisata' }, { href: '/pusat-data', label: 'Pusat Data' }, { href: '/peta', label: 'Peta Jelajah' },
]
