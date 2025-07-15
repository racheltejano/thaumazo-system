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

  // Grab the current page’s CSS (optional but recommended for proper layout)
  const styles = [...document.styleSheets]
    .map((sheet) => {
      try {
        return [...sheet.cssRules]
          .map((rule) => rule.cssText)
          .join('\n')
      } catch (e) {
        return '' // ignore cross-origin stylesheets
      }
    })
    .join('\n')

  // Write content + styles into the new tab
  printWindow.document.write(`
    <html>
      <head>
        <title>Print PDF</title>
        <style>
          ${styles}

          /* Optional: Force A4 page style */
          @page {
            size: A4;
            margin: 20mm;
          }

          body {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        </style>
      </head>
      <body>
        ${content.outerHTML}
        <script>
          window.onload = function() {
            window.focus();
            window.print();
            window.onafterprint = function() {
              window.close();
            };
          }
        </script>
      </body>
    </html>
  `)

  printWindow.document.close()
}
