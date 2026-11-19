import React from 'react';
import { ShieldCheck, Lock, Eye, FileText, Mail, Phone, MapPin } from 'lucide-react';
import { useDocumentMeta } from '@/hooks/useDocumentMeta';

export const PrivacyPolicyPage: React.FC = () => {
  useDocumentMeta({
    title: 'Privacy Policy — Footzi',
    description: 'Learn how Footzi protects your personal data, handles secure payments via Razorpay, and complies with Indian IT Act 2000 standards.',
  });

  return (
    <div className="py-12 md:py-20 bg-ivory-100 min-h-[85vh]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        {/* Header */}
        <div className="text-center space-y-3 border-b border-ivory-300 pb-8">
          <span className="text-[11px] uppercase tracking-ultra text-sand-600 font-semibold block">
            Statutory Trust & Data Integrity
          </span>
          <h1 className="font-serif text-3xl sm:text-5xl font-medium text-charcoal-950">
            Privacy Policy
          </h1>
          <p className="text-xs sm:text-sm text-charcoal-600 max-w-xl mx-auto font-light leading-relaxed">
            Effective Date: November 2024 • Compliant with the Information Technology Act, 2000 and the SPDI Rules, 2011.
          </p>
        </div>

        {/* Content Card */}
        <div className="bg-white p-6 sm:p-10 rounded-xs border border-ivory-200 shadow-sm space-y-8 text-xs sm:text-sm text-charcoal-700 leading-relaxed">
          <section className="space-y-3">
            <h2 className="font-serif text-lg sm:text-xl font-semibold text-charcoal-950 flex items-center gap-2">
              <Eye className="w-5 h-5 text-sand-600" />
              1. Information We Collect
            </h2>
            <p>
              When you purchase or browse footwear on <strong>FOOTZI LUXURY FOOTWEAR PRIVATE LIMITED</strong> (&ldquo;Footzi&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;, or &ldquo;our&rdquo;), we collect personal data necessary to curate, handcraft, and deliver your order:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-charcoal-600">
              <li><strong>Contact Information:</strong> Full name, telephone number, and email address.</li>
              <li><strong>Delivery Information:</strong> Physical delivery address, landmark, city, state, and 6-digit postal PIN code for courier routing.</li>
              <li><strong>Device & Interaction Data:</strong> IP address, browser type, operating system, pages visited, and conversion funnel interactions recorded via privacy-compliant analytics pixels (Meta Pixel, Google Analytics 4).</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="font-serif text-lg sm:text-xl font-semibold text-charcoal-950 flex items-center gap-2">
              <Lock className="w-5 h-5 text-sand-600" />
              2. Secure Payment Processing & Non-Storage of Card Data
            </h2>
            <p>
              All prepaid transactions on <strong>footzi.in</strong> are processed through our PCI-DSS Level 1 compliant gateway partner, <strong>Razorpay</strong>.
            </p>
            <p className="bg-ivory-50 p-4 border border-ivory-200 rounded-xs text-charcoal-800">
              <strong>Zero Card Storage Guarantee:</strong> Footzi never captures, stores, or sees your credit card number, debit card number, CVV, or UPI PIN on our servers. All financial transactions occur within Razorpay&rsquo;s encrypted 256-bit TLS vault with RBI-mandated multi-factor authentication (OTP / UPI App authorization).
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-serif text-lg sm:text-xl font-semibold text-charcoal-950 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-sand-600" />
              3. Courier Logistics & Third-Party Sharing
            </h2>
            <p>
              To fulfill your order from our Agra artisanal atelier to your doorstep across India, we share your delivery contact details solely with authorized logistics partners:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-charcoal-600">
              <li><strong>Delhivery Express Logistics:</strong> Receives customer name, delivery address, phone number, and package dimensions to assign Air Waybills (AWB) and facilitate doorstep delivery and reverse-pickup size exchanges.</li>
              <li><strong>Transactional Communication Providers:</strong> Email and WhatsApp service providers for automated delivery tracking links and dispatch status alerts.</li>
            </ul>
            <p>
              We do <strong>not</strong> sell, rent, or trade your personal information to third-party data brokers under any circumstances.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-serif text-lg sm:text-xl font-semibold text-charcoal-950 flex items-center gap-2">
              <FileText className="w-5 h-5 text-sand-600" />
              4. Cookies & Digital Advertising Attribution
            </h2>
            <p>
              We utilize first-party session cookies and advertising attribution tags (including Meta Pixel and Google Tag) to measure ad campaign efficiency, retain shopping cart selections across device sessions, and present relevant footwear collections to returning patrons. You can disable cookies in your browser settings at any time without forfeiting basic browsing capabilities.
            </p>
          </section>

          <section className="space-y-3 border-t border-ivory-200 pt-6">
            <h2 className="font-serif text-lg sm:text-xl font-semibold text-charcoal-950">
              5. Statutory Grievance Officer & Contact
            </h2>
            <p>
              In accordance with the Information Technology Act, 2000 and the Consumer Protection (E-Commerce) Rules, 2020, the designated Grievance Officer for Footzi is:
            </p>
            <div className="bg-ivory-50 p-4 border border-ivory-200 rounded-xs space-y-1 text-xs">
              <p><strong>Grievance Officer:</strong> Anshul Singh</p>
              <p><strong>Entity:</strong> FOOTZI LUXURY FOOTWEAR PRIVATE LIMITED</p>
              <p className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-sand-600" /> Taj Nagari Phase II, Agra, Uttar Pradesh 282001, India</p>
              <p className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5 text-sand-600" /> grievance@footzi.in / concierge@footzi.in</p>
              <p className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 text-sand-600" /> +91 562 284 9000 (Mon–Sat, 10:00 AM – 7:00 PM IST)</p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicyPage;
