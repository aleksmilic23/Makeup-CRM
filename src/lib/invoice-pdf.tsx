import { Document, Page, Text, View, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import { business } from "./business";
import { paymentInfo, hasPaymentInfo } from "./payment-info";
import type { InvoiceWithRelations } from "./database.types";

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, color: "#1f2937" },
  header: { flexDirection: "row", justifyContent: "space-between", marginBottom: 24 },
  businessName: { fontSize: 16, fontWeight: 700, marginBottom: 4 },
  muted: { color: "#6b7280" },
  title: { fontSize: 20, fontWeight: 700, textAlign: "right" },
  section: { marginBottom: 20 },
  label: { color: "#6b7280", fontSize: 9, marginBottom: 2 },
  row: { flexDirection: "row" },
  col: { flex: 1 },
  table: { marginTop: 8, borderTop: "1 solid #e5e7eb" },
  tableHeader: {
    flexDirection: "row",
    paddingVertical: 6,
    borderBottom: "1 solid #e5e7eb",
    fontWeight: 700,
    color: "#6b7280",
  },
  tableRow: { flexDirection: "row", paddingVertical: 6, borderBottom: "1 solid #f3f4f6" },
  cellDesc: { flex: 3 },
  cellQty: { flex: 1, textAlign: "right" },
  cellPrice: { flex: 1, textAlign: "right" },
  cellAmount: { flex: 1, textAlign: "right" },
  totals: { marginTop: 12, alignItems: "flex-end" },
  totalRow: { flexDirection: "row", width: 200, justifyContent: "space-between", paddingVertical: 2 },
  grandTotal: { fontSize: 13, fontWeight: 700 },
  notes: { marginTop: 24, color: "#6b7280" },
});

function InvoiceDocument({ invoice }: { invoice: InvoiceWithRelations }) {
  const items = [...invoice.invoice_items].sort((a, b) => a.sort_order - b.sort_order);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.businessName}>{business.name}</Text>
            {business.address ? <Text style={styles.muted}>{business.address}</Text> : null}
            {business.phone ? <Text style={styles.muted}>{business.phone}</Text> : null}
            {business.email ? <Text style={styles.muted}>{business.email}</Text> : null}
          </View>
          <View>
            <Text style={styles.title}>INVOICE</Text>
            <Text style={styles.muted}>{invoice.invoice_number}</Text>
          </View>
        </View>

        <View style={[styles.section, styles.row]}>
          <View style={styles.col}>
            <Text style={styles.label}>BILL TO</Text>
            <Text>{invoice.clients.name}</Text>
            {invoice.clients.email ? <Text style={styles.muted}>{invoice.clients.email}</Text> : null}
            {invoice.clients.phone ? <Text style={styles.muted}>{invoice.clients.phone}</Text> : null}
          </View>
          <View style={styles.col}>
            <Text style={styles.label}>ISSUE DATE</Text>
            <Text>{invoice.issue_date}</Text>
            {invoice.due_date ? (
              <>
                <Text style={[styles.label, { marginTop: 8 }]}>DUE DATE</Text>
                <Text>{invoice.due_date}</Text>
              </>
            ) : null}
          </View>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.cellDesc}>Description</Text>
            <Text style={styles.cellQty}>Qty</Text>
            <Text style={styles.cellPrice}>Unit Price</Text>
            <Text style={styles.cellAmount}>Amount</Text>
          </View>
          {items.map((item) => (
            <View style={styles.tableRow} key={item.id}>
              <Text style={styles.cellDesc}>{item.description}</Text>
              <Text style={styles.cellQty}>{item.quantity}</Text>
              <Text style={styles.cellPrice}>${Number(item.unit_price).toFixed(2)}</Text>
              <Text style={styles.cellAmount}>${Number(item.amount).toFixed(2)}</Text>
            </View>
          ))}
        </View>

        <View style={styles.totals}>
          <View style={styles.totalRow}>
            <Text style={styles.muted}>Subtotal</Text>
            <Text>${Number(invoice.subtotal).toFixed(2)}</Text>
          </View>
          {Number(invoice.tax_rate) > 0 && (
            <View style={styles.totalRow}>
              <Text style={styles.muted}>Tax ({Number(invoice.tax_rate)}%)</Text>
              <Text>${Number(invoice.tax_amount).toFixed(2)}</Text>
            </View>
          )}
          <View style={[styles.totalRow, { marginTop: 4, borderTop: "1 solid #e5e7eb", paddingTop: 6 }]}>
            <Text style={styles.grandTotal}>Total</Text>
            <Text style={styles.grandTotal}>${Number(invoice.total).toFixed(2)}</Text>
          </View>
        </View>

        {hasPaymentInfo() ? (
          <View style={styles.notes}>
            <Text style={styles.label}>PAYMENT DETAILS</Text>
            {paymentInfo.bankName ? <Text>Bank: {paymentInfo.bankName}</Text> : null}
            {paymentInfo.accountName ? <Text>Account Name: {paymentInfo.accountName}</Text> : null}
            {paymentInfo.accountNumber ? <Text>Account Number: {paymentInfo.accountNumber}</Text> : null}
            {paymentInfo.routingNumber ? <Text>Routing Number: {paymentInfo.routingNumber}</Text> : null}
            {paymentInfo.otherMethods
              ? paymentInfo.otherMethods.split("\n").map((line, i) => <Text key={i}>{line}</Text>)
              : null}
          </View>
        ) : null}

        {invoice.notes ? (
          <View style={styles.notes}>
            <Text style={styles.label}>NOTES</Text>
            <Text>{invoice.notes}</Text>
          </View>
        ) : null}
      </Page>
    </Document>
  );
}

export async function renderInvoicePdf(invoice: InvoiceWithRelations): Promise<Buffer> {
  return renderToBuffer(<InvoiceDocument invoice={invoice} />);
}
