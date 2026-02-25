import React, { useState } from 'react';
import { ICONS } from '../constants';

type LegalDoc = 'privacy' | 'terms';
interface LegalModalProps { doc: LegalDoc; onClose: () => void; }

// ─── PRIVACY POLICY ──────────────────────────────────────────────────────────
const PRIVACY_SECTIONS: { heading: string; body: string }[] = [
  {
    heading: '1. Who We Are',
    body: `TradeFlow Studio ("TradeFlow", "we", "us", "our") is a trading journal and performance analytics platform operated from Ontario, Canada.

**Contact:**
• General & Support: support@tradeflowstudio.com
• Privacy Inquiries: privacy@tradeflowstudio.com
• Legal: legal@tradeflowstudio.com

This Privacy Policy explains how we collect, use, disclose, and protect your personal information when you use our web application, mobile application, and related services (the "Service"). By using the Service, you consent to the practices described here.`
  },
  {
    heading: '2. Information We Collect',
    body: `**2.1 Account Data**
Email address, display name, and authentication credentials. If you sign in via Google OAuth, we receive your name, email, and profile photo as provided by Google.

**2.2 Trading & Journal Data**
All trade entries you log or import — symbols, entry/exit prices, P&L, dates, notes, psychological annotations, mistake logs, and any other data you enter. This is your data; we process it solely to deliver the Service.

**2.3 AI Processing Data**
When generating weekly AI insights (Pro plan), an aggregated statistical summary of your trading activity is sent to the Google Gemini API. This contains trading statistics and patterns only — your name, email, or other directly identifying information is never included in these API requests.

**2.4 Usage & Diagnostic Data**
Pages visited, features used, session duration, error logs, and browser/device information collected via standard server logs. Used solely for platform performance monitoring and debugging.

**2.5 Payment Data**
All payment processing is handled by Stripe, Inc. We do not store, transmit, or have access to your full card number, CVV, or full bank account details. We receive only a tokenised reference and subscription status from Stripe. Stripe is certified PCI-DSS Level 1 compliant.`
  },
  {
    heading: '3. How We Use Your Information',
    body: `We use your information strictly to:
• Provide, operate, and maintain the Service.
• Generate personalised AI-powered trading insights for Pro subscribers.
• Process subscription payments and send billing receipts.
• Send transactional emails (email verification, password reset, billing events).
• Monitor platform health, diagnose errors, and improve performance.
• Investigate, detect, and prevent fraud, abuse, or unauthorised access.
• Comply with applicable legal obligations.

**We will never:**
• Sell, rent, or lease your personal data to any third party.
• Use your trading data for advertising, profiling, or third-party marketing.
• Share your data with any party not listed in Section 6 without your explicit consent.`
  },
  {
    heading: '4. Legal Basis for Processing (GDPR)',
    body: `For users in the EEA, UK, or Switzerland, we process personal data under the following legal bases (GDPR Art. 6):

• **Contract Performance (Art. 6(1)(b)):** Processing necessary to provide the Service you signed up for, including storing trade data and generating insights.
• **Legitimate Interests (Art. 6(1)(f)):** Fraud prevention, platform security, and product improvement — where not overridden by your rights.
• **Consent (Art. 6(1)(a)):** For optional features such as AI insight generation and marketing communications.
• **Legal Obligation (Art. 6(1)(c)):** Where we are required to retain or disclose data by applicable law.

You may withdraw consent at any time without affecting the lawfulness of processing prior to withdrawal.`
  },
  {
    heading: '5. Data Storage and Security',
    body: `Your data is stored on **Supabase** (PostgreSQL on Amazon Web Services):

• Encrypted at rest using AES-256.
• Encrypted in transit using TLS 1.3.
• Protected by row-level security (RLS) — each authenticated user can only access their own records.
• Automatically backed up with a 7-day point-in-time recovery window.

While we implement industry-standard security measures, no method of transmission or storage is 100% secure. You are responsible for maintaining the confidentiality of your login credentials.`
  },
  {
    heading: '6. Third-Party Service Providers',
    body: `We share data only with the following trusted processors, each bound by a data processing agreement (DPA):

• **Supabase, Inc.** — Database, authentication, and file storage (AWS us-east-1). privacy.supabase.com
• **Google LLC (Gemini API)** — AI insight generation. Anonymised statistical summaries only. policies.google.com/privacy
• **Stripe, Inc.** — Payment processing for Pro subscriptions. stripe.com/privacy
• **Netlify, Inc.** — Web hosting and serverless function execution. netlify.com/privacy

We do not use advertising networks, social media pixels, or data brokers.`
  },
  {
    heading: '7. International Data Transfers',
    body: `TradeFlow Studio is operated from Ontario, Canada. Our users are located globally. By using the Service, you acknowledge that your personal data may be transferred to, stored in, and processed in countries outside your country of residence — including Canada, the United States, and any country where our third-party processors maintain infrastructure.

For transfers of personal data from the EEA, UK, or Switzerland to countries without adequate protection, we rely on:
• **Standard Contractual Clauses (SCCs)** approved by the European Commission.
• **UK International Data Transfer Agreements (IDTAs)** where applicable.

You may request a copy of the relevant transfer mechanism by contacting privacy@tradeflowstudio.com.`
  },
  {
    heading: '8. Your Rights (GDPR · CCPA · PIPEDA)',
    body: `We honour data rights under all major frameworks. We respond to all verified requests within **30 days**.

**GDPR (EEA/UK users):**
• Right of Access (Art. 15) — request a copy of all data we hold about you.
• Right to Rectification (Art. 16) — request correction of inaccurate data.
• Right to Erasure / "Right to be Forgotten" (Art. 17) — request account and data deletion.
• Right to Restriction (Art. 18) — request limited processing in certain circumstances.
• Right to Data Portability (Art. 20) — export trade data in CSV at any time, or request a full machine-readable export.
• Right to Object (Art. 21) — object to processing based on legitimate interests.
• Right against automated decision-making (Art. 22) — we do not make automated decisions with legal or significant effects about you.

**CCPA (California residents):**
• Right to know what personal information is collected, used, shared, or sold.
• Right to delete personal information.
• Right to opt-out of sale (we do not sell personal information).
• Right to non-discrimination for exercising your rights.

**PIPEDA (Canadian residents):**
• Right to access personal information held about you.
• Right to challenge accuracy and completeness.
• Right to withdraw consent (subject to legal or contractual restrictions).

To exercise any right, email **privacy@tradeflowstudio.com** with "Privacy Rights Request" in the subject line.`
  },
  {
    heading: '9. Data Retention',
    body: `• **Account and trade data:** Retained while your account is active.
• **Deleted accounts:** All personal data permanently deleted within **30 days** of account closure, except where legal retention is required (e.g., financial transaction records for up to 7 years).
• **Backups:** May persist for up to 7 additional days following deletion due to automated backup cycles.
• **Anonymised analytics:** Fully anonymised, aggregated statistics may be retained indefinitely as they cannot be attributed to any individual.`
  },
  {
    heading: '10. Cookies and Local Storage',
    body: `We use only functional, session-scoped storage mechanisms:

• **Supabase Auth Tokens:** Stored in localStorage to maintain your session. Expire automatically and cleared on sign-out.
• **App Preferences:** Display settings and accepted-terms timestamp stored locally. Never transmitted to third parties.

**We do not use:** advertising cookies, cross-site tracking pixels, third-party analytics cookies (Google Analytics, Hotjar), or social media tracking.

You can clear localStorage at any time through your browser settings, though this will sign you out.`
  },
  {
    heading: '11. Business Transfers',
    body: `In the event that TradeFlow Studio undergoes a merger, acquisition, reorganisation, bankruptcy, dissolution, or sale of all or substantially all of its assets, your personal data may be transferred to the acquiring entity as part of that transaction.

We will notify you via email and/or a prominent in-app notice at least **30 days** prior to your data becoming subject to a different privacy policy. You will be provided the opportunity to delete your account before the transfer takes effect.

In the event of insolvency proceedings, user data will be treated as an asset subject to applicable insolvency laws.`
  },
  {
    heading: "12. Children's Privacy",
    body: `TradeFlow Studio is not directed at individuals under the age of **16** (or the applicable age of digital consent in your jurisdiction).

If you believe a child has provided us with personal information without parental consent, contact privacy@tradeflowstudio.com immediately. We will promptly delete that information and terminate the associated account.`
  },
  {
    heading: '13. Changes to This Policy',
    body: `For **material changes** (new data categories, new third-party processors, changes to your rights), we will:
• Notify you by email at least **14 days** before the change takes effect.
• Display a prominent in-app notice.
• Update the "Last Updated" date above.

Continued use after the effective date constitutes acceptance. If you do not agree, you may close your account.`
  },
  {
    heading: '14. Contact & Supervisory Authority',
    body: `**Privacy:** privacy@tradeflowstudio.com
**Support:** support@tradeflowstudio.com
**Address:** TradeFlow Studio, Ontario, Canada

**EEA/UK users:** You have the right to lodge a complaint with your local supervisory authority (e.g., the Information Commissioner's Office in the UK, or your national DPA in the EU).`
  },
];

