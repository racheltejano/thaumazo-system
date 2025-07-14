"use client";
import Image from "next/image";
import { useState, useEffect } from "react";

interface InfoBoxProps {
  icon: string;
  title: string;
  description: string;
  delay: number;
  inView: boolean;
}

function InfoBox({ icon, title, description, delay, inView }: InfoBoxProps) {
  const [show, setShow] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    if (inView) {
      setTimeout(() => setShow(true), delay);
    }
  }, [inView, delay]);

  return (
    <div
      className="info-box"
      style={{
        background: "#fff",
        borderRadius: "16px",
        padding: "2rem",
        boxShadow: isHovered ? "0 8px 30px rgba(0,0,0,0.12)" : "0 4px 20px rgba(0,0,0,0.08)",
        textAlign: "center",
        cursor: "pointer",
        border: "1px solid #f0f0f0",
        opacity: show ? 1 : 0,
        transform: show ? (isHovered ? "translateY(0) scale(1.05)" : "translateY(0) scale(1)") : "translateY(40px) scale(1)",
        transition: "opacity 0.6s cubic-bezier(.4,0,.2,1), transform 0.6s cubic-bezier(.4,0,.2,1), box-shadow 0.2s ease-out",
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div style={{ marginBottom: "1rem", display: "flex", justifyContent: "center" }}>
        <Image src={icon} alt={`${title} Icon`} width={48} height={48} style={{ display: "block" }} />
      </div>
      <h3 style={{
        fontFamily: "Poppins, sans-serif",
        fontSize: "1.5rem",
        fontWeight: "700",
        marginBottom: "0.75rem",
        color: "#222",
      }}>
        {title}
      </h3>
      <p style={{
        fontFamily: "Poppins, sans-serif",
        fontSize: "0.8rem",
        fontWeight: "400",
        color: "#666",
        lineHeight: "1.5",
        margin: 0,
      }}>
        {description}
      </p>
    </div>
  );
}

export default InfoBox; 