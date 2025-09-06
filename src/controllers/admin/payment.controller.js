import PDFDocument from 'pdfkit';
import { successResponseHelper, errorResponseHelper } from '../../helpers/utilityHelper.js';
import moment from 'moment';

const generateInvoicePDF = async (req, res) => {
  try {
    const {
      paymentId,
      businessName,
      amount,
      currency,
      subscriptionType,
      paymentPlan,
      validityHours,
      paymentDate,
      status
    } = req.body;

    // Create a new PDF document
    const doc = new PDFDocument({
      size: 'A4',
      margin: 50
    });

    // Set response headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="invoice-${paymentId}.pdf"`);

    // Pipe the PDF to the response
    doc.pipe(res);

    // Add company logo/header
    doc.fontSize(24)
       .font('Helvetica-Bold')
       .text('INVOICE', { align: 'center' })
       .moveDown(0.5);

    doc.fontSize(12)
       .font('Helvetica')
       .text('Business Review Platform', { align: 'center' })
       .moveDown(2);

    // Invoice details
    doc.fontSize(14)
       .font('Helvetica-Bold')
       .text('Invoice Details')
       .moveDown(1);

    // Invoice information
    const invoiceData = [
      { label: 'Invoice Number:', value: paymentId },
      { label: 'Date:', value: moment(paymentDate).format('DD MMM, YYYY') },
      { label: 'Business Name:', value: businessName },
      { label: 'Payment Type:', value: subscriptionType },
      { label: 'Plan:', value: paymentPlan },
      { label: 'Duration:', value: validityHours ? `${validityHours} Hours` : 'Lifetime' },
      { label: 'Status:', value: status.charAt(0).toUpperCase() + status.slice(1) }
    ];

    invoiceData.forEach(item => {
      doc.fontSize(12)
         .font('Helvetica-Bold')
         .text(item.label, { continued: true })
         .font('Helvetica')
         .text(` ${item.value}`)
         .moveDown(0.5);
    });

    doc.moveDown(1);

    // Amount section
    doc.fontSize(16)
       .font('Helvetica-Bold')
       .text('Amount Due')
       .moveDown(0.5);

    doc.fontSize(20)
       .font('Helvetica-Bold')
       .text(`${currency === 'USD' ? '$' : '€'}${amount}`, { align: 'right' })
       .moveDown(2);

    // Terms and conditions
    doc.fontSize(10)
       .font('Helvetica')
       .text('Terms and Conditions:', { underline: true })
       .moveDown(0.5)
       .fontSize(8)
       .text('• This invoice is generated automatically by the Business Review Platform.')
       .text('• Payment is non-refundable unless otherwise specified.')
       .text('• For any queries, please contact our support team.')
       .moveDown(1);

    // Footer
    doc.fontSize(8)
       .font('Helvetica')
       .text('Thank you for your business!', { align: 'center' })
       .moveDown(0.5)
       .text('Generated on: ' + moment().format('DD MMM, YYYY HH:mm:ss'), { align: 'center' });

    // Finalize the PDF
    doc.end();

  } catch (error) {
    console.error('PDF generation error:', error);
    return errorResponseHelper(res, { 
      message: 'Failed to generate invoice PDF', 
      code: '00500' 
    });
  }
};

export {
  generateInvoicePDF
};