// ─── TERMS & CONDITIONS ───────────────────────────────────────────────────────
const TERMS_SECTIONS: { heading: string; body: string }[] = [
  {
    heading: '1. Agreement to Terms',
    body: `These Terms & Conditions ("Terms") constitute a legally binding agreement between you ("User", "you") and **TradeFlow Studio** ("TradeFlow Studio", "we", "us"), operating from Ontario, Canada.

By creating an account, clicking "Accept", or using the Service, you confirm:
• You are at least **16 years of age** (or the applicable age of majority in your jurisdiction).
• You have read, understood, and agree to be bound by these Terms and our Privacy Policy.
• If accepting on behalf of an organisation, you have authority to bind that organisation.

**If you do not agree to these Terms, you must not use the Service.**`
  },
  {
    heading: '2. Description of Service',
    body: `TradeFlow Studio is a web-based and mobile trading journal application allowing traders to log, categorise, analyse, and review their own trading activity. The Service includes trade journalling, calendar and analytics tools (Pro plan), AI-powered weekly debrief reports via Google Gemini (Pro plan), and multi-broker account management (Pro plan).

The Service is a **personal journalling and performance analysis tool only.** TradeFlow Studio does not provide brokerage services, execution services, investment advice, financial planning, or any other regulated financial services. We are not a registered investment adviser, broker-dealer, or financial institution in any jurisdiction.`
  },
  {
    heading: '3. ⚠️ Risk Warning and Financial Disclaimer',
    body: `**TRADING IN FINANCIAL INSTRUMENTS IS HIGHLY SPECULATIVE AND CARRIES A SUBSTANTIAL RISK OF LOSS. THE VAST MAJORITY OF RETAIL TRADERS LOSE MONEY.**

Trading involves significant risk. Past performance shown in your journal is not indicative of future results. Leverage can work against you as well as in your favour.

**NOTHING IN THE SERVICE CONSTITUTES FINANCIAL OR INVESTMENT ADVICE.** All content generated by TradeFlow Studio — including AI-generated weekly debrief reports, performance statistics, drawdown metrics, and pattern analysis — is provided for **informational and educational purposes only**. It does not constitute investment advice, a recommendation to buy or sell any instrument, a trading signal, or an endorsement of any strategy.

You are **solely and exclusively responsible** for all trading decisions you make and their consequences. TradeFlow Studio expressly disclaims any liability for trading losses arising from your use of or reliance on any content generated by or displayed within the Service.`
  },
  {
    heading: '4. "As Is" and "As Available" Disclaimer',
    body: `THE SERVICE IS PROVIDED ON AN **"AS IS"** AND **"AS AVAILABLE"** BASIS, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED.

TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, TRADEFLOW STUDIO EXPRESSLY DISCLAIMS ALL WARRANTIES, INCLUDING:
• IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.
• WARRANTIES THAT THE SERVICE WILL BE UNINTERRUPTED, ERROR-FREE, VIRUS-FREE, OR PERFECTLY SECURE.
• WARRANTIES AS TO THE ACCURACY, COMPLETENESS, OR RELIABILITY OF ANY CALCULATIONS, DATA, OR AI-GENERATED CONTENT.
• WARRANTIES THAT DEFECTS OR ERRORS WILL BE CORRECTED.

P&L calculations and performance metrics are generated based on data you provide and are tools to assist your own review — not authoritative financial records. You should verify any critical figures independently.`
  },
  {
    heading: '5. User Accounts',
    body: `**5.1 Registration.** You must create an account using accurate, current, and complete information and keep it up to date.

**5.2 Credentials.** You are solely responsible for maintaining the confidentiality of your credentials and for all activity under your account. Notify us immediately at support@tradeflowstudio.com of any suspected unauthorised use.

**5.3 One Person, One Account.** Each account may only be used by a single individual. You may not share credentials. Corporate multi-user accounts require a separate written agreement.

**5.4 Accurate Information.** You must not impersonate any person or create an account using false information.`
  },
  {
    heading: '6. Subscription Plans and Billing',
    body: `**6.1 Plans.** Free Plan: 1 broker scope, core trade logging. Pro Plan: unlimited accounts, AI weekly insights, full analytics, psychology tracker. Billed monthly or annually at the rate displayed at checkout.

**6.2 Auto-Renewal and Cancellation.** Subscriptions automatically renew at the end of each billing period unless cancelled before the renewal date. You authorise us (via Stripe) to charge your payment method on a recurring basis. Upon cancellation, your Pro access is terminated immediately and permanently. You will not retain access to Pro features for the remainder of any paid billing period. No credits or partial refunds are issued for any unused portion of a billing period under any circumstances.

**6.3 No Refund Policy.** ALL SUBSCRIPTION FEES ARE NON-REFUNDABLE. By subscribing, you expressly agree that no refunds or credits will be issued under any circumstances, including but not limited to: early cancellation, partial use of the billing period, account termination (whether voluntary or by TradeFlow Studio), failure to use Pro-exclusive features, or dissatisfaction with the Service. This no-refund policy applies to both monthly and annual plans. Please ensure the Service meets your needs before subscribing — a Free plan is available for evaluation.

**6.4 Price Changes.** We will provide at least **30 days' notice** of price increases via email. Continued use constitutes acceptance.

**6.5 Taxes.** Prices may be subject to applicable taxes (GST/HST, VAT, etc.). You are responsible for paying any such taxes.

**6.6 Payment Failure.** Continued failure to pay may result in downgrade to the Free plan or account suspension.`
  },
  {
    heading: '7. Termination and Suspension',
    body: `**7.1 Termination by You.** Close your account at any time by contacting support@tradeflowstudio.com.

**7.2 Termination or Suspension by Us.** TradeFlow Studio reserves the right, at its **sole discretion**, to suspend, restrict, or permanently terminate your account and access to the Service, **with or without prior notice**, for any reason including but not limited to:
• Violation of any provision of these Terms.
• Fraudulent, abusive, or illegal activity.
• Sharing, reselling, or attempting to resell your account.
• Attempting to reverse engineer, scrape, or compromise the Service.
• Providing false registration information.
• Non-payment of subscription fees.
• Any conduct we reasonably determine to be harmful to TradeFlow Studio, other users, or third parties.

**7.3 Effect of Termination.** Your right to access the Service ceases immediately. Sections 3, 4, 10, 11, 12, 13, 14, and 15 survive termination.

**7.4 Appeals.** If you believe your account was terminated in error, contact support@tradeflowstudio.com within 30 days. We will review in good faith but reserve final discretion.`
  },
  {
    heading: '8. User Data and Content',
    body: `**8.1 Your Ownership.** You retain full ownership of all trading data, notes, and other content you submit ("User Content").

**8.2 Licence to Us.** You grant TradeFlow Studio a limited, non-exclusive, royalty-free, worldwide licence to process, store, display, and transmit your User Content solely to provide and improve the Service. This licence terminates when you delete the data or close your account.

**8.3 Responsibility.** You are solely responsible for the accuracy of data you enter.

**8.4 No Claim.** We will never claim ownership of your trading data, use it for advertising, sell it to third parties, or use it beyond delivering the Service.`
  },
  {
    heading: '9. Prohibited Uses',
    body: `You agree not to:
• Use the Service for any unlawful, fraudulent, or malicious purpose.
• Attempt to gain unauthorised access to any user's data or the Service's systems.
• Reverse engineer, decompile, or attempt to derive the source code of the Service.
• Copy, reproduce, or create derivative works of the Service without written permission.
• Use automated scripts, bots, crawlers, or scraping tools against the Service.
• Upload or transmit viruses, malware, or disruptive code.
• Engage in denial-of-service attacks or similar interference.
• Resell, sublicence, or commercialise the Service without prior written consent.
• Use the Service to develop a competing product or service.`
  },
  {
    heading: '10. Intellectual Property',
    body: `All software, algorithms, UI designs, graphics, trademarks, logos, and other intellectual property in or associated with the Service are the exclusive property of TradeFlow Studio or its licensors, protected by applicable IP laws.

Your licence to use the Service is: personal, non-exclusive, non-transferable, and revocable. "TradeFlow" and "TradeFlow Studio" are trademarks of TradeFlow Studio. You may not use our trademarks without prior written permission.`
  },
  {
    heading: '11. Force Majeure',
    body: `TradeFlow Studio shall not be liable for any failure or delay caused by circumstances beyond our reasonable control, including:
• Acts of God, natural disasters, floods, fires, or earthquakes.
• Acts of government, war, terrorism, civil unrest, or public health emergencies.
• Infrastructure failures by third-party providers (AWS, Supabase, Netlify, Stripe, Google) outside our direct control.
• Internet outages, DDoS attacks, or widespread cybersecurity incidents.
• Epidemics or pandemics.

Our obligations shall be suspended for the duration of such events. We will make reasonable efforts to notify affected users and resume the Service promptly.`
  },
  {
    heading: '12. Limitation of Liability',
    body: `TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW:

**12.1** TRADEFLOW STUDIO, ITS DIRECTORS, EMPLOYEES, AGENTS, LICENSORS, AND SERVICE PROVIDERS SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, EXEMPLARY, OR PUNITIVE DAMAGES, INCLUDING: TRADING LOSSES, LOST PROFITS, LOSS OF DATA, BUSINESS OPPORTUNITIES, GOODWILL, OR REPUTATION.

**12.2** THESE EXCLUSIONS APPLY WHETHER BASED ON WARRANTY, CONTRACT, TORT (INCLUDING NEGLIGENCE), PRODUCT LIABILITY, OR ANY OTHER LEGAL THEORY, AND WHETHER OR NOT TRADEFLOW STUDIO HAS BEEN ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

**12.3 Liability Cap.** Our total aggregate liability for all claims shall not exceed the greater of: (a) the total amount paid by you to TradeFlow Studio in the **12 months** preceding the claim, or (b) **CAD $100**.

**12.4** Some jurisdictions do not allow these exclusions. In such jurisdictions, liability is limited to the greatest extent permitted by law.`
  },
  {
    heading: '13. Indemnification',
    body: `You agree to defend, indemnify, and hold harmless TradeFlow Studio and its officers, directors, employees, contractors, agents, licensors, and suppliers from any claims, damages, obligations, losses, liabilities, costs, and expenses (including reasonable legal fees) arising from:
• Your violation of any provision of these Terms or any applicable law.
• Your User Content, including any claim that it infringes a third party's rights.
• Your use or misuse of the Service.
• Any trading decision you make based on information from the Service.
• Your negligence, fraud, or wilful misconduct.

This obligation survives termination of these Terms.`
  },
  {
    heading: '14. Apple App Store Provisions (iOS)',
    body: `The following additional terms apply if you access the Service through an application obtained from the Apple App Store ("iOS App"):

**14.1 Acknowledgement.** These Terms are concluded between you and TradeFlow Studio only, and not with Apple Inc. ("Apple"). Apple is not responsible for the iOS App or its content.

**14.2 Scope of Licence.** The licence granted for the iOS App is limited to a non-transferable licence to use it on any Apple-branded device you own or control, as permitted by the Apple Media Services Terms and Conditions.

**14.3 Maintenance and Support.** Apple has absolutely no obligation to furnish any maintenance or support services for the iOS App. All maintenance and support is the sole responsibility of TradeFlow Studio.

**14.4 Warranty.** In the event of any failure of the iOS App to conform to any applicable warranty, you may notify Apple, and Apple will refund the purchase price (if any) to you. To the maximum extent permitted by law, Apple will have no other warranty obligation with respect to the iOS App.

**14.5 Product Claims.** TradeFlow Studio, not Apple, is responsible for addressing any claims relating to the iOS App, including product liability claims, failure to conform to legal requirements, and consumer protection claims.

**14.6 Third-Party IP.** In the event of a third-party intellectual property infringement claim related to the iOS App, TradeFlow Studio — not Apple — will be solely responsible for the investigation, defence, settlement, and discharge of that claim.

**14.7 Third-Party Beneficiary.** Apple and Apple's subsidiaries are third-party beneficiaries of these Terms as they relate to the iOS App. Upon your acceptance, Apple will have the right to enforce these Terms as a third-party beneficiary.

**14.8 Export Compliance.** You represent that: (i) you are not in a country subject to a U.S. Government embargo or designated as a "terrorist supporting" country; and (ii) you are not on any U.S. Government prohibited or restricted parties list.`
  },
  {
    heading: '15. Governing Law and Dispute Resolution',
    body: `**15.1 Governing Law.** These Terms and any dispute arising out of or in connection with them shall be governed by and construed in accordance with the laws of the **Province of Ontario, Canada**, and the federal laws of Canada applicable therein, without regard to conflict of law principles.

**15.2 Jurisdiction.** You irrevocably agree that the courts of **Ontario, Canada** shall have exclusive jurisdiction to settle any dispute or claim arising out of or in connection with these Terms or the Service.

**15.3 Informal Resolution.** Before initiating any formal proceedings, you agree to first attempt to resolve the dispute informally by contacting legal@tradeflowstudio.com. We will try to resolve within 30 days.

**15.4 Class Action Waiver.** To the extent permitted by applicable law, you waive any right to participate in a class action lawsuit or class-wide arbitration against TradeFlow Studio.

**15.5 Limitation Period.** Any claim must be filed within **one (1) year** after the cause of action accrued, or be permanently barred.`
  },
  {
    heading: '16. General Provisions',
    body: `**16.1 Entire Agreement.** These Terms together with our Privacy Policy constitute the entire agreement between you and TradeFlow Studio and supersede all prior agreements.

**16.2 Severability.** If any provision is found unlawful or unenforceable, it shall be severed; the remaining provisions continue in full force.

**16.3 Waiver.** Failure to enforce any right shall not constitute a waiver of that right.

**16.4 Assignment.** You may not assign these Terms without our written consent. We may freely assign our rights (including in connection with a merger or acquisition).

**16.5 Notices.** Legal notices to TradeFlow Studio must be sent to legal@tradeflowstudio.com. Notices to you will be sent to your registered email address.

**16.6 Language.** In the event of conflict between any translated version and the English version, the English version prevails.`
  },
  {
    heading: '17. Changes to These Terms',
    body: `For **material changes** affecting your rights or obligations, we will provide at least **14 days' notice** via email and in-app notice before the change takes effect. Continued use after the effective date constitutes acceptance.

For non-material changes (clarifications, contact updates), we will update the "Last Updated" date without prior notice.`
  },
  {
    heading: '18. Contact',
    body: `**Legal:** legal@tradeflowstudio.com
**Support:** support@tradeflowstudio.com
**Address:** TradeFlow Studio, Ontario, Canada`
  },
];

