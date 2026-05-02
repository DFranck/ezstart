'use client'

import { Placeholder } from './Placeholder'

export default function Demo() {
  return (
    <Placeholder
      name="InvoiceHistorySection"
      reason="Paginated table of the user's invoices with download-PDF links. Defaults to 10 rows per page; configurable via pageSize."
    />
  )
}
