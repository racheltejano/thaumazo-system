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
      style={{
        background: isHovered 
          ? "linear-gradient(135deg, rgba(255,255,255,1) 0%, rgba(248,250,255,1) 100%)"
          : "rgba(255, 255, 255, 0.9)",
        backdropFilter: "blur(10px)",
        borderRadius: "20px",
        padding: "36px 28px",
        boxShadow: isHovered 
          ? "0 16px 48px rgba(0,0,0,0.12)" 
          : "0 8px 32px rgba(0,0,0,0.08)",
        textAlign: "center",
        cursor: "pointer",
        border: isHovered ? "2px solid #FF3C02" : "1px solid rgba(17, 17, 17, 0.08)",
        opacity: show ? 1 : 0,
        transform: show 
          ? (isHovered ? "translateY(-12px) scale(1.02)" : "translateY(0) scale(1)") 
          : "translateY(60px) scale(0.95)",
        transition: "all 0.5s cubic-bezier(0.16, 1, 0.3, 1)",
        position: "relative",
        overflow: "hidden",
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Gradient overlay on hover */}
      <div style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        height: "4px",
        background: "linear-gradient(90deg, #FF3C02 0%, #FF5722 100%)",
        opacity: isHovered ? 1 : 0,
        transition: "opacity 0.3s ease",
      }} />

      <div style={{ 
        marginBottom: "20px", 
        display: "flex", 
        justifyContent: "center",
        transform: isHovered ? "scale(1.1) rotateY(10deg)" : "scale(1)",
        transition: "transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
      }}>
        <Image 
          src={icon} 
          alt={`${title} Icon`} 
          width={56} 
          height={56} 
          style={{ display: "block", filter: isHovered ? "brightness(1.1)" : "brightness(1)" }} 
        />
      </div>
      
      <h3 style={{
        fontFamily: "Poppins, sans-serif",
        fontSize: "1.35rem",
        fontWeight: "700",
        marginBottom: "14px",
        color: isHovered ? "#FF3C02" : "#111",
        transition: "color 0.3s ease",
      }}>
        {title}
      </h3>
      
      <p style={{
        fontFamily: "Poppins, sans-serif",
        fontSize: "0.9rem",
        fontWeight: "400",
        color: "#555",
        lineHeight: "1.7",
        margin: 0,
      }}>
        {description}
      </p>
    </div>
  );
}

export default InfoBox;