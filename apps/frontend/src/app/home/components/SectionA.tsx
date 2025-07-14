"use client";
import Image from "next/image";
import { useState, useEffect } from "react";
import InfoBox from "./InfoBox";

const ORANGE = "#FF3C02";

interface SectionProps {
  inView: boolean;
}

function SectionA({ inView }: SectionProps) {
  // Animation state for staged loading
  const [showTitle, setShowTitle] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [showTrack, setShowTrack] = useState(false);
  const [showDesc, setShowDesc] = useState(false);

  useEffect(() => {
    if (inView) {
      setTimeout(() => setShowTitle(true), 80);
      setTimeout(() => setShowCreate(true), 350);
      setTimeout(() => setShowTrack(true), 600);
      setTimeout(() => setShowDesc(true), 900);
    }
  }, [inView]);

  // Info box data - easy to add more boxes
  const infoBoxes = [
    {
      icon: "/mission-icon.svg",
      title: "Mission",
      description: "To help products and services providers become profitable while we make every vehicle for Filipino become available.",
      delay: 1200
    },
    {
      icon: "/vision-icon.svg",
      title: "Vision",
      description: "To help online sellers and startups earn more while giving buyers smarter, money-saving options.",
      delay: 1400
    },
    {
      icon: "/commitment-icon.svg",
      title: "Commitments",
      description: "To make every vehicle accessible to Bulakenyos and help more Filipinos move toward their goals.",
      delay: 1600
    },
    {
      icon: "/people-icon.svg",
      title: "Our People",
      description: "We equip our taeam with the right skills to deliver each brand's promise—safely, consistently, and efficiently.",
      delay: 1800
    }
  ];

  return (
    <section
      style={{
        background: "#fff",
        display: "block",
        paddingTop: 48,
        paddingBottom: 72,
        fontSize: 24,
        fontWeight: 400,
        position: "relative",
      }}
    >
      <div style={{
        width: "100vw",
        boxSizing: "border-box",
        paddingLeft: "15vw",
        paddingRight: "15vw",
        textAlign: "center",
        margin: 0,
      }}>
        <h1
          style={{
            fontFamily: "Poppins, sans-serif",
            fontSize: 32,
            fontWeight: 700,
            marginBottom: 18,
            textAlign: "center",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            width: "100%",
            maxWidth: "100%",
            lineHeight: 1.2,
            marginLeft: "auto",
            marginRight: "auto",
            opacity: showTitle ? 1 : 0,
            transform: showTitle ? "translateY(0)" : "translateY(40px)",
            transition: "opacity 0.6s cubic-bezier(.4,0,.2,1), transform 0.6s cubic-bezier(.4,0,.2,1)",
          }}
          title="Fast, Safe, and Reliable Delivery Across the Philippines"
        >
          Fast, Safe, and Reliable Delivery Across the Philippines
        </h1>
        <div
          style={{
            fontFamily: "Poppins, sans-serif",
            fontSize: 20,
            fontWeight: 400,
            marginBottom: 36,
            textAlign: "center",
            color: "#222",
            opacity: showTitle ? 1 : 0,
            transform: showTitle ? "translateY(0)" : "translateY(40px)",
            transition: "opacity 0.6s cubic-bezier(.4,0,.2,1), transform 0.6s cubic-bezier(.4,0,.2,1)",
            transitionDelay: showTitle ? "0.1s" : "0s",
          }}
        >
          Real-time tracking • Flexible fleet • Transparent pricing
        </div>
        <div style={{ display: "flex", justifyContent: "center", gap: 18, marginTop: 10 }}>
          <a href="/create-order">
            <button
              className="sectiona-btn sectiona-create"
              id="create-order-btn"
              style={{
                background: "#111",
                color: "#fff",
                fontFamily: "var(--font-geist-sans), Arial, sans-serif",
                fontWeight: 400,
                fontSize: 20,
                border: "none",
                borderRadius: 10,
                boxShadow: "0 2px 8px rgba(0,0,0,0.14)",
                padding: "0.7em 2.2em",
                marginRight: 8,
                cursor: "pointer",
                outline: "none",
                opacity: showCreate ? 1 : 0,
                transform: showCreate ? "scale(1)" : "scale(0.8)",
                transitionDelay: showCreate ? "0.1s" : "0s",
              }}
            >
              Create Order
            </button>
          </a>
          <a href="/track">
            <button
              className="sectiona-btn sectiona-track"
              id="track-order-btn"
              style={{
                background: ORANGE,
                color: "#fff",
                fontFamily: "var(--font-geist-sans), Arial, sans-serif",
                fontWeight: 400,
                fontSize: 20,
                border: "none",
                borderRadius: 10,
                boxShadow: "0 2px 8px rgba(0,0,0,0.14)",
                padding: "0.7em 2.2em",
                marginLeft: 8,
                cursor: "pointer",
                outline: "none",
                opacity: showTrack ? 1 : 0,
                transform: showTrack ? "scale(1)" : "scale(0.8)",
                transitionDelay: showTrack ? "0.1s" : "0s",
              }}
            >
              Track Order
            </button>
          </a>
        </div>
        <div
          style={{
            fontFamily: "Poppins, sans-serif",
            fontSize: 20,
            fontWeight: 400,
            marginTop: 36,
            textAlign: "left",
            color: "#222",
            width: "100%",
            boxSizing: "border-box",
            opacity: showDesc ? 1 : 0,
            transform: showDesc ? "translateY(0)" : "translateY(40px)",
            transition: "opacity 0.7s cubic-bezier(.4,0,.2,1), transform 0.7s cubic-bezier(.4,0,.2,1)",
          }}
        >
          We trust and give value to your business through our technology, this is why we are making ourselves different from those immersing businesses as we heavily invest with the real-time milestone tracking and GPS Integration. This is where we take bold steps in providing assurance to our client how time-critical delivery updates them until it reaches its final destination. Securing trust of clients through our state of the art process both agreed by our stakeholders and partners.<br /><br />
          Our shared services partners are provided with a strategic methodology to provide a sustainable cost savings support making both client and partner feel the support of a stable Customer Support Process based on the most applicable technology regardless of any location.
        </div>
        
        {/* Info boxes grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
            gap: "2rem",
            marginTop: "2rem",
            width: "100%",
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