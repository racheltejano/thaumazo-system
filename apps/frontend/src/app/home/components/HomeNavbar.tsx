"use client";
import Image from "next/image";
import Link from "next/link";

const ORANGE = "#FF3C02";

function HomeNavbar({ hideAuthButtons = false }: { hideAuthButtons?: boolean }) {
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
        <Link href="/home">
          <Image
            src="/thaumazo-text-logo.png"
            alt="Thaumazo Text Logo"
            width={140}
            height={32}
            style={{ objectFit: "contain", cursor: "pointer" }}
          />
        </Link>
      </div>
      {!hideAuthButtons && (
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
          <Link href="/client" style={{ textDecoration: "none" }}>
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
             I'm a Customer
            </button>
          </Link>
        </div>
      )}
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

export default HomeNavbar; 