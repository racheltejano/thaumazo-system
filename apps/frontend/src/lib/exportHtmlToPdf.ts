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
      margin: 20mm;
    }

    body {
      font-family: 'Arial', sans-serif;
      font-size: 14px;
      color: #000;
      background-color: #fff;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    .invoice {
      max-width: 900px;
      margin: auto;
      padding: 2rem;
    }

    .space-y-6 > * + * {
      margin-top: 1.5rem;
    }

    .flex {
      display: flex;
    }

    .flex-col {
      flex-direction: column;
    }

    .flex-row {
      flex-direction: row;
    }

    .gap-6 {
      gap: 1.5rem;
    }

    .justify-between {
      justify-content: space-between;
    }

    .border-b-4 {
      border-bottom: 4px solid #F97316;
    }

    .border {
      border: 1px solid #ddd;
    }

    .text-xl {
      font-size: 1.25rem;
    }

    .text-md {
      font-size: 1rem;
    }

    .text-sm {
      font-size: 0.875rem;
    }

    .font-bold {
      font-weight: bold;
    }

    .font-semibold {
      font-weight: 600;
    }

    .text-orange-600 {
      color: #EA580C;
    }

    .bg-orange-500 {
      background-color: #F97316 !important;
    }

    .text-white {
      color: white;
    }

    .italic {
      font-style: italic;
    }

    .text-gray-500 {
      color: #6B7280;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.875rem;
    }

    th, td {
      border: 1px solid #ccc;
      padding: 6px 8px;
      text-align: left;
    }

    th {
      background-color: #F97316;
      color: white;
    }

    h2 {
      color: #EA580C;
      font-weight: 600;
      font-size: 1rem;
      margin-bottom: 0.5rem;
    }

    .w-full {
      width: 100%;
    }

    .text-right {
      text-align: right;
    }

    img {
      max-width: 100%;
      height: auto;
      border: 1px solid #ccc;
      border-radius: 4px;
    }

    .no-print, button, .lucide-icon, nav {
      display: none !important;
    }
  `

  // 🧙‍♀️ Wrap content with `.invoice space-y-6`
  const wrappedContent = `<div class="invoice space-y-6">${content.outerHTML}</div>`

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
