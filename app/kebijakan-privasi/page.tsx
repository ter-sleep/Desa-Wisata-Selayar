import Link from 'next/link'
import { Footer, Header, PageIntro } from '@/components/site'

export default function PrivacyPolicyPage() {
  return <>
    <Header />
    <main>
      <PageIntro eyebrow="INFORMASI PENGUNJUNG" title={<>Kebijakan<br/><em>privasi.</em></>} text="Penjelasan ringkas mengenai data yang dikirim melalui formulir reservasi dan kontak pada website Desa Wisata Bontomarannu." />
      <section className="section privacy-content">
        <article>
          <p className="eyebrow">01 — DATA YANG DIKUMPULKAN</p>
          <h2>Informasi yang Anda kirimkan</h2>
          <p>Formulir reservasi dapat mengumpulkan nama, nomor WhatsApp, email (opsional), tanggal kunjungan, jumlah peserta, dan catatan tambahan. Formulir kontak dapat mengumpulkan nama, email atau nomor telepon (opsional), subjek, serta isi pesan.</p>
        </article>
        <article>
          <p className="eyebrow">02 — TUJUAN PENGGUNAAN</p>
          <h2>Untuk mengelola permintaan</h2>
          <p>Data digunakan oleh pengelola untuk memproses permintaan reservasi, menghubungi pengunjung, menjawab pertanyaan, dan mencatat tindak lanjut layanan. Persetujuan pada formulir dicatat bersama waktu pengiriman.</p>
        </article>
        <article>
          <p className="eyebrow">03 — AKSES DAN KEAMANAN</p>
          <h2>Akses terbatas</h2>
          <p>Informasi reservasi dan pesan tidak ditampilkan pada website publik. Data tersebut hanya dapat dibaca dan diproses oleh akun pengelola yang memiliki hak akses. Pengunjung tidak dapat membaca data pengunjung lain melalui formulir publik.</p>
        </article>
        <article>
          <p className="eyebrow">04 — PENYIMPANAN</p>
          <h2>Pengelolaan data</h2>
          <p>Data disimpan pada sistem basis data yang digunakan website dan dikelola oleh pihak pengelola. Jangka waktu penyimpanan dan prosedur penghapusan perlu ditetapkan serta dijalankan oleh pengelola sesuai kebutuhan operasional dan ketentuan yang berlaku.</p>
        </article>
        <article>
          <p className="eyebrow">05 — PILIHAN ANDA</p>
          <h2>Ajukan pertanyaan</h2>
          <p>Jangan mengirimkan kata sandi, data keuangan, atau informasi pribadi sensitif yang tidak diperlukan. Untuk pertanyaan mengenai data yang Anda kirimkan, hubungi pengelola melalui halaman Kontak.</p>
          <Link href="/kontak" className="button button-dark">Hubungi pengelola</Link>
        </article>
      </section>
    </main>
    <Footer />
  </>
}