const PRIVACY_CONTENT = {
  title: 'Privacy Policy',
  effective: 'Effective Date: February 1, 2025 · Last Updated: February 2025',
  sections: PRIVACY_SECTIONS,
};

const TERMS_CONTENT = {
  title: 'Terms & Conditions',
  effective: 'Effective Date: February 1, 2025 · Last Updated: February 2025',
  sections: TERMS_SECTIONS,
};

// ─── Legal Modal ──────────────────────────────────────────────────────────────
export const LegalModal: React.FC<LegalModalProps> = ({ doc, onClose }) => {
  const content = doc === 'privacy' ? PRIVACY_CONTENT : TERMS_CONTENT;
  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200" />
      <div className="relative w-full max-w-2xl max-h-[85vh] bg-white rounded-[2rem] shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 zoom-in-95 duration-300">
        <div className="flex items-center justify-between px-8 py-6 border-b border-black/5 flex-shrink-0">
          <div>
            <h2 className="text-lg font-black tracking-tight text-black">{content.title}</h2>
            <p className="text-[9px] font-bold text-black/30 uppercase tracking-widest mt-0.5">{content.effective}</p>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-xl bg-black/5 flex items-center justify-center text-black/40 hover:text-black hover:bg-black/10 transition-all">
            <ICONS.Close className="w-4 h-4" />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 px-8 py-6 space-y-6">
          {content.sections.map((section, i) => (
            <div key={i}>
              <h3 className="text-[11px] font-black uppercase tracking-widest text-black mb-2">{section.heading}</h3>
              <div className="text-[11px] text-black/60 leading-relaxed">
                {section.body.split('\n').map((line, j) => {
                  const parts = line.split(/\*\*(.*?)\*\*/g);
                  return (
                    <p key={j} className={`${line.startsWith('•') ? 'pl-2' : ''} mb-1.5`}>
                      {parts.map((part, k) => k % 2 === 1 ? <strong key={k} className="text-black font-black">{part}</strong> : part)}
                    </p>
                  );
                })}
              </div>
            </div>
          ))}
          <div className="h-6" />
        </div>
        <div className="px-8 py-5 border-t border-black/5 flex-shrink-0 bg-black/[0.02]">
          <button onClick={onClose} className="w-full py-4 bg-black text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-lg active:scale-95 transition-all">Close</button>
        </div>
      </div>
    </div>
  );
};

