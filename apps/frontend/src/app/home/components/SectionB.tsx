"use client";
import { ReactNode } from "react";

const ORANGE = "#FF3C02";

interface AnimatedSectionProps {
  children: ReactNode;
  inView: boolean;
}

function AnimatedSection({ children, inView }: AnimatedSectionProps) {
  return (
    <div
      style={{
        opacity: inView ? 1 : 0,
        transform: inView ? "translateY(0)" : "translateY(40px)",
        transition: "opacity 0.7s cubic-bezier(.4,0,.2,1), transform 0.7s cubic-bezier(.4,0,.2,1)",
      }}
    >
      {children}
    </div>
  );
}

interface SectionProps {
  inView: boolean;
}

function SectionB({ inView }: SectionProps) {
  return (
    <section
      style={{
        background: ORANGE,
        minHeight: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 24,
        fontWeight: 400,
        color: "#fff",
      }}
    >
      <AnimatedSection inView={inView}>
        <div style={{ maxWidth: 700, textAlign: "center" }}>
          Lorem ipsum dolor sit amet, consectetur adipiscing elit. Pellentesque euismod, nisi eu consectetur consectetur, nisl nisi consectetur nisi, eu consectetur nisl nisi euismod nisi.
        </div>
      </AnimatedSection>
    </section>
  );
}

export default SectionB; 