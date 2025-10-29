"use client";
import { useInView } from "react-intersection-observer";
import { useState } from "react";
import HomeNavbar from "./components/HomeNavbar";
import SectionA from "./components/SectionA";
import SectionB from "./components/SectionB";
import Footer from "./components/Footer";

export default function HomePage() {
  const { ref: sectionARef, inView: sectionAInView } = useInView({ triggerOnce: true, threshold: 0.1 });
  const { ref: sectionBRef, inView: sectionBInView } = useInView({ triggerOnce: true, threshold: 0.1 });
  const { ref: footerRef, inView: footerInView } = useInView({ triggerOnce: true, threshold: 0.1 });
  const [sectionBLoaded, setSectionBLoaded] = useState(false);
  const [footerLoaded, setFooterLoaded] = useState(false);

  if (sectionBInView && !sectionBLoaded) setSectionBLoaded(true);
  if (footerInView && !footerLoaded) setFooterLoaded(true);

  return (
    <div style={{ background: "#fff", overflow: "hidden" }}>
      <HomeNavbar />
      <div ref={sectionARef} style={{ minHeight: 10 }} />
      <SectionA inView={sectionAInView} />
      <div ref={sectionBRef} style={{ minHeight: 10 }} />
      {sectionBLoaded && <SectionB inView={sectionBInView} />}
      <div ref={footerRef} style={{ minHeight: 10 }} />
      {footerLoaded && <Footer />}
    </div>
  );
}