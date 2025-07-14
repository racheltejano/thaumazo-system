"use client";
import Image from "next/image";
import Link from "next/link";
import { useInView } from "react-intersection-observer";
import { useState, useEffect } from "react";

const ORANGE = "#FF3C02";

const fadeSlideUp = {
  initial: { opacity: 0, transform: "translateY(40px)" },
  animate: { opacity: 1, transform: "translateY(0)" },
};

function HomeNavbar() {
  return (
    <nav
      style={{
        background: "#F0F5FF",
        boxShadow: "0 2px 8px rgba(0,0,0,0.18)",
        padding: "0.75rem 3.5vw",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        position: "sticky",
        top: 0,
        zIndex: 10,
      }}
    >
      <div style={{ display: "flex", alignItems: "center" }}>
        <Image
          src="/thaumazo-text-logo.png"
          alt="Thaumazo Text Logo"
          width={140}
          height={32}
          style={{ objectFit: "contain" }}
        />
      </div>
      <div style={{ display: "flex", gap: "0.5rem" }}>
        <Link href="/login" style={{ textDecoration: "none" }}>
          <button
            className="home-navbar-btn home-navbar-login"
            style={{
              background: "#fff",
              color: "#000",
              borderRadius: 10,
              boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
              padding: "0.38rem 1rem",
              fontWeight: 500,
              border: "none",
              cursor: "pointer",
              transition: "background 0.15s, color 0.15s",
              fontSize: 20,
            }}
          >
            Login
          </button>
        </Link>
        <Link href="/register" style={{ textDecoration: "none" }}>
          <button
            className="home-navbar-btn home-navbar-signup"
            style={{
              background: ORANGE,
              color: "#fff",
              borderRadius: 10,
              boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
              padding: "0.38rem 1rem",
              fontWeight: 500,
              border: "none",
              cursor: "pointer",
              transition: "background 0.15s, color 0.15s",
              fontSize: 20,
            }}
          >
            Sign Up
          </button>
        </Link>
      </div>
      <style>{`
        .home-navbar-btn:hover {
          filter: brightness(0.92);
        }
        .sectiona-btn:hover {
          transform: scale(1.05) !important;
        }
        .info-box:hover {
          transform: scale(1.05);
          box-shadow: 0 8px 30px rgba(0,0,0,0.12);
        }
        .sectiona-btn {
          transition: transform 0.2s ease-out, box-shadow 0.2s ease-out !important;
        }
        .info-box {
          transition: transform 0.2s ease-out, box-shadow 0.2s ease-out !important;
        }
      `}</style>
    </nav>
  );
}

interface AnimatedSectionProps {
  children: React.ReactNode;
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

