import type {Metadata} from "next";
import {notFound} from "next/navigation";
import {VedicD1AccountLibrary} from "@/components/vedic/VedicD1AccountLibrary";
import {isVedicD1StorageReady,isVedicD1CheckoutReady} from "@/lib/vedic/vedic-d1-payment-config";
import {UUID} from "@/lib/vedic/vedic-d1-payment-flow";
import reportStyles from "@/components/report/human-first-report.module.css";
import styles from "@/components/vedic/vedic-d1-guest.module.css";

export const dynamic="force-dynamic";
export const metadata:Metadata={title:"گزارش چارت تولد ودیک | هالیوس",robots:{index:false,follow:false}};

export default async function VedicSavedReportPage({params}:{params:Promise<{reportId:string}>}){
 const {reportId}=await params;
 if(!UUID.test(reportId)||!isVedicD1StorageReady())notFound();
 return <section className="report-detail-reader-page report-product-page" data-report-source="vedic-account" dir="rtl">
  <div className={reportStyles.reader+" "+styles.vedicReader}>
   <div aria-hidden="true" className={reportStyles.ambientLogo} data-report-ambient-logo="parallax"/>
   <VedicD1AccountLibrary key={reportId} directReportId={reportId} checkoutEnabled={isVedicD1CheckoutReady()}/>
  </div>
 </section>;
}
