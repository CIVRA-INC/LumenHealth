# RB-054 Verification Report and Audit Detail Print Styles

Standalone helper documentation for [RB-054](https://github.com/CIVRA-INC/LumenHealth/issues/1510): add print styles so verification reports and audit chain-of-custody details can be filed as evidence.

## Proposed print stylesheet additions (`apps/web/app/globals.css`)

```css
@media print {
  :root {
    color-scheme: light;
  }

  body {
    background: #fff !important;
    color: #000 !important;
  }

  .skipLink,
  nav,
  .verifyDropzone,
  .auditFilters,
  .auditExport,
  .authFooter,
  button,
  input[type="file"],
  select,
  input,
  [data-testid="verify-dropzone"] {
    display: none !important;
  }

  .hero,
  .panel,
  .authCard,
  .verifyPortal,
  .auditLog {
    box-shadow: none !important;
    background: #fff !important;
    color: #000 !important;
    padding: 0 !important;
    margin: 0 !important;
  }

  .verifyReportHeader button,
  .auditDetailHeader button {
    display: none !important;
  }

  code,
  td,
  th,
  .merkleProof code,
  .verifySummary dd {
    word-break: break-all;
    overflow-wrap: anywhere;
    white-space: normal;
  }

  table {
    width: 100%;
    border-collapse: collapse;
  }

  thead {
    display: table-header-group;
  }

  tr,
  .auditDetail,
  .verifyReport {
    break-inside: avoid;
    page-break-inside: avoid;
  }

  .verifyReport--ok h2::before {
    content: "STATUS: VERIFIED - ";
  }

  .verifyReport--failed h2::before {
    content: "STATUS: FAILED - ";
  }

  .verifyReport--empty h2::before {
    content: "STATUS: EMPTY - ";
  }

  .auditRow--tampered td:first-child::before,
  .auditDetail--tampered h2::before {
    content: "[TAMPERED] ";
    font-weight: 700;
  }

  .verifyFileName,
  .verifySummary,
  .auditDetail {
    color: #000 !important;
  }
}

@media print {
  .printOnly {
    display: block !important;
  }
}

.printOnly {
  display: none;
}
```

## Print-only context header (recommended in report/detail views)

Include file name and verification timestamp in a print-only header so exported evidence is self-describing:

```tsx
<div className="printOnly" aria-hidden="true">
  <p>Verification report</p>
  <p>File: {fileName || "unknown"}</p>
  <p>Verified at: {new Date().toISOString()}</p>
</div>
```

## Manual print checklist (for PR/evidence)

- [ ] Open a completed verification report in browser print preview; confirm only report content is shown (no dropzone, no file input, no "Check another file" button, no navigation/forms/chrome gradients).
- [ ] Confirm hash/signature/transaction values wrap within the page (`word-break: break-all`) and are not clipped.
- [ ] Confirm table headers repeat on multi-page output and rows do not split awkwardly across pages.
- [ ] Print/save in grayscale and confirm tampered/failed states remain distinguishable via text prefixes (e.g. `STATUS: FAILED`, `[TAMPERED]`).
- [ ] Open an audit entry chain-of-custody detail and print preview; confirm detail content is readable on white background with black text and no interactive controls.
- [ ] Confirm file name and verification timestamp appear in the print-only header for the verification report.