// ─── Terms Acceptance Gate ────────────────────────────────────────────────────
interface TermsGateProps { onAccept: () => void; userName?: string; }

export const TermsAcceptanceGate: React.FC<TermsGateProps> = ({ onAccept, userName }) => {
  const [accepted, setAccepted] = useState(false);
  const [openDoc, setOpenDoc] = useState<LegalDoc | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);

  const handleConfirm = async () => {
    if (!accepted) return;
    setIsConfirming(true);
    localStorage.setItem('tf_terms_accepted', new Date().toISOString());
    await new Promise(r => setTimeout(r, 500));
    onAccept();
  };

  return (
    <>
      <div className="min-h-[100dvh] bg-[#D6D6D6] flex items-center justify-center p-4 overflow-hidden relative">
        <div className="fixed top-[-20%] left-[-10%] w-[500px] h-[500px] bg-black/[0.03] rounded-full blur-[100px] pointer-events-none" />
        <div className="fixed bottom-[-20%] right-[-10%] w-[400px] h-[400px] bg-black/[0.04] rounded-full blur-[90px] pointer-events-none" />
        <div className="w-full max-w-md relative z-10 animate-in fade-in zoom-in-95 duration-500">
          <div className="apple-glass rounded-[3rem] p-10 shadow-2xl border border-white/60">
            <div className="flex justify-center mb-7">
              <div className="w-16 h-16 bg-black rounded-[1.5rem] flex items-center justify-center shadow-2xl">
                <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                </svg>
              </div>
            </div>
            <div className="text-center mb-6">
              <h1 className="text-2xl font-black tracking-tighter text-black leading-none mb-2">
                {userName ? `Welcome, ${userName.split(' ')[0]}!` : 'One Last Step'}
              </h1>
              <p className="text-[10px] font-bold text-black/40 uppercase tracking-[0.2em]">Review and accept our terms to continue</p>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-6">
              <p className="text-[10px] font-black text-amber-700 uppercase tracking-wider mb-1">⚠️ Risk Warning</p>
              <p className="text-[10px] text-amber-700/80 leading-relaxed">Trading is risky and the vast majority of traders lose money. TradeFlow Studio does not provide financial advice and is not responsible for any trading losses.</p>
            </div>
            <div className="space-y-3 mb-7">
              {([
                { id: 'terms' as LegalDoc, title: 'Terms & Conditions', desc: 'Usage, billing, liability & Apple provisions' },
                { id: 'privacy' as LegalDoc, title: 'Privacy Policy', desc: 'GDPR · CCPA · PIPEDA compliant' },
              ]).map(({ id, title, desc }) => (
                <button key={id} onClick={() => setOpenDoc(id)} className="w-full flex items-center gap-4 bg-white/60 hover:bg-white/80 border border-black/5 hover:border-black/10 rounded-2xl p-4 text-left transition-all group">
                  <div className="w-9 h-9 bg-black/5 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-black/10 transition-all">
                    <svg className="w-4 h-4 text-black/50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-black text-black">{title}</p>
                    <p className="text-[9px] text-black/40 font-bold mt-0.5">{desc}</p>
                  </div>
                  <svg className="w-4 h-4 text-black/20 group-hover:text-black/40 transition-colors flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                </button>
              ))}
            </div>
            <label className="flex items-start gap-3 cursor-pointer mb-7 group">
              <div
                className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all ${accepted ? 'bg-black border-black' : 'border-black/20 bg-white group-hover:border-black/40'}`}
                onClick={() => setAccepted(!accepted)}
              >
                {accepted && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
              </div>
              <span className="text-[11px] text-black/50 leading-relaxed font-medium" onClick={() => setAccepted(!accepted)}>
                I have read and agree to the{' '}
                <button type="button" onClick={(e) => { e.stopPropagation(); setOpenDoc('terms'); }} className="text-black font-black underline decoration-black/30 hover:decoration-black transition-all">Terms & Conditions</button>
                {' '}and{' '}
                <button type="button" onClick={(e) => { e.stopPropagation(); setOpenDoc('privacy'); }} className="text-black font-black underline decoration-black/30 hover:decoration-black transition-all">Privacy Policy</button>.
                {' '}I understand that trading involves substantial risk and TradeFlow Studio does not provide financial advice.
              </span>
            </label>
            <button
              onClick={handleConfirm}
              disabled={!accepted || isConfirming}
              className={`w-full py-5 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] shadow-xl transition-all flex items-center justify-center gap-3 ${accepted ? 'bg-black text-white hover:scale-[1.02] active:scale-[0.98]' : 'bg-black/10 text-black/30 cursor-not-allowed'}`}
            >
              {isConfirming ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Confirming...</> : 'Accept & Enter TradeFlow →'}
            </button>
            <p className="text-center text-[8px] text-black/20 font-bold mt-4 uppercase tracking-widest">Governed by Ontario, Canada law · v2025.02</p>
          </div>
        </div>
      </div>
      {openDoc && <LegalModal doc={openDoc} onClose={() => setOpenDoc(null)} />}
    </>
  );
};

export default LegalModal;
