import React, { useState } from 'react';
import { Mail, Phone, MapPin, Clock, Send, CheckCircle2, ShieldCheck } from 'lucide-react';
import { useDocumentMeta } from '@/hooks/useDocumentMeta';
import { Button } from '@/components/ui/Button';

export const ContactUsPage: React.FC = () => {
  useDocumentMeta({
    title: 'Contact Us & Atelier Concierge — Footzi',
    description: 'Get in touch with the Footzi Agra atelier concierge for size advice, bespoke orders, or statutory grievance support.',
  });

  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', phone: '', subject: 'Fit & Sizing Query', message: '' });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (form.name && form.email && form.message) {
      setSubmitted(true);
    }
  };

  return (
    <div className="py-12 md:py-20 bg-ivory-100 min-h-[85vh]">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {/* Header */}
        <div className="text-center space-y-3 border-b border-ivory-300 pb-8">
          <span className="text-[11px] uppercase tracking-ultra text-sand-600 font-semibold block">
            The Footzi Concierge
          </span>
          <h1 className="font-serif text-3xl sm:text-5xl font-medium text-charcoal-950">
            Contact & Grievance Desk
          </h1>
          <p className="text-xs sm:text-sm text-charcoal-600 max-w-xl mx-auto font-light leading-relaxed">
            Direct access to our master artisans, footwear stylists, and legal compliance officers in Agra.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Contact Details Card */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white p-6 sm:p-8 rounded-xs border border-ivory-200 shadow-sm space-y-6">
              <div>
                <h2 className="font-serif text-xl font-medium text-charcoal-950 mb-1">Agra Atelier Headquarters</h2>
                <p className="text-xs text-charcoal-500">FOOTZI LUXURY FOOTWEAR PRIVATE LIMITED</p>
              </div>

              <div className="space-y-4 text-xs text-charcoal-700">
                <div className="flex items-start gap-3">
                  <MapPin className="w-4 h-4 text-sand-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="block text-charcoal-900">Atelier & Registered Office</strong>
                    <p className="text-charcoal-600 leading-relaxed">
                      Taj Nagari Phase II, Fatehabad Road,<br />
                      Agra, Uttar Pradesh 282001, India
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Mail className="w-4 h-4 text-sand-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="block text-charcoal-900">Customer Concierge</strong>
                    <a href="mailto:concierge@footzi.in" className="text-sand-600 underline">concierge@footzi.in</a>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Phone className="w-4 h-4 text-sand-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="block text-charcoal-900">Telephone Line</strong>
                    <a href="tel:+915622849000" className="text-charcoal-900 font-medium">+91 562 284 9000</a>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Clock className="w-4 h-4 text-sand-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="block text-charcoal-900">Concierge Desk Hours</strong>
                    <p className="text-charcoal-600">Monday &ndash; Saturday: 10:00 AM &ndash; 7:00 PM IST</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Grievance Redressal Card (Mandatory under Indian E-Commerce Rules) */}
            <div className="bg-sand-50/70 p-6 rounded-xs border border-sand-200/60 text-xs space-y-2">
              <div className="flex items-center gap-2 text-sand-900 font-semibold">
                <ShieldCheck className="w-4 h-4 text-sand-700" />
                <span>Statutory E-Commerce Grievance Officer</span>
              </div>
              <p className="text-charcoal-700">
                <strong>Officer:</strong> Anshul Singh<br />
                <strong>Direct Email:</strong> <a href="mailto:grievance@footzi.in" className="text-sand-700 underline">grievance@footzi.in</a><br />
                <strong>Response Turnaround:</strong> Acknowledged within 48 hours; resolution completed within 30 days per Consumer Protection (E-Commerce) Rules, 2020.
              </p>
            </div>
          </div>

          {/* Contact Message Form */}
          <div className="lg:col-span-3">
            <div className="bg-white p-6 sm:p-10 rounded-xs border border-ivory-200 shadow-sm space-y-6">
              <div>
                <h2 className="font-serif text-2xl font-medium text-charcoal-950">Send an Inquiry to the Atelier</h2>
                <p className="text-xs text-charcoal-500 mt-1">Our footwear specialists typically reply within 4 business hours.</p>
              </div>

              {submitted ? (
                <div className="p-8 bg-emerald-50 border border-emerald-200 rounded-xs text-center space-y-3">
                  <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
                  <h3 className="font-serif text-lg font-medium text-emerald-950">Inquiry Received at the Atelier</h3>
                  <p className="text-xs text-emerald-700 max-w-md mx-auto">
                    Thank you, {form.name}. A senior footwear advisor has received your request and will reach out via {form.email} shortly.
                  </p>
                  <Button
                    variant="outline"
                    className="text-xs mt-2"
                    onClick={() => {
                      setSubmitted(false);
                      setForm({ name: '', email: '', phone: '', subject: 'Fit & Sizing Query', message: '' });
                    }}
                  >
                    Send Another Message
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="contact-name" className="block text-[11px] uppercase tracking-wider font-semibold text-charcoal-700 mb-1">
                        Full Name *
                      </label>
                      <input
                        id="contact-name"
                        type="text"
                        required
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        className="w-full bg-ivory-50 border border-ivory-300 px-3.5 py-2.5 text-xs text-charcoal-900 rounded-xs focus:outline-none focus:border-charcoal-900"
                        placeholder="e.g. Vikramaditya Rathore"
                      />
                    </div>

                    <div>
                      <label htmlFor="contact-email" className="block text-[11px] uppercase tracking-wider font-semibold text-charcoal-700 mb-1">
                        Email Address *
                      </label>
                      <input
                        id="contact-email"
                        type="email"
                        required
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                        className="w-full bg-ivory-50 border border-ivory-300 px-3.5 py-2.5 text-xs text-charcoal-900 rounded-xs focus:outline-none focus:border-charcoal-900"
                        placeholder="e.g. vikram@example.com"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="contact-phone" className="block text-[11px] uppercase tracking-wider font-semibold text-charcoal-700 mb-1">
                        Phone Number (Optional)
                      </label>
                      <input
                        id="contact-phone"
                        type="tel"
                        value={form.phone}
                        onChange={(e) => setForm({ ...form, phone: e.target.value })}
                        className="w-full bg-ivory-50 border border-ivory-300 px-3.5 py-2.5 text-xs text-charcoal-900 rounded-xs focus:outline-none focus:border-charcoal-900"
                        placeholder="e.g. 9876543210"
                      />
                    </div>

                    <div>
                      <label htmlFor="contact-subject" className="block text-[11px] uppercase tracking-wider font-semibold text-charcoal-700 mb-1">
                        Subject
                      </label>
                      <select
                        id="contact-subject"
                        value={form.subject}
                        onChange={(e) => setForm({ ...form, subject: e.target.value })}
                        className="w-full bg-ivory-50 border border-ivory-300 px-3 py-2.5 text-xs text-charcoal-900 rounded-xs focus:outline-none focus:border-charcoal-900"
                      >
                        <option value="Fit & Sizing Query">Fit & Sizing Query</option>
                        <option value="Order Tracking & Delhivery Status">Order Tracking & Delhivery Status</option>
                        <option value="Exchange & Return Request">Exchange & Return Request</option>
                        <option value="Bespoke Guild Inquiries">Bespoke Guild Inquiries</option>
                        <option value="Statutory Grievance">Statutory Grievance</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="contact-message" className="block text-[11px] uppercase tracking-wider font-semibold text-charcoal-700 mb-1">
                      Message *
                    </label>
                    <textarea
                      id="contact-message"
                      required
                      rows={5}
                      value={form.message}
                      onChange={(e) => setForm({ ...form, message: e.target.value })}
                      className="w-full bg-ivory-50 border border-ivory-300 p-3.5 text-xs text-charcoal-900 rounded-xs focus:outline-none focus:border-charcoal-900 resize-none"
                      placeholder="Tell us how we can assist your footwear journey..."
                    />
                  </div>

                  <Button type="submit" variant="primary" className="w-full text-xs uppercase tracking-widest py-3">
                    <Send className="w-4 h-4 mr-2" />
                    Submit Inquiry to Atelier
                  </Button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContactUsPage;
