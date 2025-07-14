"use client";

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

export default Footer; 