import { ArrowUpRight, CheckCircle2, MessageCircle, Send } from 'lucide-react'
import { Footer, Header, PageIntro } from '@/components/site'
import { getPublicContactSettings } from '@/lib/queries/contact-settings'
import { toWhatsAppDigits } from '@/lib/visitor-rules'
import { submitContactMessage } from '@/lib/actions/public-submissions'
import { getTranslator } from '@/lib/site-preferences'

export const dynamic = 'force-dynamic'

export default async function ContactPage({ searchParams }: { searchParams: Promise<{ status?: string; error?: string }> }) {
  const [params, settings, { t, content, language }] = await Promise.all([searchParams, getPublicContactSettings(), getTranslator()])
  const phone = toWhatsAppDigits(settings.whatsappNumber)
  const sent = params.status === 'sent' || params.status === 'received'
  const whatsappMessage = encodeURIComponent(language === 'en'
    ? 'Hello, I would like to ask about Bontomarannu Tourism Village.'
    : 'Assalamu’alaikum, saya ingin bertanya mengenai Desa Wisata Bontomarannu.')

  return <>
    <Header />
    <main>
      <PageIntro eyebrow="08 — Hubungi" title={<>{t('Mari tetap')}<br/><em>{t('terhubung.')}</em></>} text="Sampaikan pertanyaan atau informasi kepada pengelola Desa Wisata Bontomarannu melalui formulir maupun kanal WhatsApp resmi." />
      <section className="section visitor-section">
        <div className="contact-layout">
          <div className="contact-card visitor-contact-card">
            <p className="eyebrow">{t('Informasi kontak')}</p>
            <h2>{t('Terbuka untuk')}<br/><em>{t('percakapan.')}</em></h2>
            <p>{t('Hubungi pengelola untuk memperoleh informasi kunjungan, kerja sama, atau hal lain terkait desa wisata.')}</p>
            {phone ? <a className="button button-dark contact-whatsapp" href={`https://wa.me/${phone}?text=${whatsappMessage}`} target="_blank" rel="noreferrer"><MessageCircle size={17}/> {t('Hubungi melalui WhatsApp')} <ArrowUpRight size={15}/></a> : <div className="visitor-alert visitor-alert-info">{t('Nomor WhatsApp resmi belum diatur oleh administrator.')}</div>}
            {settings.publicAddress && <div className="contact-public-address"><strong>{t('Alamat publik')}</strong><span>{settings.publicAddress}</span></div>}
            <p className="visitor-privacy-note">{t('Pastikan Anda tidak mengirimkan kata sandi, informasi keuangan, atau data pribadi sensitif melalui formulir ini.')}</p>
          </div>

          <div className="visitor-form-card">
            <p className="eyebrow">{t('Formulir pesan')}</p>
            <h2>{t('Kirim pesan kepada kami')}</h2>
            {sent && <div className="visitor-alert visitor-alert-success" role="status"><CheckCircle2 size={18}/> {t('Pesan Anda berhasil dikirim. Terima kasih telah menghubungi pengelola.')}</div>}
            {params.error && <div className="visitor-alert visitor-alert-error" role="alert">{content(params.error)}</div>}
            <form action={submitContactMessage} className="visitor-form">
              <label className="visitor-field">{t('Nama lengkap')} <b>*</b><input name="visitor_name" required minLength={2} maxLength={120} autoComplete="name" placeholder={t('Nama Anda')}/></label>
              <div className="visitor-form-grid">
                <label className="visitor-field">{t('Email (opsional)')}<input name="email" type="email" maxLength={254} autoComplete="email" placeholder="nama@email.com"/></label>
                <label className="visitor-field">{t('Nomor telepon (opsional)')}<input name="phone" maxLength={30} autoComplete="tel" placeholder={t('Nomor yang dapat dihubungi')}/></label>
              </div>
              <label className="visitor-field">{t('Subjek (opsional)')}<input name="subject" maxLength={160} placeholder={t('Topik pesan')}/></label>
              <label className="visitor-field">{t('Pesan')} <b>*</b><textarea name="message" required minLength={5} maxLength={5000} rows={5} placeholder={t('Tuliskan pertanyaan atau pesan Anda...')}/></label>
              <label className="visitor-consent"><input type="checkbox" name="privacy_consent" required/><span>{t('Saya menyetujui informasi ini digunakan oleh pengelola untuk menanggapi pesan saya. Baca')} <a href="/kebijakan-privasi" target="_blank" rel="noreferrer">{t('kebijakan privasi')}</a>.</span></label>
              <div className="visitor-honeypot" aria-hidden="true"><label>{t('Jangan isi kolom ini')}<input name="website" tabIndex={-1} autoComplete="off"/></label></div>
              <button className="button button-dark visitor-submit" type="submit">{t('Kirim pesan')} <Send size={15}/></button>
            </form>
          </div>
        </div>
      </section>
    </main>
    <Footer />
  </>
}
