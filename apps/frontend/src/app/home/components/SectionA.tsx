"use client";
import Image from "next/image";
import { useState, useEffect } from "react";
import InfoBox from "./InfoBox";

const ORANGE = "#FF3C02";

interface SectionProps {
  inView: boolean;
}

function SectionA({ inView }: SectionProps) {
  const [showHero, setShowHero] = useState(false);
  const [showSubtitle, setShowSubtitle] = useState(false);
  const [showButton, setShowButton] = useState(false);
  const [showFeatures, setShowFeatures] = useState(false);
  const [showDescription, setShowDescription] = useState(false);

  useEffect(() => {
    if (inView) {
      setTimeout(() => setShowHero(true), 100);
      setTimeout(() => setShowSubtitle(true), 400);
      setTimeout(() => setShowButton(true), 700);
      setTimeout(() => setShowFeatures(true), 1000);
      setTimeout(() => setShowDescription(true), 1300);
    }
  }, [inView]);

  const infoBoxes = [
    {
      icon: "/mission-icon.svg",
      title: "Mission",
      description: "To help products and services providers become profitable while we make every vehicle for Filipino become available.",
      delay: 1600
    },
    {
      icon: "/vision-icon.svg",
      title: "Vision",
      description: "To help online sellers and startups earn more while giving buyers smarter, money-saving options.",
      delay: 1800
    },
    {
      icon: "/commitment-icon.svg",
      title: "Commitments",
      description: "To make every vehicle accessible to Bulakenyos and help more Filipinos move toward their goals.",
      delay: 2000
    },
    {
      icon: "/people-icon.svg",
      title: "Our People",
      description: "We equip our team with the right skills to deliver each brand's promise—safely, consistently, and efficiently.",
      delay: 2200
    }
  ];

  return (
    <section
      style={{
        background: "linear-gradient(135deg, #F8FAFF 0%, #F0F5FF 100%)",
        display: "block",
        paddingTop: 80,
        paddingBottom: 100,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Decorative background elements */}
      <div style={{
        position: "absolute",
        top: -100,
        right: -100,
        width: 400,
        height: 400,
        borderRadius: "50%",
        background: "radial-gradient(circle, rgba(255,60,2,0.08) 0%, transparent 70%)",
        filter: "blur(60px)",
        pointerEvents: "none",
      }} />
      <div style={{
        position: "absolute",
        bottom: -150,
        left: -150,
        width: 500,
        height: 500,
        borderRadius: "50%",
        background: "radial-gradient(circle, rgba(17,17,17,0.05) 0%, transparent 70%)",
        filter: "blur(80px)",
        pointerEvents: "none",
      }} />

      <div style={{
        width: "100vw",
        boxSizing: "border-box",
        paddingLeft: "10vw",
        paddingRight: "10vw",
        position: "relative",
        zIndex: 1,
      }}>
        {/* Hero Section */}
        <div style={{
          maxWidth: 1200,
          margin: "0 auto",
          textAlign: "center",
          marginBottom: 80,
        }}>
          <h1
            style={{
              fontFamily: "Poppins, sans-serif",
              fontSize: "clamp(36px, 5vw, 64px)",
              fontWeight: 800,
              marginBottom: 24,
              lineHeight: 1.2,
              background: "linear-gradient(135deg, #111 0%, #333 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              opacity: showHero ? 1 : 0,
              transform: showHero ? "translateY(0)" : "translateY(60px)",
              transition: "all 0.8s cubic-bezier(0.16, 1, 0.3, 1)",
            }}
          >
            Fast, Safe, and Reliable Delivery<br />Across the Philippines
          </h1>
          
          <p
            style={{
              fontFamily: "Poppins, sans-serif",
              fontSize: "clamp(18px, 2vw, 24px)",
              fontWeight: 400,
              color: "#555",
              marginBottom: 48,
              lineHeight: 1.6,
              opacity: showSubtitle ? 1 : 0,
              transform: showSubtitle ? "translateY(0)" : "translateY(40px)",
              transition: "all 0.8s cubic-bezier(0.16, 1, 0.3, 1)",
            }}
          >
            Real-time tracking • Flexible fleet • Transparent pricing
          </p>

          {/* CTA Button */}
          <div style={{
            opacity: showButton ? 1 : 0,
            transform: showButton ? "translateY(0) scale(1)" : "translateY(20px) scale(0.95)",
            transition: "all 0.8s cubic-bezier(0.16, 1, 0.3, 1)",
          }}>
            <a href="/track" style={{ textDecoration: "none" }}>
              <button
                style={{
                  background: `linear-gradient(135deg, ${ORANGE} 0%, #FF5722 100%)`,
                  color: "#fff",
                  fontFamily: "Poppins, sans-serif",
                  fontWeight: 600,
                  fontSize: 20,
                  border: "none",
                  borderRadius: 16,
                  boxShadow: "0 8px 32px rgba(255,60,2,0.3)",
                  padding: "18px 48px",
                  cursor: "pointer",
                  outline: "none",
                  transition: "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
                  position: "relative",
                  overflow: "hidden",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-4px)";
                  e.currentTarget.style.boxShadow = "0 12px 48px rgba(255,60,2,0.4)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "0 8px 32px rgba(255,60,2,0.3)";
                }}
              >
                Track Your Order Now →
              </button>
            </a>
          </div>
        </div>

        {/* Feature Cards - 3 columns */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "32px",
            marginBottom: 80,
            maxWidth: 1200,
            margin: "0 auto 80px auto",
            opacity: showFeatures ? 1 : 0,
            transform: showFeatures ? "translateY(0)" : "translateY(40px)",
            transition: "all 0.8s cubic-bezier(0.16, 1, 0.3, 1)",
          }}
        >
          {[
            { icon: "📍", title: "GPS Tracking", desc: "Real-time location updates at every milestone" },
            { icon: "🚚", title: "Flexible Fleet", desc: "Right vehicle for every delivery need" },
            { icon: "💰", title: "Smart Pricing", desc: "Transparent rates with no hidden fees" },
          ].map((feature, idx) => (
            <div
              key={idx}
              style={{
                background: "rgba(255, 255, 255, 0.8)",
                backdropFilter: "blur(10px)",
                borderRadius: 20,
                padding: "32px 28px",
                textAlign: "center",
                border: "1px solid rgba(17, 17, 17, 0.08)",
                boxShadow: "0 4px 24px rgba(0,0,0,0.06)",
                transition: "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-8px)";
                e.currentTarget.style.boxShadow = "0 12px 40px rgba(0,0,0,0.12)";
                e.currentTarget.style.borderColor = ORANGE;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "0 4px 24px rgba(0,0,0,0.06)";
                e.currentTarget.style.borderColor = "rgba(17, 17, 17, 0.08)";
              }}
            >
              <div style={{ fontSize: 48, marginBottom: 16 }}>{feature.icon}</div>
              <h3 style={{
                fontFamily: "Poppins, sans-serif",
                fontSize: 22,
                fontWeight: 700,
                marginBottom: 12,
                color: "#111",
              }}>
                {feature.title}
              </h3>
              <p style={{
                fontFamily: "Poppins, sans-serif",
                fontSize: 15,
                color: "#666",
                lineHeight: 1.6,
                margin: 0,
              }}>
                {feature.desc}
              </p>
            </div>
          ))}
        </div>

        {/* Value Proposition */}
        <div
          style={{
            maxWidth: 900,
            margin: "0 auto 80px auto",
            padding: "48px 40px",
            background: "linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.7) 100%)",
            backdropFilter: "blur(20px)",
            borderRadius: 24,
            border: "1px solid rgba(17, 17, 17, 0.08)",
            boxShadow: "0 8px 40px rgba(0,0,0,0.08)",
            opacity: showDescription ? 1 : 0,
            transform: showDescription ? "translateY(0)" : "translateY(40px)",
            transition: "all 0.8s cubic-bezier(0.16, 1, 0.3, 1)",
          }}
        >
          <h2 style={{
            fontFamily: "Poppins, sans-serif",
            fontSize: 28,
            fontWeight: 700,
            marginBottom: 24,
            color: "#111",
            textAlign: "center",
          }}>
            Technology-Driven Trust
          </h2>
          <p
            style={{
              fontFamily: "Poppins, sans-serif",
              fontSize: 17,
              fontWeight: 400,
              color: "#444",
              lineHeight: 1.8,
              textAlign: "center",
              margin: 0,
            }}
          >
            We trust and give value to your business through our technology. Our real-time milestone tracking and GPS integration provide assurance with time-critical delivery updates from pickup to final destination. We secure client trust through state-of-the-art processes agreed upon by stakeholders and partners, making us different from traditional delivery services.
          </p>
        </div>

        {/* Info boxes grid - 4 columns */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: "28px",
            maxWidth: 1200,
            margin: "0 auto",
          }}
        >
          {infoBoxes.map((box, index) => (
            <InfoBox
              key={index}
              icon={box.icon}
              title={box.title}
              description={box.description}
              delay={box.delay}
              inView={inView}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

export default SectionA;