  return (
    <section
      style={{
        background: "#fff",
        minHeight: 1000,
        display: "block",
        paddingTop: 48,
        paddingBottom: 32,
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
        
        {/* Four white boxes */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
            gap: "2rem",
            marginTop: "2rem",
            width: "100%",
          }}
        >
          {/* Mission Box */}
          <div
            className="info-box"
            style={{
              background: "#fff",
              borderRadius: "16px",
              padding: "2rem",
              boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
              textAlign: "center",
              cursor: "pointer",
              border: "1px solid #f0f0f0",
            }}
          >
            <div style={{ marginBottom: "1rem", display: "flex", justifyContent: "center" }}>
              <Image src="/mission-icon.svg" alt="Mission Icon" width={48} height={48} style={{ display: "block" }} />
            </div>
            <h3 style={{
              fontFamily: "Poppins, sans-serif",
              fontSize: "1.5rem",
              fontWeight: "700",
              marginBottom: "0.75rem",
              color: "#222",
            }}>
              Mission
            </h3>
            <p style={{
              fontFamily: "Poppins, sans-serif",
              fontSize: "0.8rem",
              fontWeight: "400",
              color: "#666",
              lineHeight: "1.5",
              margin: 0,
            }}>
              To help products and services providers become profitable while we make every vehicle for Filipino become available.
            </p>
          </div>

          {/* Vision Box */}
          <div
            className="info-box"
            style={{
              background: "#fff",
              borderRadius: "16px",
              padding: "2rem",
              boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
              textAlign: "center",
              cursor: "pointer",
              border: "1px solid #f0f0f0",
            }}
          >
            <div style={{ marginBottom: "1rem", display: "flex", justifyContent: "center" }}>
              <Image src="/vision-icon.svg" alt="Vision Icon" width={48} height={48} style={{ display: "block" }} />
            </div>
            <h3 style={{
              fontFamily: "Poppins, sans-serif",
              fontSize: "1.5rem",
              fontWeight: "700",
              marginBottom: "0.75rem",
              color: "#222",
            }}>
              Vision
            </h3>
            <p style={{
              fontFamily: "Poppins, sans-serif",
              fontSize: "0.8rem",
              fontWeight: "400",
              color: "#666",
              lineHeight: "1.5",
              margin: 0,
            }}>
              To help online sellers and startups earn more while giving buyers smarter, money-saving options.
            </p>
          </div>

          {/* Commitments Box */}
          <div
            className="info-box"
            style={{
              background: "#fff",
              borderRadius: "16px",
              padding: "2rem",
              boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
              textAlign: "center",
              cursor: "pointer",
              border: "1px solid #f0f0f0",
            }}
          >
            <div style={{ marginBottom: "1rem", display: "flex", justifyContent: "center" }}>
              <Image src="/commitment-icon.svg" alt="Commitment Icon" width={48} height={48} style={{ display: "block" }} />
            </div>
            <h3 style={{
              fontFamily: "Poppins, sans-serif",
              fontSize: "1.5rem",
              fontWeight: "700",
              marginBottom: "0.75rem",
              color: "#222",
            }}>
              Commitments
            </h3>
            <p style={{
              fontFamily: "Poppins, sans-serif",
              fontSize: "0.8rem", 
              fontWeight: "400",
              color: "#666",
              lineHeight: "1.5",
              margin: 0,
            }}>
              To make every vehicle accessible to Bulakenyos and help more Filipinos move toward their goals.
            </p>
          </div>

          {/* Our People Box */}
          <div
            className="info-box"
            style={{
              background: "#fff",
              borderRadius: "16px",
              padding: "2rem",
              boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
              textAlign: "center",
              cursor: "pointer",
              border: "1px solid #f0f0f0",
            }}
          >
            <div style={{ marginBottom: "1rem", display: "flex", justifyContent: "center" }}>
              <Image src="/people-icon.svg" alt="People Icon" width={48} height={48} style={{ display: "block" }} />
            </div>
            <h3 style={{
              fontFamily: "Poppins, sans-serif",
              fontSize: "1.5rem",
              fontWeight: "700",
              marginBottom: "0.75rem",
              color: "#222",
            }}>
              Our People
            </h3>
            <p style={{
              fontFamily: "Poppins, sans-serif",
              fontSize: "0.8rem",
              fontWeight: "400",
              color: "#666",
              lineHeight: "1.5",
              margin: 0,
            }}>
              We equip our team with the right skills to deliver each brand’s promise—safely, consistently, and efficiently.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
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

function Footer() {
  return (
    <footer
      style={{
        width: "100%",
        background: "#222",
        color: "#fff",
        textAlign: "center",
        padding: "2rem 0 2rem 0",
        fontSize: 18,
      }}
    >
      © {new Date().getFullYear()} Thaumazo. All rights reserved.
    </footer>
  );
}

export default function HomePage() {
  const { ref: sectionARef, inView: sectionAInView } = useInView({ triggerOnce: true, threshold: 0.1 });
  const { ref: sectionBRef, inView: sectionBInView } = useInView({ triggerOnce: true, threshold: 0.1 });
  const { ref: footerRef, inView: footerInView } = useInView({ triggerOnce: true, threshold: 0.1 });
  const [sectionBLoaded, setSectionBLoaded] = useState(false);
  const [footerLoaded, setFooterLoaded] = useState(false);

  if (sectionBInView && !sectionBLoaded) setSectionBLoaded(true);
  if (footerInView && !footerLoaded) setFooterLoaded(true);

  return (
    <div style={{ minHeight: "100vh", background: "#fff" }}>
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