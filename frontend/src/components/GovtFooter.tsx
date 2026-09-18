import { Link } from "@tanstack/react-router";
import { ShieldCheck, Phone, Mail, Building, ExternalLink, Activity } from "lucide-react";
import { GovtNationalEmblem } from "./GovtNationalEmblem";
import { useLanguage } from "@/context/LanguageContext";

export function GovtFooter() {
  const { t } = useLanguage();

  return (
    <footer className="border-t-2 border-[#003366] bg-slate-900 text-slate-300 text-xs select-none">
      {/* Tricolor Accent Stripe */}
      <div className="tricolor-stripe w-full" />

      <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
          {/* Col 1: Portal Overview */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <GovtNationalEmblem className="size-10 shrink-0" />
              <div>
                <p className="font-bold text-white text-sm">
                  {t("INDIAN RAILWAYS", "भारतीय रेल")}
                </p>
                <p className="text-[11px] text-slate-400">
                  {t("Ministry of Railways, Govt of India", "रेल मंत्रालय, भारत सरकार")}
                </p>
              </div>
            </div>
            <p className="text-[11px] leading-relaxed text-slate-400">
              {t(
                "IR-ABPS (Automatic Block Planning System) is a centralized AI-driven corridor optimization engine integrating COA, BDMS, TMS, SMMS, and TDMS to maximize sectional capacity and ensure zero-conflict maintenance blocks.",
                "आईआर-एबीपीएस (स्वचालित ब्लॉक नियोजन प्रणाली) एक केंद्रीकृत एआई-संचालित अनुकूलन इंजन है जो अनुभागीय क्षमता को अधिकतम करने और शून्य-विवाद ब्लॉक सुनिश्चित करने के लिए एकीकृत है।"
              )}
            </p>
            <div className="flex items-center gap-2 text-[11px] text-emerald-400 font-semibold">
              <Activity className="size-3.5" />
              <span>{t("System Health: 99.98% Uptime", "सिस्टम स्थिति: 99.98% ऑनलाइन")}</span>
            </div>
          </div>

          {/* Col 2: Integrated Portals */}
          <div className="space-y-3">
            <h3 className="font-bold uppercase tracking-wider text-white text-xs border-b border-slate-700 pb-1.5">
              {t("Integrated Systems", "एकीकृत प्रणालियां")}
            </h3>
            <ul className="space-y-1.5 text-[11px] text-slate-300">
              <li>
                <span className="text-[#FF9933] font-semibold mr-1.5">•</span>
                {t("COA – Control Office Application (Live)", "सीओए – नियंत्रण कार्यालय अनुप्रयोग (लाइव)")}
              </li>
              <li>
                <span className="text-[#FF9933] font-semibold mr-1.5">•</span>
                {t("TMS – Track Management System (Civil)", "टीएमएस – रेल पथ प्रबंधन प्रणाली")}
              </li>
              <li>
                <span className="text-[#FF9933] font-semibold mr-1.5">•</span>
                {t("SMMS – Signaling & Telecom Maintenance", "एसएमएमएस – सिग्नल एवं दूरसंचार प्रणाली")}
              </li>
              <li>
                <span className="text-[#FF9933] font-semibold mr-1.5">•</span>
                {t("TDMS – Traction Distribution Management", "टीडीएमएस – विद्युत कर्षण वितरण प्रणाली")}
              </li>
              <li>
                <span className="text-[#FF9933] font-semibold mr-1.5">•</span>
                {t("FOIS – Freight Operations Information System", "एफओआईएस – माल यातायात सूचना प्रणाली")}
              </li>
              <li>
                <span className="text-[#FF9933] font-semibold mr-1.5">•</span>
                {t("ICMS – Integrated Coaching Management System", "आईसीएमएस – एकीकृत कोचिंग प्रबंधन")}
              </li>
            </ul>
          </div>

          {/* Col 3: Govt Compliance & Policies */}
          <div className="space-y-3">
            <h3 className="font-bold uppercase tracking-wider text-white text-xs border-b border-slate-700 pb-1.5">
              {t("Government Mandates & Policies", "सरकारी नीतियां एवं दिशानिर्देश")}
            </h3>
            <ul className="space-y-1.5 text-[11px] text-slate-300">
              <li>
                <a href="#main-content" className="hover:text-white transition-colors">
                  {t("Right to Information (RTI Act 2005)", "सूचना का अधिकार (आरटीआई अधिनियम 2005)")}
                </a>
              </li>
              <li>
                <a href="#main-content" className="hover:text-white transition-colors">
                  {t("Accessibility Statement (GIGW 3.0)", "सुलभता विवरण (जीआईजीडब्ल्यू 3.0)")}
                </a>
              </li>
              <li>
                <a href="#main-content" className="hover:text-white transition-colors">
                  {t("Citizen Charter & Vigilance", "नागरिक घोषणापत्र एवं सतर्कता")}
                </a>
              </li>
              <li>
                <a href="#main-content" className="hover:text-white transition-colors">
                  {t("Terms of Use & Copyright Policy", "उपयोग की शर्तें एवं कॉपीराइट नीति")}
                </a>
              </li>
              <li>
                <a href="#main-content" className="hover:text-white transition-colors">
                  {t("Hyperlinking & Privacy Policy", "हाइपरलिंकिंग एवं गोपनीयता नीति")}
                </a>
              </li>
              <li>
                <a href="#main-content" className="hover:text-white transition-colors">
                  {t("Disaster & Emergency Protocol Guidelines", "आपदा एवं आपातकालीन संरक्षा नियम")}
                </a>
              </li>
            </ul>
          </div>

          {/* Col 4: National Helpline & Support */}
          <div className="space-y-3">
            <h3 className="font-bold uppercase tracking-wider text-white text-xs border-b border-slate-700 pb-1.5">
              {t("Helpline & Support", "हेल्पलाइन एवं सहायता")}
            </h3>
            <div className="space-y-2 text-[11px]">
              <div className="flex items-start gap-2">
                <Phone className="size-3.5 text-[#FF9933] mt-0.5" />
                <div>
                  <p className="font-bold text-white">
                    {t("Rail Madad 24x7: 139", "रेल मदद 24x7: 139")}
                  </p>
                  <p className="text-slate-400">
                    {t("Security & Operational Helpline", "सुरक्षा एवं परिचालन हेल्पलाइन")}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Building className="size-3.5 text-[#FF9933] mt-0.5" />
                <div>
                  <p className="font-bold text-white">
                    {t("Railway Board, Rail Bhavan", "रेलवे बोर्ड, रेल भवन")}
                  </p>
                  <p className="text-slate-400">
                    {t("Raisina Road, New Delhi – 110001", "रायसीना रोड, नई दिल्ली – 110001")}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Mail className="size-3.5 text-[#FF9933] mt-0.5" />
                <div>
                  <p className="text-slate-400">
                    {t("CRIS Technical Desk: helpdesk@cris.org.in", "क्रिस तकनीकी डेस्क: helpdesk@cris.org.in")}
                  </p>
                </div>
              </div>
              <div className="pt-1 text-[10px] text-slate-400">
                <p>
                  {t("Deployment:", "संस्करण:")} <span className="text-white font-mono">v2.4.0 (Enterprise Server)</span>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar: Copyright & Visitor Counter */}
        <div className="mt-8 border-t border-slate-800 pt-4 text-[11px] text-slate-400 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
          <div>
            <p>
              {t(
                "© Content Owned, Updated and Maintained by Ministry of Railways, Government of India.",
                "© सामग्री स्वामित्व, अद्यतन एवं प्रबंधन: रेल मंत्रालय, भारत सरकार।"
              )}
            </p>
            <p className="text-[10px] text-slate-500">
              {t(
                "Designed, Developed and Hosted by Centre for Railway Information Systems (CRIS) / National Informatics Centre.",
                "अभिकल्पित, विकसित एवं होस्ट किया गया: रेलवे सूचना प्रणाली केंद्र (क्रिस) / राष्ट्रीय सूचना विज्ञान केंद्र।"
              )}
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 text-[10px]">
            <span className="rounded bg-slate-800 px-2.5 py-1 text-slate-300 border border-slate-700 font-mono">
              {t("Total Visitors:", "कुल आगंतुक:")} <strong className="text-[#FF9933]">1,482,904</strong>
            </span>
            <span>{t("Last Updated: 18/09/2026", "अंतिम अद्यतन: 18/09/2026")}</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
