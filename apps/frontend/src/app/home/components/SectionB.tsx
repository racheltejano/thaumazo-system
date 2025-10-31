"use client";
import { ReactNode, useState, useEffect } from "react";

const ORANGE = "#FF3C02";

interface AnimatedSectionProps {
  children: ReactNode;
  inView: boolean;
  delay?: number;
}

function AnimatedSection({ children, inView, delay = 0 }: AnimatedSectionProps) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (inView) {
      setTimeout(() => setShow(true), delay);
    }
  }, [inView, delay]);

  return (
    <div
      style={{
        opacity: show ? 1 : 0,
        transform: show ? "translateY(0)" : "translateY(60px)",
        transition: "all 0.8s cubic-bezier(0.16, 1, 0.3, 1)",
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
  const stats = [
    { value: "10K+", label: "Deliveries Completed" },
    { value: "98%", label: "On-Time Rate" },
    { value: "500+", label: "Active Partners" },
    { value: "24/7", label: "Customer Support" },
  ];

  return (
    <section
      style={{
        background: `linear-gradient(135deg, ${ORANGE} 0%, #FF5722 100%)`,
        minHeight: 700,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "100px 10vw",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Background decorative elements */}
      <div style={{
        position: "absolute",
        top: -100,
        left: -100,
        width: 400,
        height: 400,
        borderRadius: "50%",
        background: "radial-gradient(circle, rgba(255,255,255,0.15) 0%, transparent 70%)",
        filter: "blur(60px)",
      }} />
      <div style={{
        position: "absolute",
        bottom: -150,
        right: -150,
        width: 500,
        height: 500,
        borderRadius: "50%",
        background: "radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%)",
        filter: "blur(80px)",
      }} />

      <div style={{ 
        maxWidth: 1200, 
        width: "100%",
        textAlign: "center",
        position: "relative",
        zIndex: 1,
      }}>
        <AnimatedSection inView={inView}>
          <h2 style={{
            fontFamily: "Poppins, sans-serif",
            fontSize: "clamp(32px, 4vw, 48px)",
            fontWeight: 800,
            color: "#fff",
            marginBottom: 24,
            lineHeight: 1.2,
          }}>
            Trusted by Businesses Across the Philippines
          </h2>
          
          <p style={{
            fontFamily: "Poppins, sans-serif",
            fontSize: "clamp(16px, 2vw, 20px)",
            color: "rgba(255,255,255,0.95)",
            marginBottom: 64,
            lineHeight: 1.7,
            maxWidth: 800,
            margin: "0 auto 64px auto",
          }}>
            From small businesses to enterprise clients, we deliver excellence with every shipment. 
            Our commitment to reliability and innovation sets us apart in the logistics industry.
          </p>
        </AnimatedSection>

        {/* Stats Grid */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "32px",
          marginTop: 48,
        }}>
          {stats.map((stat, idx) => (
            <AnimatedSection key={idx} inView={inView} delay={200 + idx * 150}>
              <div
                style={{
                  background: "rgba(255,255,255,0.15)",
                  backdropFilter: "blur(10px)",
                  borderRadius: 20,
                  padding: "40px 24px",
                  border: "1px solid rgba(255,255,255,0.2)",
                  transition: "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
                  cursor: "pointer",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-8px) scale(1.05)";
                  e.currentTarget.style.background = "rgba(255,255,255,0.25)";
                  e.currentTarget.style.boxShadow = "0 16px 48px rgba(0,0,0,0.2)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0) scale(1)";
                  e.currentTarget.style.background = "rgba(255,255,255,0.15)";
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                <div style={{
                  fontFamily: "Poppins, sans-serif",
                  fontSize: "clamp(36px, 5vw, 56px)",
                  fontWeight: 800,
                  color: "#fff",
                  marginBottom: 12,
                  letterSpacing: "-0.02em",
                }}>
                  {stat.value}
                </div>
                <div style={{
                  fontFamily: "Poppins, sans-serif",
                  fontSize: "clamp(14px, 1.5vw, 16px)",
                  fontWeight: 500,
                  color: "rgba(255,255,255,0.9)",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}>
                  {stat.label}
                </div>
              </div>
            </AnimatedSection>
          ))}
        </div>

        {/* CTA Section */}
        <AnimatedSection inView={inView} delay={800}>
          <div style={{ marginTop: 80 }}>
            <a href="/client" style={{ textDecoration: "none" }}>
              <button
                style={{
                  background: "#fff",
                  color: ORANGE,
                  fontFamily: "Poppins, sans-serif",
                  fontWeight: 600,
                  fontSize: 20,
                  border: "none",
                  borderRadius: 16,
                  boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
                  padding: "18px 48px",
                  cursor: "pointer",
                  transition: "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-4px) scale(1.05)";
                  e.currentTarget.style.boxShadow = "0 12px 48px rgba(0,0,0,0.3)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0) scale(1)";
                  e.currentTarget.style.boxShadow = "0 8px 32px rgba(0,0,0,0.2)";
                }}
              >
                Join Our Network Today →
              </button>
            </a>
          </div>
        </AnimatedSection>
      </div>
    </section>
  );
}

export default SectionB;