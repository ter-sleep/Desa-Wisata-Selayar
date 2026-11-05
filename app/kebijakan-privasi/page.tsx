import Link from 'next/link'
import { Footer, Header, PageIntro } from '@/components/site'
import { getTranslator } from '@/lib/site-preferences'

export default async function PrivacyPolicyPage() {
  const { t } = await getTranslator()
  return <>
    <Header />
    <main>
      <PageIntro eyebrow="Informasi pengunjung" title={<>{t('Kebijakan')}<br/><em>{t('privasi.')}</em></>} text="Penjelasan ringkas mengenai data yang dikirim melalui formulir reservasi dan kontak pada website Desa Wisata Bontomarannu." />
      <section className="section privacy-content">
        <article>
          <p className="eyebrow">{t('01 — Data yang dikumpulkan')}</p>
          <h2>{t('Informasi yang Anda kirimkan')}</h2>
          <p>{t('Formulir reservasi dapat mengumpulkan nama, nomor WhatsApp, email (opsional), tanggal kunjungan, jumlah peserta, dan catatan tambahan. Formulir kontak dapat mengumpulkan nama, email atau nomor telepon (opsional), subjek, serta isi pesan.')}</p>
        </article>
        <article>
          <p className="eyebrow">{t('02 — Tujuan penggunaan')}</p>
          <h2>{t('Untuk mengelola permintaan')}</h2>
          <p>{t('Data digunakan oleh pengelola untuk memproses permintaan reservasi, menghubungi pengunjung, menjawab pertanyaan, dan mencatat tindak lanjut layanan. Persetujuan pada formulir dicatat bersama waktu pengiriman.')}</p>
        </article>
        <article>
          <p className="eyebrow">{t('03 — Akses dan keamanan')}</p>
          <h2>{t('Akses terbatas')}</h2>
          <p>{t('Informasi reservasi dan pesan tidak ditampilkan pada website publik. Data tersebut hanya dapat dibaca dan diproses oleh akun pengelola yang memiliki hak akses. Pengunjung tidak dapat membaca data pengunjung lain melalui formulir publik.')}</p>
        </article>
        <article>
          <p className="eyebrow">{t('04 — Penyimpanan')}</p>
          <h2>{t('Pengelolaan data')}</h2>
          <p>{t('Data disimpan pada sistem basis data yang digunakan website dan dikelola oleh pihak pengelola. Jangka waktu penyimpanan dan prosedur penghapusan perlu ditetapkan serta dijalankan oleh pengelola sesuai kebutuhan operasional dan ketentuan yang berlaku.')}</p>
        </article>
        <article>
          <p className="eyebrow">{t('05 — Pilihan Anda')}</p>
          <h2>{t('Ajukan pertanyaan')}</h2>
          <p>{t('Jangan mengirimkan kata sandi, data keuangan, atau informasi pribadi sensitif yang tidak diperlukan. Untuk pertanyaan mengenai data yang Anda kirimkan, hubungi pengelola melalui halaman Kontak.')}</p>
          <Link href="/kontak" className="button button-dark">{t('Hubungi pengelola')}</Link>
        </article>
        <article>
          <p className="eyebrow">{t('06 — Preferensi tampilan dan peta')}</p>
          <h2>{t('Pilihan yang disimpan')}</h2>
          <p>{t('Pilihan bahasa dan mode siang/malam disimpan dalam cookie selama satu tahun. Cookie ini tidak menyimpan lokasi perangkat atau data formulir.')}</p>
          <p>{t('Lokasi perangkat hanya digunakan di memori browser setelah Anda memberi izin, tidak disimpan ke database. Miniatur memakai data geografis yang disajikan website; tampilan satelit meminta citra Esri dan OpenStreetMap sehingga penyedia dapat menerima alamat IP dan area peta yang dilihat. Petunjuk arah dibuka di Google Maps ketika Anda memilihnya.')}</p>
        </article>
      </section>
    </main>
    <Footer />
  </>
}
