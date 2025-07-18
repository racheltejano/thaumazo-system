export const exportHtmlToPdf = (elementId: string) => {
  const content = document.getElementById(elementId)
  if (!content) {
    console.error(`Element with id "${elementId}" not found.`)
    return
  }

  const printWindow = window.open('', '_blank')
  if (!printWindow) {
    console.error('Failed to open print window')
    return
  }

  const styles = `
    @page {
      size: A4;
      margin: 20mm 15mm;
    }

    body {
      font-family: 'Arial', sans-serif;
      font-size: 13px;
      color: #111;
      background-color: #fff;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      line-height: 1.6;
    }

    header, footer {
      text-align: center;
      font-size: 0.8rem;
      color: #888;
    }

    header {
      margin-bottom: 20px;
    }

    footer {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
    }

    .invoice {
      max-width: 900px;
      margin: auto;
      padding: 0 10px;
    }

    h1, h2, h3 {
      color: #EA580C;
      margin-bottom: 0.5rem;
    }

    h1 {
      font-size: 1.5rem;
    }

    .section-title {
      font-size: 1.1rem;
      font-weight: 600;
      border-bottom: 2px solid #EA580C;
      margin-bottom: 10px;
      padding-bottom: 4px;
    }

    .space-y-6 > * + * {
      margin-top: 1.5rem;
    }

    .flex {
      display: flex;
    }

    .flex-row {
      flex-direction: row;
    }

    .flex-col {
      flex-direction: column;
    }

    .justify-between {
      justify-content: space-between;
    }

    .gap-6 {
      gap: 1.5rem;
    }

    .font-bold {
      font-weight: bold;
    }

    .font-semibold {
      font-weight: 600;
    }

    .text-right {
      text-align: right;
    }

    .text-sm {
      font-size: 0.875rem;
    }

    .text-md {
      font-size: 1rem;
    }

    .text-orange {
      color: #EA580C;
    }

    .border {
      border: 1px solid #ccc;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 1rem;
      font-size: 0.85rem;
    }

    th, td {
      border: 1px solid #ccc;
      padding: 8px 10px;
      text-align: left;
    }

    th {
      background-color: #F97316;
      color: white;
      font-weight: bold;
    }

    tr:nth-child(even) td {
      background-color: #f9f9f9;
    }

    img {
      max-width: 100%;
      height: auto;
      margin-top: 1rem;
    }

    .no-print, button, .lucide-icon, nav {
      display: none !important;
    }
  `

  const wrappedContent = `
    <div class="invoice space-y-6">
      <header>
        <h1>Order Report</h1>
        <p>Generated on ${new Date().toLocaleString()}</p>
      </header>
      ${content.outerHTML}
      <footer>
        <p>Thaumazo Express — Confidential Report</p>
      </footer>
    </div>
  `

  printWindow.document.write(`
    <html>
      <head>
        <title>Order Report</title>
        <style>${styles}</style>
      </head>
      <body>
        ${wrappedContent}
        <script>
          window.onload = function () {
            window.print();
            window.onafterprint = function () {
              window.close();
            };
          }
        </script>
      </body>
    </html>
  `)

  printWindow.document.close()
}
